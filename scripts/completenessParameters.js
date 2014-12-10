(function(){  
	/**Controller: Parameters*/
	angular.module('completenessAnalysis').controller("CompletenessParamterController", function(completenessDataService, metaDataService, periodService, requestService, $scope) {
	    
	    
	    var self = this;
	        
	    init();
	    initSelects();	  	
	    initWatchers();	    
	    
		function init() {				
			self.dataDisaggregation = 0;
	    	
	    	self.dataElementGroups = [];
	    	self.dataElementGroupsSelected = undefined;
	    	
	    	self.dataElements = [];
	    	self.dataElementPlaceholder = "";
	    	self.dataElementsSelected = [];
			
			self.indicatorGroups = [];
			self.indicatorGroupsSelected = undefined;
			
	    	self.indicators = [];
	    	self.indicatorPlaceholder = "";
	    	self.indicatorsSelected = [];
	    	
	    	self.analysisOrgunits = [];
	    	self.userOrgunits = [];
	    	self.boundaryOrgunitSelected = undefined;
	    	
	    	self.orgunitLevels = [];
	    	self.filteredOrgunitLevels = [];
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
						
			metaDataService.getDataElementGroups().then(function(data) { 
				self.dataElementGroups = data;
			});
			
			metaDataService.getIndicatorGroups().then(function(data) { 
				self.indicatorGroups = data;
			});
			
			metaDataService.getAnalysisOrgunits().then(function(data) { 
				self.analysisOrgunits = data;
				initOrgunitTree();
			});
			
			metaDataService.getUserOrgunits().then(function(data) { 
				self.userOrgunits = data;
				self.boundarySelectionType = 0;
				self.boundaryOrgunitSelected = self.userOrgunits[0];
			});
			
			metaDataService.getOrgunitLevels().then(function(data) { 
				self.orgunitLevels = data;
				filterLevels();
				
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
	    
	    function initOrgunitTree() {
			$('#orgunitTree').jstree({
				"plugins" : [ "wholerow", "ui"],
			    'core': {
			    	'multiple' : false,
		            'data': function (node, callback) {
		            	
		            	//Tree is empty - get first two levels right away
		            	if (node.parent === null) {
		      
	            			var orgunitNodes = [];
			
							//Iterate over all the orgunit the user is assigned to (root(s))
							for (var i = 0; i < self.analysisOrgunits.length; i++) {
								var node = {
									'id': self.analysisOrgunits[i].id, 
									'text': self.analysisOrgunits[i].name,
									'level': self.analysisOrgunits[i].level,
									'children': [], 
									'state': {
										'opened': true
									}
								};
								
								//Add the children of the root(s) as well
								for (var j = 0; j < self.analysisOrgunits[i].children.length; j++) {
									node.children.push({
										'id': self.analysisOrgunits[i].children[j].id,
										'text': self.analysisOrgunits[i].children[j].name,
										'level': self.analysisOrgunits[i].children[j].level,
										'children': true
									});
									
									node.children.sort(sortNodeByName);
								}
								
								orgunitNodes.push(node);	
							}

							orgunitNodes.sort(sortNodeByName);
							callback(orgunitNodes);
		            	}
			                	
	                	//A leaf was clicked, need to get the next level
	                	else {
	                			                		
	                		var requestURL = '/api/organisationUnits/' + node.id + '.json?';
	                		requestURL += 'fields=children[name,id,level]';
	                		
	                		requestService.getSingle(requestURL).then(function(response) { 
	                			var orgunits = response.data.children;
	                			var children = [];
	                			
	                			var maxLevel = parseFloat(self.orgunitLevels[self.orgunitLevels.length-1].level);
	                			var lowestLevel = false;
	                			if (orgunits.length > 0) {
	                				lowestLevel = (orgunits[0].level === maxLevel);
	                			}
	                			
	                			for (var i = 0; i < orgunits.length; i++) {
	                				children.push({
	                					'id': orgunits[i].id,
	                					'text': orgunits[i].name,
	                					'level': orgunits[i].level,
	                					'children': !lowestLevel
	                				});
	                			}
	                			
	                			children.sort(sortNodeByName);
	                			callback(children);
	                		});
	                		
	                		                		
	                	} //end else
	                }//end data
		        }//end core
		   	}).bind("select_node.jstree", function (NODE, REF_NODE) {
		   		self.boundaryOrgunitSelected = REF_NODE.node.original;
		   		$scope.$apply();
		   	}).on("loaded.jstree", function() {
		   		$('#orgunitTree').jstree('select_node', self.analysisOrgunits[0].id);
		   	});
		}
		
		
		function sortNodeByName(a, b) {
			var aName = a.text.toLowerCase();
			var bName = b.text.toLowerCase(); 
			return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
		
		}
	    
	    
	    function updateDataElementList() {
	    	
	    	
	    	
	    	if (self.dataDisaggregation === 0) {	    	
	    		self.dataElementPlaceholder = "All data elements (totals) in " + self.dataElementGroupsSelected.name;
		    	metaDataService.getDataElementGroupMembers(self.dataElementGroupsSelected.id)
		    	 	.then(function(data) { 
		    	       	self.dataElements = data;
		    	     });
	    	}
	    	else {
	    		self.dataElementPlaceholder = "All data elements (details) in " + self.dataElementGroupsSelected.name;
	    		metaDataService.getDataElementGroupMemberOperands(self.dataElementGroupsSelected.id)
	    		 	.then(function(data) { 
	    		       	self.dataElements = data;
	    		     });
	    	}
	    
	    }
	    
	    
  	    function updateIndicatorList() {
  	    	self.indicatorPlaceholder = "All indicators in " + self.indicatorGroupsSelected.name;
  	    	
  	    	metaDataService.getIndicatorGroupMembers(self.indicatorGroupsSelected.id)
  	    		.then(function(data) { 
  	    		   	self.indicators = data;
  	    		});
  	    }
		
		
		function initWatchers() {
		
			$scope.$watchCollection(function() { return self.dataElementGroupsSelected; }, 
				function() {
					
					if (self.dataElementGroupsSelected) {
						updateDataElementList();	
					}
					
				}
			);
			
			$scope.$watchCollection(function() { return self.indicatorGroupsSelected; }, 
				function() {
					
					if (self.indicatorGroupsSelected) {

						updateIndicatorList();
						
			  		}     
				}
			);
			
			$scope.$watchCollection(function() { return self.dataDisaggregation; }, 
				function() {
					
					if (self.dataElementGroupsSelected) {
						self.dataElementsSelected = [];
						updateDataElementList();	
					}   
				}
			);
			
			$scope.$watchCollection(function() { return self.boundarySelectionType; }, 
				function(newObject, oldObject) {
					
					if (self.boundarySelectionType != self.userOrgunits.length) {
						self.boundaryOrgunitSelected = self.userOrgunits[self.boundarySelectionType];
					}
					else {
						self.boundaryOrgunitSelected = $('#orgunitTree').jstree('get_selected', true)[0].original;
						if (self.orgunitLevelSelected && self.orgunitLevelSelected.level >= self.boundaryOrgunitSelected.level) {
							self.orgunitLevelSelected = undefined;
						}
						
					}
				}
			);
			
			$scope.$watchCollection(function() { return self.boundaryOrgunitSelected; }, 
				function(newObject, oldObject) {
				
					console.log("Selected level changed");
					if (oldObject && newObject && oldObject.level != newObject.level) {
						if (self.orgunitLevelSelected && self.orgunitLevelSelected.level <= newObject.level) {
							self.orgunitLevelSelected = undefined;
						}
						
						filterLevels();
					}
				}
			);
			
			
		}
		
		function filterLevels() {
			self.filteredOrgunitLevels = [];
			
			if (!self.orgunitLevels || !self.boundaryOrgunitSelected) return;
			for (var i = 0; i < self.orgunitLevels.length; i++) {
				if (self.orgunitLevels[i].level > self.boundaryOrgunitSelected.level) {
					self.filteredOrgunitLevels.push(self.orgunitLevels[i]);
				}
			}
			
			
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
				else if (self.periodTypeSelected.id === 'BiMonthly') {
					startDate = moment().subtract(self.periodCountSelected.value*2, 'months').format("YYYY-MM-DD");
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
				
				
			}
			else {
				startDate = self.date.startDate;
				endDate = self.date.endDate;
			}
			
			return {'startDate': startDate, 'endDate': endDate, 'periodType': self.periodTypeSelected.id};
		
		}
		
		
		function getDataForAnalysis() {
		
			var details = false;
			if (self.dataDisaggregation != 0) {
				
				//Only data elements are allowed, no indicator/completeness
				self.indicatorsSelected = [];
				self.indicatorGroupsSelected = undefined;
				
				details = true;
			}
			
			var dataIDs = [];
			var coFilter = {};
			
			
			if (self.indicatorGroupsSelected) {
				
				if (self.indicatorsSelected.length > 0) {
					for (var i = 0; i < self.indicatorsSelected.length; i++) {
						dataIDs.push(self.indicatorsSelected[i].id);
					}
				}
				else { //Selected group but did not specify = all
					for (var i = 0; i < self.indicators.length; i++) {
						dataIDs.push(self.indicators[i].id);
					}
				}
				
			}
			
			if (self.dataElementGroupsSelected) {
				if (details) {
					if (self.dataElementsSelected.length > 0) {
						for (var i = 0; i < self.dataElementsSelected.length; i++) {
							coFilter[self.dataElementsSelected[i].id] = true;
							dataIDs.push(self.dataElementsSelected[i].dataElementId);
						}
					}
					else { //Selected group but did not specify = all
						for (var i = 0; i < self.dataElements.length; i++) {
							coFilter[self.dataElements[i].id] = true;
							dataIDs.push(self.dataElements[i].dataElementId);
						}
					}
				}
				else {
					if (self.dataElementsSelected.length > 0) {
						for (var i = 0; i < self.dataElementsSelected.length; i++) {
							dataIDs.push(self.dataElementsSelected[i].id);
						}
					}
					else { //Selected group but did not specify = all
						for (var i = 0; i < self.dataElements.length; i++) {
							dataIDs.push(self.dataElements[i].id);
						}
					}
				}
				
			}
					
			
			return {'dataIDs': uniqueArray(dataIDs),
				'details': details,  
				'coFilter': coFilter
				};
		
		
		
		}
		
		function uniqueArray(array) {
		    var seen = {};
		    return array.filter(function(item) {
		        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
		    });
		}
		
		
		self.doAnalysis = function() {
			//Collapse open panels
			$('.panel-collapse').removeClass('in');
			
			
			var data = getDataForAnalysis(); 
			console.log(data);	
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
				'boundary': [self.boundaryOrgunitSelected],
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
				
			
			var dataCount = 0;
			if (data.details) dataCount = data.dataIDs.length * 5;
			else dataCount = data.dataIDs.length;
			
			var ouCount = 0;
			if (self.orgunitLevelSelected) {
				var boundaryLevel = self.userOrgunits[0].level;
			 	var selectedLevel = self.orgunitLevelSelected.level;
			 	var levelDiff = selectedLevel - boundaryLevel;
			 	ouCount = Math.pow(10, levelDiff);
			}
			
			console.log("Expecting " + (dataCount * ouCount) + " rows.");			
						
			//Call service to get data
			completenessDataService.analyseData(data, period, orgunit, parameters);
				
		};
    
		return self;
		
	});
})();