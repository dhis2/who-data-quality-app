
(function(){
	
	var app = angular.module('completenessAnalysis', []);
	
	app.filter('startFrom', function() {
	    return function(input, start) {
	        start = +start; //parse to int
	        if (input) return input.slice(start);
	        else return input;
	    }
	});
	
	app.controller("AnalysisController", function(completenessDataService, metaDataService, periodService, requestService, dataAnalysisService, $scope, $modal) {
		var self = this;
			    
	    self.result = undefined;
	    self.itemsPerPage = 25;
	    self.hasVisual = false;
	        
	    init();
	    initWatchers();	    
	    
		function init() {		
			self.alerts = [];		
			self.dataDisaggregation = 0;
	    	
	    	self.dataElementGroups = [];
	    	self.dataElementGroupsSelected = undefined;
	    	metaDataService.getDataElementGroups().then(function(data) { 
	    		self.dataElementGroups = data;
	    	});
	    	
	    	self.dataElements = [];
	    	self.dataElementPlaceholder = "";
	    	self.dataElementsSelected = undefined;
			
			
			self.indicatorGroups = [];
			self.indicatorGroupsSelected = undefined;
			metaDataService.getIndicatorGroups().then(function(data) { 
				self.indicatorGroups = data;
			});
			
	    	self.indicators = [];
	    	self.indicatorPlaceholder = "";
	    	self.indicatorsSelected = undefined;
	    	
	    	
	    	self.analysisOrgunits = [];
	    	self.userOrgunits = [];
	    	self.boundaryOrgunitSelected = undefined;
	    	
	    	metaDataService.getAnalysisOrgunits().then(function(data) { 
	    		self.analysisOrgunits = data;
	    		initOrgunitTree();
	    	});
	    	
	    	metaDataService.getUserOrgunits().then(function(data) { 
	    		self.userOrgunits = data;
	    		self.boundarySelectionType = 0;
	    		self.boundaryOrgunitSelected = self.userOrgunits[0];
	    		filterLevels();
	    	});
	    	
	    	
	    	self.orgunitLevels = [];
	    	self.filteredOrgunitLevels = [];
	    	self.orgunitLevelSelected = undefined;
	    	metaDataService.getOrgunitLevels().then(function(data) { 
	    		self.orgunitLevels = data;
	    		
	    		self.lowestLevel = 0; 
	    		for (var i = 0; i < self.orgunitLevels.length; i++) {
	    			var level = self.orgunitLevels[i].level;
	    			if (level > self.lowestLevel) self.lowestLevel = level;
	    		}
	    		filterLevels();
	    	});
	    	
	    	
	    	self.orgunitGroups = [];
	    	self.orgunitGroupSelected = undefined;
	    	metaDataService.getOrgunitGroups().then(function(data) { 
	    		self.orgunitGroups = data;
	    	});
	    	
	    	
	    	self.periodTypes = [];
	    	self.periodTypes = periodService.getPeriodTypes();
	    	self.periodTypeSelected = self.periodTypes[1];
	    	
	    	self.periodCount = [];	    	
	    	self.periodCounts = periodService.getPeriodCount();
	    	self.periodCountSelected = self.periodCounts[11];
	    	
	    	self.years = periodService.getYears();
	    	self.yearSelected = self.years[0];
	    	
	    	self.isoPeriods = [];
	    	
	    	self.currentDate = new Date();			
	    	self.date = {
	    		"startDate": moment().subtract(12, 'months'), 
	    		"endDate": moment()
	    	};
	    	
	    	self.periodOption = "last";
	    	
	    	
	    	
	    	self.baseStdDev = 1.5; //everything less will be ignored when making the request
	    	self.baseGapLimit = 1; //everything less will be ignored when making the request
	    	
	    	self.stdDev = 2;
	    	self.gapLimit = 0;
	    	
	    	
	    	self.onlyNumbers = /^\d+$/;	    	
	    	self.userOrgunitLabel = "";
	    	    	
	    	//Accordion settings
	    	self.oneAtATime = true;
	    	self.status = {
	    	    isFirstOpen: true
	    	};
	    }
	    	    
	    
		function initWatchers() {
		
			//Data element group => get data elements in group
			$scope.$watchCollection(function() { return self.dataElementGroupsSelected; }, 
				function() {
					
					if (self.dataElementGroupsSelected) {
						updateDataElementList();	
					}
					
				}
			);
			
			//Data element total vs detail
			$scope.$watchCollection(function() { return self.dataDisaggregation; }, 
				function() {
					
					if (self.dataElementGroupsSelected) {
						self.dataElementsSelected = undefined;
						updateDataElementList();	
					}   
				}
			);
			
			//Indicator group => get indicators in group
			$scope.$watchCollection(function() { return self.indicatorGroupsSelected; }, 
				function() {
					
					if (self.indicatorGroupsSelected) {

						updateIndicatorList();
						
			  		}     
				}
			);
			
			//Changed from user orgunit to manual selection
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
			
			//Selected orgunit => update list of levels
			$scope.$watchCollection(function() { return self.boundaryOrgunitSelected; }, 
				function(newObject, oldObject) {
					if (oldObject && newObject && oldObject.level != newObject.level) {
						if (self.orgunitLevelSelected && self.orgunitLevelSelected.level <= newObject.level) {
							self.orgunitLevelSelected = undefined;
						}
						
						filterLevels();
					}
				}
			);
			
			
		}
		
		
		self.getLevelPlaceholder = function() {
			if (!self.filteredOrgunitLevels || self.filteredOrgunitLevels.length === 0) {
				if (self.boundaryOrgunitSelected && self.boundaryOrgunitSelected.level === self.lowestLevel) return "N/A";
				else return "Loading...";
			
			}
			else return "Select level";
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
	   		self.dataElements = [];
	   		self.dataElementsSelected = undefined;
	    	if (self.dataDisaggregation === 0) {	    	
	    		self.dataElementPlaceholder = "Loading...";
		    	metaDataService.getDataElementGroupMembers(self.dataElementGroupsSelected.id)
		    	 	.then(function(data) { 

		    	       	self.dataElementPlaceholder = "All data elements (totals) in " + self.dataElementGroupsSelected.name;
		    	       	
		    	       	self.dataElements = data;
		    	     });
	    	}
	    	else {
	    		self.dataElementPlaceholder = "Loading...";
	    		metaDataService.getDataElementGroupMemberOperands(self.dataElementGroupsSelected.id)
	    		 	.then(function(data) { 
	    		 		self.dataElementPlaceholder = "All data elements (details) in " + self.dataElementGroupsSelected.name;
	    		 		
	    		       	self.dataElements = data;
	    		     });
	    	}
	    
	    }
	    
	    
  	    function updateIndicatorList() {
  	    	self.indicators = [];
	   		self.indicatorsSelected = undefined;
  	    	self.indicatorPlaceholder = "Loading...";
  	    	metaDataService.getIndicatorGroupMembers(self.indicatorGroupsSelected.id)
  	    		.then(function(data) { 
  	    			self.indicatorPlaceholder = "All indicators in " + self.indicatorGroupsSelected.name;
  	    			
  	    		   	self.indicators = data;
  	    		});
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
		
		
		function getPeriods() {
			
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
			
			return periodService.getISOPeriods(startDate, endDate, self.periodTypeSelected.id);
		
		}
		
		
		function getDataForAnalysis() {
		
			var details = (self.dataDisaggregation != 0);
			
			var dataIDs = [];
			if (!details && self.indicatorGroupsSelected) {
				if (self.indicatorsSelected) {
					dataIDs.push(self.indicatorsSelected.id);
				}
				else { //Selected group but did not specify = all
					for (var i = 0; i < self.indicators.length; i++) {
						dataIDs.push(self.indicators[i].id);
					}
				}
			}
			
			var coFilter = {};
			if (self.dataElementGroupsSelected) {
				if (details) {
					if (self.dataElementsSelected) {
						coFilter[self.dataElementsSelected.id] = true;
						dataIDs.push(self.dataElementsSelected.dataElementId);
					}
					else { //Selected group but did not specify = all
						for (var i = 0; i < self.dataElements.length; i++) {
							coFilter[self.dataElements[i].id] = true;
							dataIDs.push(self.dataElements[i].dataElementId);
						}
					}
				}
				else {
					if (self.dataElementsSelected) {
						dataIDs.push(self.dataElementsSelected.id);
					}
					else { //Selected group but did not specify = all
						for (var i = 0; i < self.dataElements.length; i++) {
							dataIDs.push(self.dataElements[i].id);
						}
					}
				}
				
			}
					
			
			return {
				'dataIDs': uniqueArray(dataIDs),
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
			var variables = data.dataIDs;

			var parameters = {};
			parameters.co = data.details;
			parameters.coFilter = data.coFilter;
			
			
			var periods = getPeriods();
			
			
			var orgunits = [self.boundaryOrgunitSelected.id];
			if (self.orgunitLevelSelected) {
				parameters.OUlevel = self.orgunitLevelSelected.level;
			}
			else if (self.orgunitGroupSelected) {
				parameters.OUgroup = self.orgunitGroupSelected.id;
			}
			
			
			parameters.outlierLimit = self.stdDev;
			parameters.gapLimit = self.gapLimit;
			parameters.lowLimit = self.thresholdLow;
			parameters.highLimit = self.thresholdHigh;
			
			console.log("Requesting data");
			self.result = null;
			dataAnalysisService.outlier(receiveResultNew, variables, periods, orgunits, parameters);
		};
		
		
		
		/**
		RESULTS
		*/
        //showDetails
        self.showDetails = function(row) {

			$('#detailedResult').html('<div id="detailChart"><svg class="bigChart"></svg></div>');
        	
        	var chart = nv.models.multiBarChart()
        			      .transitionDuration(500)
        			      .reduceXTicks(true)   //If 'false', every single x-axis tick label will be rendered.
        			      .rotateLabels(0)      //Angle to rotate x-axis labels.
        			      .groupSpacing(0.1)    //Distance between each group of bars.
        			      .showControls(false)
        			    ;
        			
        	var result = self.result;
        	var index = 0;
        	var series = [{
        		'key': row.metaData.dxName + " - " + row.metaData.ouName,
        		'color': "green",
        		'values': []
        	}];
        	for (var i = 0; i < row.data.length; i++) {
    			var value = row.data[i];
    			if (value === '') value = null;
    			else value = parseFloat(value);
    			series[0].values.push({
    				'x': index++,   		
    				'y': value,
    				'label': self.periods[i]
    			});
        	}
        	        	        				
		    chart.xAxis
		        .tickFormat(function(d) {
		        	return series[0].values[d].label;
		        });
		
		    chart.yAxis
		        .tickFormat(d3.format('g'));
		
			d3.select('#detailChart svg')
		        .datum(series)
		        .call(chart);
				
		    nv.utils.windowResize(chart.update);
		    
		    $('html, body').animate({
		    	scrollTop: $("#detailChart").offset().top,
		    	scrollLeft: 0
		    }, 500);    
    		
        };

        
        self.sendMessage = function(metaData) {
        	        	
        	var modalInstance = $modal.open({
	            templateUrl: "modals/modalMessage.html",
	            controller: "ModalMessageController",
	            controllerAs: 'mmCtrl',
	            resolve: {
	    	        orgunitID: function () {
	    	            return metaData.ouID;
	    	        },
	    	        orgunitName: function () {
	    	            return metaData.ouName;
	    	        }
	            }
	        });
	
	        modalInstance.result.then(function (result) {
	        });
        }
        
        
        self.drillDown = function (rowMetaData) {
        	
        	var requestURL = "/api/organisationUnits/" + rowMetaData.ouID + ".json?fields=children[id]";
        	requestService.getSingle(requestURL).then(function (response) {
        		
        		
        		var children = response.data.children;
        		if (children.length > 0) {
        		
					var orgunits = [];
					for (var i = 0; i < children.length; i++) {
						orgunits.push(children[i].id);
					}
					self.result.metaData.parameters.OUlevel = undefined;
					self.result.metaData.parameters.OUgroup = undefined;
					
					self.result = null;
					
					dataAnalysisService.outlier(receiveResultNew, self.result.metaData.variables, self.result.metaData.periods, orgunits, self.result.metaData.parameters);
					
        		}
        		        		
        		else {
        			self.alerts.push({type: 'warning', msg: rowMetaData.ouName + ' does not have any children'});
        		}
        	});
        	
        	
        }

        
        self.floatUp = function (rowMetaData) {
        	
        	var requestURL = "/api/organisationUnits/" + rowMetaData.ouID + ".json?fields=parent[id,children[id],parent[id,children[id]]";
        	requestService.getSingle(requestURL).then(function (response) {

        		var metaData = response.data;
        		if (metaData.parent) {
        			
        			var orgunits = [metaData.parent.id];
        			self.result.metaData.parameters.OUlevel = undefined;
        			self.result.metaData.parameters.OUgroup = undefined;

					self.result = null;

					dataAnalysisService.outlier(receiveResultNew, self.result.metaData.variables, self.result.metaData.periods, orgunits, self.result.metaData.parameters);
        		}
        		else {
					self.alerts.push({type: 'warning', msg: rowMetaData.ouName + ' does not have a parent'});
        		}
        		
        		
        		
        	});
        	
        	
        }
                

	    var receiveResultNew = function(result) {		    
	    	    
			if (!result) { 
				console.log("Empty result");
				self.alerts.push({type: 'warning', msg: 'No data!'});
			}
			else {
				self.alerts = [];
				console.log("Received " + result.rows.length + " rows");
			}
			
			self.result = result;
			
			
			//Reset filter
			self.stdDev = 0;
			self.gapLimit = 0;
			
			
			self.updateFilter();
			
			//Default sort column
			self.sortCol = 'metaData.outWeight';
			self.reverse = true;
			
			//Get nice period names
			self.periods = [];
			for (var i = 0; i < result.metaData.periods.length; i++) {
				var period = result.metaData.periods[i];
				self.periods.push(periodService.shortPeriodName(period));
			}
			
			//Calculate total number of columns in table
			self.totalColumns = self.periods.length + 6;
	    };
	     
	    self.isOutlier = function (value, mean, sd, lim) {
	   		var z = (value-mean)/sd;
	   		if (z > self.baseStdDev) return true;
	   		else return false;
	   	}
	   		   	
	   	function includeRow(row) {
	   		
	   		if (row.metaData.gaps >= self.gapLimit && row.metaData.maxZ >= self.stdDev) return true;
	   		
	   		return false;
	   	}
	   	
	   	self.updateFilter = function() {
	   		self.filteredRows = [];
	   		for (var i = 0; i < self.result.rows.length; i++) {
	   			if (includeRow(self.result.rows[i])) {
	   				self.filteredRows.push(self.result.rows[i]);
	   			}
	   		}
	   		
	   		//Store paging variables
	   		self.currentPage = 1;
	   		self.pageSize = 15;   	
	   		self.totalRows = self.filteredRows.length;
	   	}
	   	 
    	    
		return self;
	});
	
})();

