
(function(){
	
	var app = angular.module('appAdmin', []);
	
	
	app.directive("appAdmin", function() {
		return {
			restrict: "E",
	        templateUrl: "views/appAdmin.html"
		};
      
	});
	
		
	
	/**Controller: Parameters*/
	app.controller("AdminController", function(metaDataService, periodService, BASE_URL) {
	    	    
	    var self = this;
	    self.activeTab = true;
	    
	    init();
	    
	    function init() {
	    	self.dataElements = [];
	    	self.indicators = [];
	    	
    		metaDataService.getDataElements().then(function(data) { 
    			self.dataElements = data;
    		});
    		
    		metaDataService.getIndicators().then(function(data) { 
    			self.indicators = data;
    		});
	    }
	        
	    
	    self.mapping = [
	    	{
	    	 'name': 'ANC 1',
	    	 'definition': 'First antenatal care visit',
	    	 'group': 'Maternal Health',
	    	 'matched': false,
	    	 'localType': 'dataElement', 	
	    	 'localID': null, 		
	    	 'localDataSetID': null,
	    	 'moderateOutlier': 2,
	    	 'extremeOutlier': 3
	    	},{
	    	 'name': 'Institutional deliveries',
	    	 'definition': 'Institutional deliveries', 
	    	 'group': 'Maternal Health',
	    	 'matched': false,
	    	 'localType': 'dataElement', 	
	    	 'localID': null, 		
	    	 'localDataSetID': null,
	    	 'moderateOutlier': 2,
	    	 'extremeOutlier': 3
	    	},{
	    	 'name': 'DPT3',
	    	 'definition': 'Children receiving 3rd dose of Penta-vaccine', 
	    	 'group': 'Immunization',
	    	 'matched': false,
	    	 'localType': 'dataElement', 	
	    	 'localID': null, 		
	    	 'localDataSetID': null,
	    	 'moderateOutlier': 2,
	    	 'extremeOutlier': 3
	    	},{
	    	 'name': 'MCV1',
	    	 'definition': 'Children receiving 1st dose of measles vaccine.', 
	    	 'group': 'Immunization',
	    	 'matched': false,
	    	 'localType': 'dataElement', 	
	    	 'localDataElement': null, 		
	    	 'localIndicator': null, 		
	    	 'localDataSetID': null,
	    	 'moderateOutlier': 2,
	    	 'extremeOutlier': 3
	    	}	    	
	    ];
	    	
	    
	        
		return self;
		
	});
	
})();

