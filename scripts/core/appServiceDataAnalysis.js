(function(){  
	/**Service: Completeness*/
	angular.module('dataQualityApp').service('dataAnalysisService', ['requestService', function (requestService) {
	
	  	
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
			.lowLimit		int 	low limt for data. Values below are outliers
			.highLimit		int 	high limt for data. Values above are outliers
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
	
		
		function outlierAnalysis(data) {
			
			var headers = data.headers;
			var names = data.metaData.names;
			var rows = data.rows;
			var periods = data.metaData.pe;
			
			
			//Get the index of the important columns
			var ou, dx, co, val; 
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
					val = i;
					break;
				}
			}
			
			
			//for simplicity, align period array with headers
			for (var i = 0; i < val; i++) {
				periods.unshift("");
			}
			
			
			//Set up structures for storing aggregate results
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
					
			//Store result and mark as done, then request more data
			data.result = {};
			data.pending = false;
			data.done = true;
			self.pendingProcessing--;	
			
			if (processingDone()) {
				console.log("All done");
			}
			else {
				processData();	
			}
		}
				
		
		
		/** CONSISTENCY ANALYSIS
		
		
		
		*/
		self.consistencyAnalysis = function () {}
			
		
		
		/** DATA REQUESTS AND QUEUING */
		function requestData() {
			var request = getNextRequest();
			while (request && self.pendingRequests < self.maxPendingRequests) {
				
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
				
				self.pendingRequests++;
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
					'done': false,
					'result': null
				});
				
				processData();
			}
		}
		
		
		function processData() {
			
			var data = getNextData();
			while (data && self.pendingProcessing < 2) {
				
				data.pending = true;
				
				
				//TODO: check analysis type and forward to right method
				if (self.type = "outlier") outlierAnalysis(data);
								
				self.pendingProcessing++;
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
						
			//If pending requests, processing is not done
			if (getNextRequest()) {
				return false;
			}			
			
			var isDone = true;
			for (var i = 0; i < self.processQueue.length; i++) {
				
				if (!self.processQueue[i].done) isDone = false;
				
			}
			
			return isDone;
		
		}
				
		return self;
	
	}]);
	
})();