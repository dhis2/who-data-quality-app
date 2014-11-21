(function(){  
	/**Controller: Parameters*/
	angular.module('completenessAnalysis').controller("ParamterController", function(completenessDataService, metaDataService, periodService, BASE_URL, $http, $q, $sce, $scope) {
	    
	    
	    var self = this;
	        
	    init();
	    initSelects();	 
    	initOrgunitTree();  	
	    
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
	    }
	    
	    
	    function initSelects() {
			
			metaDataService.fetchMetaData();
			
			var dataSetPromise = metaDataService.getDataSets();
			dataSetPromise.then(function(data) { 
				self.dataSets = data;
			});
			
			var dataElementPromise = metaDataService.getDataElements();
			dataElementPromise.then(function(data) { 
				self.dataElements = data;
			});
			
			var indicatorPromise = metaDataService.getIndicators();
			indicatorPromise.then(function(data) { 
				self.indicators = data;
			});
			
			var orgunitPromise = metaDataService.getOrgunits();
			orgunitPromise.then(function(data) { 
				self.orgunitData = data;
			});
			
			metaDataService.getUserOrgunits().then(function(data) { 
				self.userOrgunits = data;
			});
			
			metaDataService.getOrgunitLevels().then(function(data) { 
				self.orgunitLevels = data;
			});
			
			metaDataService.getOrgunitGroups().then(function(data) { 
				self.orgunitGroups = data;
			});

			//Options
			self.onlyNumbers = /^\d+$/;
			self.threshold = 90;
			self.stdDev = 3.0;
			self.analysisType = "outlier";
			
			
			//Date initialisation
			self.periodTypes = periodService.getPeriodTypes();
			self.periodTypeSelected = self.periodTypes[1];
			
			self.periodCounts = periodService.getPeriodCount();
			self.periodCountSelected = self.periodCounts[11];
			
			self.years = periodService.getYears();
			self.yearSelected = self.years[0];
					
			self.periodOption = "last";			
			self.datePickerOpts = {
	    		locale: {
    	            applyClass: 'btn-default',
    	            applyLabel: "Select",
	    	   	}
	    	};
	    	
	    	self.includeChildren = true;
	    	self.orgunitSelectionType = 'user';
	    }
	    				

		function initOrgunitTree() {
			$('#orgunitTree').jstree({
				"plugins" : [ "wholerow", "ui"],
			    'core': {
		            'data': function (node, callback) {
		            	
		            	//Tree is empty - get first two levels right away
		            	if (node.parent === null) {
		            	
		            		metaDataService.getRootOrgunits().then(function(data) { 
		            			var orgunits = data;
		            			var orgunitNodes = [];
				
								//Iterate over all the orgunit the user is assigned to (root(s))
								for (var i = 0; i < orgunits.length; i++) {
									orgunitNodes[i] = {
										'id': orgunits[i].id, 
										'text': orgunits[i].name,
										'children': [], 
										'state': {
											'opened': true
										}
									};
									
									//Add the children of the root(s) as well
									for (var j = 0; j < orgunits[i].children.length; j++) {
										orgunitNodes[i].children.push({
											'id': orgunits[i].children[j].id,
											'text': orgunits[i].children[j].name,
											'children': true
										});
										
										orgunitNodes[i].children.sort(sortNodeByName);
									}	
								}

								orgunitNodes.sort(sortNodeByName);
								callback(orgunitNodes);
		            		
		            		});
		            	}
			                	
	                	//A leaf was clicked, need to get the next level
	                	else {
	                		var orgunits = metaDataService.orgunitChildrenFromParentID(node.id);
	                		var children = [];
	                		for (var i = 0; i < orgunits.length; i++) {
	                			children.push({
                					'id': orgunits[i].id,
                					'text': orgunits[i].name,
                					'children': true //should probably add a check for number of levels, and avoid this for facilities
	                			});
	                		}
	                		
	                		children.sort(sortNodeByName);
	                		callback(children);	                		
	                	} //end else
	                }//end data
		        }//end core
		   	}).bind("select_node.jstree", function (NODE, REF_NODE) {
		   		self.orgunits = $('#orgunitTree').jstree('get_selected');
		   	}).on("loaded.jstree", function() {
		   		//select user orgunit nodes as default
		   		metaDataService.getUserOrgunits().then(function(data) {
		   			for (var i = 0; i < data.length; i++) {
		   				$('#orgunitTree').jstree('select_node', data[i].id);
		   				console.log("Selected " + data[i].id);
		   			}
		   		});
		   	});
		}
		
		
		function sortNodeByName(a, b) {
			var aName = a.text.toLowerCase();
			var bName = b.text.toLowerCase(); 
			return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
		
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
			
			var orgunit = {
				'orgunits': self.orgunits,
				'userOrgunits': self.userOrgunits,
				'includeChildren': self.includeChildren,
				'level': self.orgunitLevelSelected,
				'group': self.orgunitGroup,
				'selectionType': self.orgunitSelectionType
			};
			
			var parameters = {
				'threshold': self.threshold,
				'stdDev': self.stdDev,
				'analysisType': self.analysisType
			};
							
						
			//Call service to get data
			completenessDataService.analyseData(data, period, orgunit, parameters);
				
		};
    
		return self;
		
	});
})();