(function(){  
	/**Service: Completeness*/
	angular.module('dataQualityApp').service('dataAnalysisService', ['requestService', 'mathService', function (requestService, mathService) {
	
	  	
		var self = this;
		self.maxPendingRequests = 3;
		
		function reset() {
			self.debugCount = 0;
			self.analysisType = null;
			self.result = null;
			self.callback = null;	
			
			self.requestQueue = [];		//Queue with requests
			self.pendingRequests = 0; //Pending requests

			self.processQueue = [];		//Responses awainting processing
			self.pendingProcessing = 0; //Responses pending processing
			
			self.variables = null;
			self.periods = null;
			self.orgunits = null;
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
				
				var dxID, filteredOut = false;
				if (self.parameters.co) {
					 dxID = row[dx] + '.' + row[co];
					 if (!self.parameters.coFilter[dxID]) filteredOut = true;
				}
				
				
				if (!filteredOut) {
					newRow = {
						"data": [],
						"metaData": {
							"ouName": names[row[ou]],
							"ouID": row[ou],
							"dxName": co != undefined ? names[row[dx]] + ' ' + names[row[co]] : names[row[dx]],
							"dxID": co != undefined ? row[dx] + '.' + row[co] : row[dx],
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
					for (var j = row.length-1; j >= valStart; j--) {
					
						value = row[j];
						newRow.data.unshift(value);
						
						if (isNumber(value)) {
							valueSet.push(parseFloat(value));
						}
						else {
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
							zScore = Math.round(100*Math.abs((value-stats.mean)/stats.sd))/100;
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
						newRow.metaData.gapWeight = Math.floor(getMedian(valueSet)*newRow.metaData.gaps);
						newRow.metaData.outWeight = getOutlierWeight(valueSet, stats.mean, stats.sd);
						self.result.rows.push(newRow);
					}
				}
			}
								
			//Store result and mark as done, then request more data
			data.pending = false;
			data.done = true;
			self.pendingProcessing--;	
			
			if (processingDone()) {
				outlierAggregatesAndMetaData();
			}
			else {
				processData();	
			}
		}
		
		
		function getMedian(values) {
			
			values.sort( function(a,b) {return a - b;} );
			
		    var half = Math.floor(values.length/2);
		
		    if(values.length % 2) return values[half];
		    else return (values[half-1] + values[half]) / 2.0;
		}
		
		function getOutlierWeight(dataValueSet, mean, sd) {
			
			if (dataValueSet.length <= 1 || isNaN(sd) || (mean === 0 && sd === 0)) {
				return 0;
			}
			
			var normCount = 0, normSum = 0, total = 0;
			for (var i = 0; i < dataValueSet.length; i++) {
				var value = dataValueSet[i];
				if (((value-mean)/sd) < 1.5) {
					normSum += value;
					normCount++;
				}
				total += value;
			}
			var normMean = normSum/normCount;
			var expectedTotal = normMean * dataValueSet.length;
			return Math.round(total-expectedTotal);
		}
		
		
		function outlierAggregatesAndMetaData() {
			
			console.log("Summarising");
			
			var ouGaps = {};
			var ouOut = {};
			var dxGaps = {};
			var dxOut = {};
			var peGaps = {};
			var peOut = {};

			//When iterating through all rows, make a name dictionary as well 
			var names = {};
			
			var meta;
			for (var i = 0; i < self.result.rows.length; i++) {
				meta = self.result.rows[i].metaData;
								
				//Get number of gaps per ou
				if (ouGaps[meta.ouID]) ouGaps[meta.ouID] += meta.gaps;
				else ouGaps[meta.ouID] = meta.gaps;

				//Get number of outliers per ou
				if (ouOut[meta.ouID]) ouOut[meta.ouID] += meta.outliers;
				else ouOut[meta.ouID] = meta.outliers;
								
				//Get number of gaps per dx
				if (dxGaps[meta.dxID]) dxGaps[meta.dxID] += meta.gaps;
				else dxGaps[meta.dxID] = meta.gaps;
				
				//Get number of outliers per dx
				if (dxOut[meta.dxID]) dxOut[meta.dxID] += meta.outliers;
				else dxOut[meta.dxID] = meta.outliers;
				
				//Get number of gaps per pe
				for (var j = 0; j < meta.peGap.length; j++) {
					//Get number of outliers per dx
					if (peGaps[meta.peGap[i]]) peGaps[meta.peGap[i]]++;
					else peGaps[meta.peGap[i]] = 1;
				}
				
				//Get number of outliers per pe
				for (var j = 0; j < meta.peOut.length; j++) {
					//Get number of outliers per dx
					if (peOut[meta.peOut[i]]) peOut[meta.peOut[i]]++;
					else peOut[meta.peOut[i]] = 1;	
				}
				
				names[meta.ouID] = meta.ouName;
				names[meta.dxID] = meta.dxName
			}
			
			self.result.aggregates.ouGaps;
			self.result.aggregates.ouOut;
			self.result.aggregates.dxGaps;
			self.result.aggregates.dxOut;
			self.result.aggregates.peGaps;
			self.result.aggregates.peOut;
			
			self.result.metaData.names = names;
			self.result.metaData.variables = self.variables;
			self.result.metaData.periods = self.periods;
			self.result.metaData.orgunits = self.orgunits;
			self.result.metaData.parameters = self.parameters
			
			console.log("Returning");
			
			self.callback(self.result);
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