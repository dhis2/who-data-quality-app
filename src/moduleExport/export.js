
(function(){
	
	angular.module('dataExport', []);
	
	/**Controller: Parameters*/
	angular.module('dataExport').controller("ExportController",
	['d2Meta', 'd2Utils', 'periodService', 'BASE_URL',
	function(d2Meta, d2Utils, periodService, BASE_URL) {
	    	    
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


			d2Meta.objects('organisationUnitLevels', null, 'name,id,level').then(function(data) {
	    		self.orgunitLevels = data;
	    	});
	    }


		self.indicatorSearch = function(searchString){
			if (searchString.length >= 2) {

				d2Meta.objects('indicators', null, 'name,id', 'name:like:' + searchString).then(
					function (data) {
						self.indicatorSearchResult = data;
						d2Utils.arraySortByProperty(self.indicatorSearchResult, 'name', false);
					}
				);

			}
		};


		self.dataElementSearch = function(searchString){
			if (searchString.length >= 2) {

				d2Meta.objects('dataElements', null, 'name,id', 'name:like:' + searchString).then(
					function (data) {
						self.dataElementSearchResult = data;
						d2Utils.arraySortByProperty(self.dataElementSearchResult, 'name', false);
					}
				);
			}
		};


		self.doOuExport = function() {
			d2Meta.objects('organisationUnits', null, 'name,parent[name,parent[name,parent[name]]]', 'level:eq:' + self.orgunitLevelSelected.level).then(
				function(ouData) {

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
	    		}
			);
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
		
	}]);
	
})();

