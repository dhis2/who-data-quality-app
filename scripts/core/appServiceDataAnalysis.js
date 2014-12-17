(function(){  
	/**Service: Completeness*/
	angular.module('dataQualityApp').service('dataAnalysis', ['requestService', function (requestService) {
	
	  	
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
		
		/**
		Outliers and gaps in the data
		@param callback			function to send result to
		@param variables		array of data element, dataset or indicator IDs
		@param periods			array of periods in ISO format
		@param orgunits			array of orgunit IDs
		@param parameters		object with the following properties
			.outlierLimit	int		SD from mean to count as outlier	
			.OUgroup		string	ID of orgunit group for disaggregation.
			.OUlevel		int 	orgunit level for disaggregation.
			.co				bool	whether or not include categoryoptions
			.coFilter		array of strings of data element operands to include in result
		*/
		self.outlierAnalysis = function (callback, variables, periods, orgunits, parameters) {
			reset();
			self.variables = variables; 
			self.periods = periods; 
			self.orguntis = orguntis; 
			self.parameters parameters;
			self.analysisType = 'outlier';						
			
			createRequests();
		}
		
		
		function createRequests() {
			var baseRequest;
			baseRequest = '/api/analytics.json?';
			baseRequest += '&hideEmptyRows=true';
			baseRequest += '&tableLayout=true';
			baseRequest += '&dimension=pe' + period.join(';');
			
			//if many variables or categoryoptions => need to fetch one variable at the time to be safe
			var splitData;
			if (parameters.co) {
				baseRequest += '&dimension=co';
				baseRequest += '&columns=pe&rows=ou;dx;co';
				splitData = true;
			}
			else if (variables.length > 10) {
				baseRequest += '&columns=pe&rows=ou;dx';
				splitData = true;
			}
			else {
				baseRequest += '&columns=pe&rows=ou;dx';					
				splitData = false;
			}
			
			var request, requests = [];
			for (var i = 0; i < orgunits.length; i++) {
				request = baseRequest;
				request += '&dimension=ou' + orgunits[i];
				if (parameters.OUgroup) {
					request += ';OU_GROUP-' + parameters.OUgroup;
				}
				else if (parameters.OUlevel) {
					request += ';OU_LEVEL-' + parameters.OUgroup;					
				}
				
				
				if (splitData) {
					for (var j = 0; j < variables.length; j++) {
						requests.push(request + '&dimension=dx:' + variables[j]);
					}
				}
				else {
					requests.push(request + '&dimension=dx:' + variables.join(';'));
				}
			}
			
			for (var i = 0; i < requests.length; i++) {
				self.requestQueue.push({
					"url": requests[i],
					"pending": false,
					"done": false
				});
			}
			
			fetchData();
		}
	
		
		function fetchData() {
			var request = getQueuedRequest();
			while (request && self.pendingRequests < self.maxPendingRequests) {
				
				
				requestService.getSingle(request.url).then(function (response) {
					self.pendingRequests--;
					storeResponse(response);		
				}
				
				self.pendingRequests++;
				request = getQueuedRequest();
			}
		}
		

		function getQueuedRequest() {
			for (var i = 0; i < self.requestQueue.length; i++) {
				if (!self.requestQueue[i].pending && !self.requestQueue[i].done) {
					return self.requestQueue[i];
				}
			}
			return null;
		}
		
		
		
		function storeResponse(response) {
			
			console.log(response);
			
		}
		
		
		/**
		Consistency over time.
		
		
		*/
		self.consistencyAnalysis = function () {}
		
		
		
		
		
		
		
				
		return self;
	
	}]);
	
})();