(function(){  
	/**Service: Completeness*/
	angular.module('dataQualityApp').service('visualisationService', ['BASE_URL', function (BASE_URL) {
	
	  	
	  	var self = this;
		  
	  	self.generateChart = function (elementID, type, series, category, filter, parameters) {
			
			console.log("Making chart for: " + elementID);
		  
		  
		  	var chartParameters = {
		  		url: BASE_URL,
		  		el: elementID,
		  		
		  		
		  		type: type,
		  		columns: [ // Chart series
		  		  {dimension: series.type, items: series.data}
		  		],
		  		rows: [ // Chart categories
		  		  {dimension: category.type, items: category.data}
		  		],
		  		filters: [
		  		  {dimension: filter.type, items: filter.data}
		  		],
		  	};
		  	
		  	//Add optional parameters
		  	for (var key in parameters) {
		  	  if (parameters.hasOwnProperty(key)) {
		  	    chartParameters[key] = parameters[key];
		  	  }
		  	}
		  	
		  	console.log(chartParameters);
		  	
		  	DHIS.getChart(chartParameters);
	  		
	  	};
	  	
	  	
	  
	  	return self;
	  
	  }]);
	
	
})();