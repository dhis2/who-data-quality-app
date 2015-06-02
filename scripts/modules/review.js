
(function(){
	
	var app = angular.module('reportCard', []);
	
	app.controller("ReviewController", function(metaDataService, periodService, mathService, requestService, dataAnalysisService) {
		var self = this;    
		
	    init();
	    
	    function init() {
	    	self.notPossible = false;
	    	self.ready = false;
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
	  		
	  		//1 Get dataset completeness
	  		var cb = function (result) { self.completeness.datasets = result;}
	  		dataAnalysisService.datasetCompletenessAnalysis(cb, dataSetsForCompleteness(), self.yearSelected.id, precedingYears(self.yearSelected.id, 3), self.userOrgunit.id, self.orgunitLevelSelected.level);
	  	
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
		
				
		
		function dataSetCompletenessTarget(dataSetID) {
			
			var DSid;
			for (var i = 0; i < self.map.dataSets.length; i++) {
				DSid = self.map.dataSets[i].id;
				if (DSid === dataSetID) return self.map.dataSets[i].threshold;
			}
			
			return -1;
		}
		
		
		
		function resultTemplate() {
			
			return {	
					"alerts": [],
				    "completeness": {
				    	"descriptions": "Reporting completeness from the facility - the percentage of expected reports that have been entered and completed.",
				        "dataSets": []
				    },
				    "iConsistency": [
				        {
				            "label": "Accuracy of event reporting - extreme outliers",
				            "description": "The overall score denotes the percentage of values reported during the year that are extreme outliers. \nFor lower level units, more than 2 outlieries qualifies as poor score.",
				            "type": "extremeOutliers",
				            "indicators": []
				        },
				        {
				            "label": "Accuracy of event reporting - moderate outliers",
				            "description": "The overall score denotes the percentage of values reported during the year that are moderate outliers. \nFor lower level units, more than 2 outlieries qualifies as poor score.",
				            "type": "moderateOutliers",
				            "indicators": []
				        },
				        {
				            "label": "Consistency over time",
				            "description": "The overall score is the ratio of the year of analysis against the average for the three previous years.\nFor lower level units, poor score indicates that there is a large variation in a given units ratio compared to the overall ratio.",
				            "type": "consistencyTime",
				            "indicators": []
				        },
				        {
				            "label": "Internal consistency between indicators - by level",
				            "description": "The overall score denotes the ratio between the two indicatos.\nFor the lower level units, poor score indicates a large difference in a given units ratio compared to the overall ratio.",
				            "type": "consistencyOU",
				            "indicators": []
				        },
				        {
				            "label": "Internal consistency between indicators - internal",
				            "description": "The overall score denotes the ratio between the two indicatos.\nFor the lower level units, poor score indicates a ratio that is different from what is expected for the two indicators.",
				            "type": "consistencyInternal",
				            "indicators": []
				        }
				    ]
					
				};
		
		}
	    
	    
	    	
		return self;
	});
		
		
})();

