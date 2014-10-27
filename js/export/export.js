
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
	app.controller("ExportController", function(metaDataService, periodService, BASE_URL, $location) {
	    	    
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
	    	
	    	self.years = [{'name': "2005", 'id': '2005'},{'name': "2006", 'id': '2006'},{'name': "2007", 'id': '2007'},{'name': "2008", 'id': '2008'},{'name': "2009", 'id': '2009'},{'name': "2010", 'id': '2010'},{'name': "2011", 'id': '2011'},{'name': "2012", 'id': '2012'},{'name': "2013", 'id': '2013'}];
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
	    }
	    
	    
	    function periodsInYear(year) {
	    	var start = year + "-01-01";
	    	var end = year + "-12-31";
	    	var months = periodService.getISOPeriods(start,end,"Monthly");
	    	
	    	return months; 
	    }
	    
	        
		return self;
		
	});
	
})();

