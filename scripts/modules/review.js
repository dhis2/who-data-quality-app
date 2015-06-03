
(function(){
	
	var app = angular.module('reportCard', []);
	
	app.controller("ReviewController", function(metaDataService, periodService, mathService, requestService, dataAnalysisService, visualisationService) {
		var self = this;    
		
	    init();
	    
	    function init() {
	    	self.notPossible = false;
	    	self.completeness = null;
	    	
	    	self.orgunitLevels = [];
	    	self.orgunitLevelSelected = undefined;
	    	
	    	self.userOrgunit = undefined;
	    	
	    	self.years = periodService.getYears();
	    	self.years.shift();
	    	self.yearSelected = self.years[0];
	    	
	    	self.groups = [];
	    	self.groupSelected = undefined;
	    	
	    	
	    	metaDataService.getUserOrgunits().then(function(data) { 
	    		self.userOrgunit = data[0];
	    		
	    		metaDataService.getOrgunitLevels().then(function(data) { 
	    			var validLevels = [];
	    			
	    			for (var i = 0; i < data.length; i++) {
	    				if (data[i].level > self.userOrgunit.level && data[i].level <= self.userOrgunit.level+2) {
	    					validLevels.push(data[i]);
	    				}
	    			}
	    			
	    			self.orgunitLevels = validLevels;
	    			if (self.orgunitLevels.length === 0) {
	    				self.notPossible = true;
	    			}
	    		});
	    		
	    	});
	    	
	    	//Get mapped data
	    	requestService.getSingle('/api/systemSettings/DQAmapping').then(function(response) {
	    		
	    		self.map = response.data;
	    		
	    		self.groups = response.data.groups;
	    		self.groups.unshift({'name': '[ Core ]', 'code': 'C'});
	    		self.groupSelected = self.groups[0];
	    	});
	    }
	    
	  	
	  	self.doAnalysis = function() {
	  		
	  		self.completeness = {};
	  		self.completeness.indicators = [];
	  		
	  		//1 Get dataset completeness
	  		var dscCallback = function (result) { self.completeness.datasets = result;}
	  		dataAnalysisService.datasetCompleteness(dscCallback, dataSetsForCompleteness(), self.yearSelected.id, precedingYears(self.yearSelected.id, 3), self.userOrgunit.id, self.orgunitLevelSelected.level);
			
			//2 Get indicator completeness
	  		var icCallback = function (result) { self.completeness.indicators.push(result);}
	  		var indicators = indicatorIDsForAnalysis();
	  		for (var i = 0; i < indicators.length; i++) {
	  		
	  			
	  			var indicator = indicatorFromCode(indicators[i])
	  			var dataset = datasetFromID(indicator.dataSetID);
	  			
	  			var startDate = self.yearSelected.id.toString() + "-01-01";
	  			var endDate = self.yearSelected.id.toString() + "-12-31";
	  			var periods = periodService.getISOPeriods(startDate, endDate, dataset.periodType);	  			
	  			
				dataAnalysisService.indicatorCompleteness(icCallback, indicator, periods, self.userOrgunit.id, self.orgunitLevelSelected.level);
	  		}
	  			  		
	  		var datasets = dataSetsForCompleteness();
	  		var ds = [];
	  		for (var i = 0; i < datasets.length; i++) {
	  			ds.push(datasets[i].id);
	  		}
	  		var pe = precedingYears(self.yearSelected.id, 3);
	  		pe.push(self.yearSelected.id);
	  		pe.sort(function(a, b){return a-b});
	  		
	  		var chartOptions = {};
	  		chartOptions.range = {'min': 0, 'max': 110};
	  		chartOptions.yLabel = 'Completeness (%)';
	  		chartOptions.title = 'Completeness trend';
	  		chartOptions.showLegend = true;
	  		
	  		visualisationService.autoLineChart('completeness', pe, ds, self.userOrgunit.id, chartOptions);
	  		

	  	}
	  	
	  	
	  	function precedingYears(year, numberOfYears) {
	  		
	  		
	  		
	  		var start = parseInt(year);
	  		var years = [];
	  		for (var i = 1; i <= numberOfYears; i++) {
	  			years.push(start-i);
	  		}
	  		
	  		return years;
	  	
	  	}
		
		
		function dataSetsForCompleteness() {
			
			var datasetIDs = {};
			var indicatorIDs = indicatorIDsForAnalysis();
			for (var i = 0; i < indicatorIDs.length; i++) {
			
				var indicator = indicatorFromCode(indicatorIDs[i]);				
				if (indicator.matched) datasetIDs[indicator.dataSetID] = true;
			}
			
			var dataset = [];
			for (key in datasetIDs) {
				dataset.push(datasetFromID(key));			
			}
			
			return dataset;
		}
		
		
		function indicatorIDsForAnalysis() {
			if (self.groupSelected.code === 'C') {
				return self.map.coreIndicators;
			}
			
			for (var i = 0; i < self.map.groups.length; i++) {
				if (self.map.groups[i].code === self.groupSelected.code) {
					return self.map.groups[i].members;
				}
			}
		
		}
		
		
		function indicatorFromCode(code) {
			for (var i = 0; i < self.map.data.length; i++) {
				if (self.map.data[i].code === code) return self.map.data[i];
			}
		}
		
		function datasetFromID(id) {
			
			for (var i = 0; i < self.map.dataSets.length; i++) {
				if (self.map.dataSets[i].id === id) return self.map.dataSets[i];
			}
		}
		
		
		
		function periodTypeFromDataSet(dataSetID) {
			for (var i = 0; i < self.map.dataSets.length; i++) {
				if (dataSetID === self.map.dataSets[i].id) return self.map.dataSets[i].periodType;
			}
		}
		
		
		function dataForOutliers() {
			
			var data, dataIDs = [];
			for (var i = 0; i < self.map.data.length; i++) {
				data = self.map.data[i];
				if (data.matched && ((self.core && indicatorIsCore(data.code)) || indicatorInGroup(data.code))) {
					
					dataIDs.push({
						'id': data.localData.id,
						'modStdDev': data.moderateOutlier,
						'extStdDev': data.extremeOutlier,
						'consistency': data.consistency,
						'periodType': periodTypeFromDataSet(data.dataSetID)
					});
					
					
				}
			}

			return dataIDs;
			
		}
	
		
		function localDataIDfromCode(code) {
			var data;
			for (var i = 0; i < self.map.data.length; i++) {
				data = self.map.data[i];
				if (data.matched && ((self.core && indicatorIsCore(data.code)) || indicatorInGroup(data.code)) && data.code === code) {
					return self.map.data[i].localData.id;
				}
			}
			
			return null;
		}
		
		
		function dataRelations() {
			
			var data, relations = [];
			for (var i = 0; i < self.map.relations.length; i++) {
				data = self.map.relations[i];
				
				var codeA = localDataIDfromCode(data.A);
				var codeB = localDataIDfromCode(data.B);
				
				if (codeA && codeB) {
					relations.push({
						'A': codeA,
						'B': codeB,
						'type': data.type,
						'criteria': data.criteria
					});
				}
			}
			
			
			return relations;	
		}
	    
	    
	    	
		return self;
	});
		
		
})();

