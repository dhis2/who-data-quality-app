(function(){  
	/**Service: Completeness*/
	angular.module('dataQualityApp').service('dataAnalysisService', ['requestService', 'mathService', function (requestService, mathService) {
	
	  	
		var self = this;
		self.maxPendingRequests = 3;
		
		function reset() {
			self.analysisType = null;
			self.result = null;
			self.callback = null;	
			
			self.requestQueue = [];		//Queue with requests
			self.pendingRequests = 0; //Pending requests

			self.processQueue = [];		//Responses awainting processing
			self.pendingProcessing = 0; //Responses pending processing
			
			self.variables = null;
			self.periods = null;
			self.orguntis = null;
			self.parameters = null;
		}
		
		/** OUTLIER ANALYSIS
		@param callback			function to send result to
		@param variables		array of data element, dataset or indicator IDs
		@param periods			array of periods in ISO format
		@param orgunits			array of orgunit IDs
		@param parameters		object with the following properties
			.outlierLimit	int		SD from mean to count as outlier
			.gapLimit		int		number of gaps/missing data to count as violation
			.OUgroup		string	ID of orgunit group for disaggregation.
			.OUlevel		int 	orgunit level for disaggregation.
			.co				bool	whether or not include categoryoptions
			.coFilter		array of strings of data element operands to include in result
		*/
		self.outlier = function (callback, variables, periods, orgunits, parameters) {
			reset();
			self.callback = callback;
			self.variables = variables; 
			self.periods = periods; 
			self.orgunits = orgunits; 
			self.parameters = parameters;
			self.analysisType = 'outlier';						
			
			resetOutlierResult();
			createOutlierRequests();
		}
		
		function createOutlierRequests() {
			var baseRequest;
			baseRequest = '/api/analytics.json?';
			baseRequest += '&hideEmptyRows=true';
			baseRequest += '&tableLayout=true';
			baseRequest += '&dimension=pe:' + self.periods.join(';');
			
			//if many variables or categoryoptions => need to fetch one variable at the time to be safe
			var splitData;
			if (self.parameters.co) {
				baseRequest += '&dimension=co';
				baseRequest += '&columns=pe&rows=ou;dx;co';
				splitData = true;
			}
			else if (self.variables.length > 10) {
				baseRequest += '&columns=pe&rows=ou;dx';
				splitData = true;
			}
			else {
				baseRequest += '&columns=pe&rows=ou;dx';					
				splitData = false;
			}
			
			var request, requests = [];
			for (var i = 0; i < self.orgunits.length; i++) {
				request = baseRequest;
				request += '&dimension=ou:' + self.orgunits[i];
				if (self.parameters.OUgroup) {
					request += ';OU_GROUP-' + self.parameters.OUgroup;
				}
				else if (self.parameters.OUlevel) {
					request += ';LEVEL-' + self.parameters.OUlevel;					
				}
				
				
				if (splitData) {
					for (var j = 0; j < self.variables.length; j++) {
						requests.push(request + '&dimension=dx:' + self.variables[j]);
					}
				}
				else {
					requests.push(request + '&dimension=dx:' + self.variables.join(';'));
				}
			}
			
			for (var i = 0; i < requests.length; i++) {
				self.requestQueue.push({
					"url": requests[i],
					"pending": false,
					"done": false
				});
			}
			
			requestData();
		}
	
	
		function resetOutlierResult() {
		
			self.result = {
				"rows": [],
				"aggregates": {},
				"metaData": {}
			};
		}
	
		
		function outlierAnalysis(data) {
						
			var headers = data.data.headers;
			var names = data.data.metaData.names;
			var rows = data.data.rows;
			var periods = data.data.metaData.pe;
			
			var SD = self.parameters.outlierLimit;
			var maxGap = self.parameters.gapLimit;
			
			
			//Get the index of the important columns
			var ou, dx, co, valStart; 
			for (var i = 0; i < headers.length; i++) {
				
				switch (headers[i].column) {
					
					case 'organisationunitid':
						ou = i;
						break;
					case 'dataid':
						dx = i;
						break;
					case 'categoryoptioncomboid':
						co = i;
						break;
				}
				
				if (!headers[i].meta) {
					valStart = i;
					i = headers.length;
				}
			}
			
			
			
			//process the actual data
			var row, value, valueSet, newRow, stats, lookForGap, gapCount, zScore;
			for (var i = 0; i < rows.length; i++) {
				row = rows[i];
				newRow = {
					"data": [],
					"metaData": {
						"ouID": row[ou],
						"dxID": row[dx],
						"coID": co != undefined ? row[co] : undefined,
						"mean": undefined,
						"var": undefined,
						"maxZ": undefined,
						"sd": undefined,
						"gaps": 0,
						"outliers": 0,
						"peGap": [],
						"peOut": [],
						"gapWeight": 0,
						"outWeight": 0
					}
				};
				
				//Iterate to get all values, and look for gaps at the same time
				valueSet = [];
				lookForGap = false;
				for (var j = row.length-1; j >= valStart; j--) {
				
					value = row[j];
					newRow.data.unshift(value)
					
					if (isNumber(value)) {
						lookForGap = true;
						valueSet.push(parseFloat(value));
					}
					else if (lookForGap) {
						newRow.metaData.peGap.push(periods[j]);					
						newRow.metaData.gaps++;
					}
					
				}
				
				//Calculate and store the statistical properties of the set
				stats = mathService.getStats(valueSet);
				newRow.metaData.mean = stats.mean;
				newRow.metaData.var = stats.variance;
				newRow.metaData.sd = stats.sd;
				
				newRow.metaData.maxZ = 0;
				//Look for outliers
				for (var j = row.length-1; j >= valStart; j--) {
				
					value = row[j];
					if (isNumber(value)) {
						value = parseFloat(value);
						
						//Calculate zScore
						zScore = Math.abs((value-stats.mean)/stats.sd);
						if (zScore > newRow.metaData.maxZ) newRow.metaData.maxZ = zScore;
						
						//Check if outlier according to parameters
						if (zScore >= SD) {
							newRow.metaData.peOut.push(periods[j]);					
							newRow.metaData.outliers++;	
						}
					}
				}
				
				//check if row should be saved or discarded
				if (newRow.metaData.outliers > 0 || newRow.metaData.gaps >= maxGap) {
					newRow.metaData.gapWeight = Math.round(mean*newRow.metaData.gaps*0.25);
					newRow.metaData.outWeight = Math.round(mean*newRow.metaData.maxZ*0.25);
					self.result.rows.push(newRow);
				}
			}
			
			
			
			
			
					
			//Store result and mark as done, then request more data
			data.pending = false;
			data.done = true;
			self.pendingProcessing--;	
			
			if (processingDone()) {
				outlierAggregates();
			}
			else {
				processData();	
			}
		}
		
		
		function outlierAggregates() {
			
			//Get number of gaps per ou
			//Get number of outliers per ou
			//Get number of gaps per dx
			//Get number of outliers per dx
			//Get number of gaps per pe
			//Get number of outliers per pe
			
			outlierMetadata();
		}
		
		
		
		function outlierMetadata() {
		
		
		
		}
		
		
		function analyseDataValues(dataValues, SD, gaps, low, high) {
		
		
		}
				
		
		
		/** CONSISTENCY ANALYSIS
		
		
		
		*/
		self.consistencyAnalysis = function () {}
			
		
		
		/** DATA REQUESTS AND QUEUING */
		function requestData() {
			var request = getNextRequest();
			while (request && self.pendingRequests < self.maxPendingRequests) {
				
				self.pendingRequests++;
				request.pending = true;
				requestService.getSingle(request.url).then(
					//success
					function(response) {
					    self.pendingRequests--;
					    storeResponse(response);
					}, 
					//error
					function(response) {
					    self.pendingRequests--;
					    storeResponse(response);
					}
				);
				
				request = getNextRequest();
			}
		}
		
	
		function getNextRequest() {
			for (var i = 0; i < self.requestQueue.length; i++) {
				if (!self.requestQueue[i].pending && !self.requestQueue[i].done) {
					return self.requestQueue[i];
				}
			}
			return null;
		}
		
		
		function markRequestAsComplete(url) {
			for (var i = 0; i < self.requestQueue.length; i++) {
				if (url.indexOf(self.requestQueue[i].url) > -1) {
					self.requestQueue[i].done = true;
					self.requestQueue[i].pending = false;
					return true;
				}
			}
			return false;
		}
			
		
		function storeResponse(response) {
			
			var data = response.data;
			var requestURL = response.config.url;
			
			var status = response.status;
			if (status != 200) {
				//TODO: if too many values, split.. Make sure we don't get same data twice, if selections on multiple levels => self.orgunits = self.orgunit.children...
				if (status === 409 && (data.indexOf("Table exceeds") > -1)) {
					self.callback(null);
				}
				else {
					console.log("Error fetching data: " + response.statusText);
					self.callback(null);
				}
				
			}
			else {
				//Mark item in queue as downloaded - discard if not there (which means it stems from different request
				if (!markRequestAsComplete(response.config.url)) {
					requestData();
					return;
				}
				
				//fetch more data
				requestData();				
				
				//Queue data for processing
				self.processQueue.push({
					'data': response.data,
					'pending': false,
					'done': false
				});
				
				processData();
			}
		}
		
		
		function processData() {
			
			var data = getNextData();
			while (data && self.pendingProcessing < 1) {
				
				data.pending = true;
				self.pendingProcessing++;
								
				//TODO: check analysis type and forward to right method
				if (self.type = "outlier") outlierAnalysis(data);
								

				data = getNextData();
			}
			
		}
		
	
		function getNextData() {
			for (var i = 0; i < self.processQueue.length; i++) {
				if (!self.processQueue[i].pending && !self.processQueue[i].done) {
					return self.processQueue[i];
				}
			}
			return null;
		}
		
		
		function processingDone() {
						
			//Check if all requests are done
			for (var i = 0; i < self.requestQueue.length; i++) {
				if (!self.requestQueue[i].done) return false;
			}
			
			for (var i = 0; i < self.processQueue.length; i++) {
				if (!self.processQueue[i].done) return false;
			}
			
			return true;
		
		}
		
		
		/** UTILITIES
		
		*/
		function isNumber(number) {
			
			return !isNaN(parseFloat(number));
		
		}
				
		return self;
	
	}]);
	
})();