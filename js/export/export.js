
(function(){
	
	var app = angular.module('dataExport', []);
	
	
	/**Directive: Completeness parameters*/
	app.directive("exportParameters", function() {
		return {
			restrict: "E",
	        templateUrl: "js/export/exportParameters.html"
		};
      
	});
	
		
	
	/**Controller: Parameters*/
	app.controller("ExportController", function(metaDataService, periodService, BASE_URL) {
	    	    
	    var self = this;
	    
	    init();	
	    
		function init() {    
			self.href = undefined;	
	    	self.dataElements = [];
	    	self.dataElementSelected = undefined;
	    		    
	    	self.indicators = [];
	    	self.indicatorSelected = undefined;
	    	
	    	self.orgunitLevels = [];
	    	self.orgunitLevelSelected = undefined;
	    	
	    	self.years = periodService.getYears();
	    	self.yearSelected = undefined;
	    	
	    	
	    	metaDataService.getDataElements().then(function(data) { 
	    		self.dataElements = data;
	    	});
	    	
	    	metaDataService.getIndicators().then(function(data) { 
	    		self.indicators = data;
	    	});
	    	
	    	metaDataService.getOrgunitLevels().then(function(data) { 
	    		self.orgunitLevels = data;
	    	});		    	
	    }
	    
	    self.doExport = function() {
	    	var dx = self.dataElementSelected.id;
	    	var pe = periodsInYear(self.yearSelected.id).join(';');
	    	var ou = "LEVEL-" + self.orgunitLevelSelected.level;
	    	var requestURL = BASE_URL + "/api/analytics.xls?";
	    	requestURL += "filter=dx:" + dx;
	    	requestURL += "&dimension=ou:" + ou;
	    	requestURL += "&dimension=pe:" + pe;
	    	requestURL += "&tableLayout=true&columns=pe&rows=ou";
	    	
	    	self.href = requestURL;
	    	
	    	window.open(requestURL, '_blank', '');
	    };
	    
	    
	    function periodsInYear(year) {
	    	var start = year + "-01-01";
	    	var end = year + "-12-31";
	    	var months = periodService.getISOPeriods(start,end,"Monthly");
	    	
	    	return months; 
	    }
	    
	        
		return self;
		
	});
	
})();

