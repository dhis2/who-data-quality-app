(function(){  
	/**Service: Completeness*/
	angular.module('dataQualityApp').service('visualisationService', ['BASE_URL', function (BASE_URL) {
	
	  	
	  	var self = this;
		  
	  	self.generateChart = function (elementID, type, series, category, filter, parameters) {
			
			console.log("Making chart for: " + elementID);
		  
		  
		  		  		
	  	};
	  	
	  	
	  
	  	return self;
	  
	  }]);
	
	
})();