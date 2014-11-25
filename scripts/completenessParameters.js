(function(){  
	/**Controller: Parameters*/
	angular.module('completenessAnalysis').controller("ParamterController", function(completenessDataService, metaDataService, periodService, BASE_URL, $http, $q, $sce, $scope) {
	    
	    
	    var self = this;
	        
	    init();
	    initSelects();	  	
	    
		function init() {
	    	self.dataSets = [];
	    	self.dataSetsSelected = undefined;
	    	
	    	self.dataElements = [];
	    	self.dataElementsSelected = undefined;
	    		    
	    	self.indicators = [];
	    	self.indicatorsSelected = undefined;
	    	
	    	self.orgunits = [];
	    	self.userOrgunits = [];
	    	
	    	self.orgunitLevels = [];
	    	self.orgunitLevelSelected = undefined;
	    	
	    	self.orgunitGroups = [];
	    	self.orgunitGroupSelected = undefined;
	    	
	    	self.periodTypes = [];
	    	self.periodTypeSelected = undefined;
	    	
	    	self.periodCount = [];
	    	self.periodCountSelected = undefined;
	    	
	    	self.years = [];
	    	self.yearSelected = undefined;
	    	
	    	self.isoPeriods = [];
	    	
	    	self.date = {
	    		"startDate": moment().subtract(12, 'months'), 
	    		"endDate": moment()
	    	};
	    	
	    	//Accordion settings
	    	self.oneAtATime = true;
	    	self.status = {
	    	    isFirstOpen: true
	    	};
	    }
	    
	    
	    function initSelects() {
						
			metaDataService.getDataSets().then(function(data) { 
				self.dataSets = data;
			});
			
			metaDataService.getDataElements().then(function(data) { 
				self.dataElements = data;
			});
			
			metaDataService.getIndicators().then(function(data) { 
				self.indicators = data;
			});
			
			
			metaDataService.getAnalysisOrgunits().then(function(data) { 
				self.userOrgunits = data;
				userOrgunitString();
			});
			
			metaDataService.getOrgunitLevels().then(function(data) { 
				self.orgunitLevels = data;
			});
			
			metaDataService.getOrgunitGroups().then(function(data) { 
				self.orgunitGroups = data;
			});

				
			//Defaults
			self.onlyNumbers = /^\d+$/;
			self.thresholdHigh = 100;
			self.thresholdLow = 60;
			self.stdDev = 2;
			self.gapLimit = 2;
			self.analysisType = "outlier";
			
			
			//Date initialisation
			self.periodTypes = periodService.getPeriodTypes();
			self.periodTypeSelected = self.periodTypes[1];
			
			self.periodCounts = periodService.getPeriodCount();
			self.periodCountSelected = self.periodCounts[11];
			
			self.years = periodService.getYears();
			self.yearSelected = self.years[0];
					
			self.periodOption = "last";
			self.currentDate = new Date();			
	    	
	    	self.userOrgunitLabel = "";
	    }
		
		
		function userOrgunitString() {
			
			if (self.userOrgunits.length <= 1) {
				self.userOrgunitLabel = self.userOrgunits[0].name;
			}
			else {
				for (var i = 0; i < self.userOrgunits.length; ) {
					self.userOrgunitLabel += self.userOrgunits[i++].name;
	
					if (i < self.userOrgunits.length) {
						self.userOrgunitLabel += ", ";	
					}
				}
			}					
		}
		
		
		function getPeriodsForAnalysis() {
			
			var startDate, endDate;
			if (self.periodOption === "last") {
				endDate = moment().format("YYYY-MM-DD");
				if (self.periodTypeSelected.id === 'Weekly') {
					startDate = moment().subtract(self.periodCountSelected.value, 'weeks').format("YYYY-MM-DD");
				}
				else if (self.periodTypeSelected.id === 'Monthly') {
					startDate = moment().subtract(self.periodCountSelected.value, 'months').format("YYYY-MM-DD");
				}
				else if (self.periodTypeSelected.id === 'Quarterly') {
					startDate = moment().subtract(self.periodCountSelected.value, 'quarters').format("YYYY-MM-DD");
				}
				else if (self.periodTypeSelected.id === 'SixMonthly') {
					startDate = moment().subtract(self.periodCountSelected.value*2, 'quarters').format("YYYY-MM-DD");
				}
				else if (self.periodTypeSelected.id === 'Yearly') {
					startDate = moment().subtract(self.periodCountSelected.value, 'years').format("YYYY-MM-DD");
				}
			}
			else if (self.periodOption === "year") {
				
				if (self.yearSelected.name === moment().format('YYYY')) {
					endDate = moment().format('YYYY-MM-DD');
				}
				else {
					endDate = self.yearSelected.id + "-12-31";
				}
			
				startDate = self.yearSelected.id + "-01-01";
				
				console.log(startDate);
				console.log(endDate);
				
			}
			else {
				startDate = self.date.startDate;
				endDate = self.date.endDate;
			}
			
			return {'startDate': startDate, 'endDate': endDate, 'periodType': self.periodTypeSelected.id};
		
		}
		
		
		self.doAnalysis = function() {
			//Collapse open panels
			$('.panel-collapse').removeClass('in');
			
			
			var data = {
				'dataSets': self.dataSetsSelected, 
				'dataElements': self.dataElementsSelected,
				'indicators': self.indicatorsSelected
			};
						
			var period = getPeriodsForAnalysis();
			
			
			var disaggregationType = 'none', disaggregationID = undefined;
			if (self.orgunitLevelSelected) {
				disaggregationType = 'level';
				disaggregationID = 'LEVEL-' + self.orgunitLevelSelected.level;
			}
			else if (self.orgunitGroupSelected) {
				disaggregationType = 'group';
				disaggregationID = 'OU_GROUP-' + self.orgunitGroupSelected.id;
			}
			var orgunit = {
				'boundary': self.userOrgunits,
				'disaggregationType': disaggregationType,
				'disaggregationID': disaggregationID
			};
			
			var parameters = {
				'thresholdLow': self.thresholdLow,
				'thresholdHigh': self.thresholdHigh,
				'maxGaps': self.gapLimit,
				'stdDev': self.stdDev,
				'analysisType': self.analysisType
			};
							
						
			//Call service to get data
			completenessDataService.analyseData(data, period, orgunit, parameters);
				
		};
    
		return self;
		
	});
})();