
(function(){
	
	var app = angular.module('dataExport', []);
	
	/**Controller: Parameters*/
	app.controller("ExportController", function(metaDataService, periodService, requestService, BASE_URL) {
	    	    
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


		self.indicatorSearch = function(searchString){
			if (searchString.length >= 2) {
				var requestURL = "/api/indicators.json?filter=name:like:" + searchString + "&paging=false&fields=name,id";
				requestService.getSingle(requestURL).then(function (response) {

					//will do with API filter once API-filter is stable
					self.indicatorSearchResult = response.data.indicators;
					self.indicatorSearchResult.sort(function(a,b) {
						return (a.name < b.name) ? -1 : 1;
					});

				});
			}
		};

		self.dataElementSearch = function(searchString){
			if (searchString.length >= 2) {
				var requestURL = "/api/dataElements.json?filter=name:like:" + searchString + "&paging=false&fields=name,id";
				requestService.getSingle(requestURL).then(function (response) {

					//will do with API filter once API-filter is stable
					self.dataElementSearchResult = response.data.dataElements;
					self.dataElementSearchResult.sort(function(a,b) {
						return (a.name < b.name) ? -1 : 1;
					});

				});
			}
		};


		self.doOuExport = function() {
	    	
	    	
	    	var requestURL = '/api/organisationUnits.json?fields=name,parent[name,parent[name,parent[name]]]&paging=false&filter=level:eq:' + self.orgunitLevelSelected.level;
	    	
	    	//Get data
	    	requestService.getSingle(requestURL).then(function(response) {
	    		
	    		var ouData = response.data.organisationUnits;
	    		
	    		var data = [];	    		
	    		var parent, row;
	    		for (var i = 0; i < ouData.length; i++) {
	    			row = [];
	    			row.push((i+1));
	    			row.push(ouData[i].name);
	    			
	    			parent = ouData[i].parent;
	    			while (parent) {
	    				row.push(parent.name);
	    				parent = parent.parent;
	    			}
	    			
	    			data.push(row);
	    		}
	    		
	    		
	    		var csvContent = "data:text/csv;charset=utf-8,";
	    		data.forEach(function(infoArray, index){
	    		
	    		   dataString = infoArray.join(";");
	    		   csvContent += index < data.length ? dataString+ "\n" : dataString;
	    		
	    		});
	    		
	    		var encodedUri = encodeURI(csvContent);
	    		window.open(encodedUri);
	    		
	    	});	
	    	
	    };
	    
	    self.doTrendExport = function() {
	    	
	    	var dx;
	    	if (self.dataElementSelected) {
	    		dx = self.dataElementSelected.id
	    	}
	    	else {
	    		dx = self.indicatorSelected.id;
	    	}
	    	
	    	var pe = [self.yearSelected.id - 3, self.yearSelected.id - 2, self.yearSelected.id - 1];
	    	var ou = "LEVEL-" + self.orgunitLevelSelected.level;
	    	var requestURL = BASE_URL + "/api/analytics.xls?";
	    	requestURL += "dimension=dx:" + dx;
	    	requestURL += "&dimension=ou:" + ou;
	    	requestURL += "&dimension=pe:" + pe.join(';');
	    	requestURL += "&tableLayout=true&columns=pe&rows=dx;ou";
	    	
	    	self.href = requestURL;
	    	
	    	window.open(requestURL, '_blank', '');
	    };
	    
	    
	    self.doExport = function() {
	    	
	    	var dx;
	    	if (self.dataElementSelected) {
	    		dx = self.dataElementSelected.id
	    	}
	    	else {
	    		dx = self.indicatorSelected.id;
	    	}
	    	
	    	var pe = periodsInYear(self.yearSelected.id).join(';');
	    	var ou = "LEVEL-" + self.orgunitLevelSelected.level;
	    	var requestURL = BASE_URL + "/api/analytics.xls?";
	    	requestURL += "dimension=dx:" + dx;
	    	requestURL += "&dimension=ou:" + ou;
	    	requestURL += "&dimension=pe:" + pe;
	    	requestURL += "&tableLayout=true&columns=pe&rows=dx;ou";
	    	
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

