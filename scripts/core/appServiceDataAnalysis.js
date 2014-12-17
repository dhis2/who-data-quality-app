(function(){  
	/**Service: Completeness*/
	angular.module('dataQualityApp').service('dataAnalysis', ['requestService', function (requestService) {
	
	  	
		var self = this;
		
		function reset() {
			self.analysisType = null;
			self.result = null;
			self.callback = null;	
			
			self.requestQueue = [];		//Queue with requests
			self.remainingRequests = 0; //Pending requests

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
		
		
			//Figure out how to partition the query
			
			if (parameters.co) { //categoryoptions => need to fetch one variable at the time to be safe
				
			}
			else {
				
			}
		
		}
		
		
		
		/**
		Consistency over time.
		
		
		*/
		self.consistencyAnalysis = function () {}
		
		
		
		
		
		
		
				
		return self;
	
	}]);
	
})();