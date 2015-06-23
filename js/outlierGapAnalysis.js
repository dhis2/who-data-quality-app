
(function(){
	
	var app = angular.module('outlierGapAnalysis', []);
	
	app.filter('startFrom', function() {
	    return function(input, start) {
	        start = +start; //parse to int
	        if (input) return input.slice(start);
	        else return input;
	    }
	});
	
	app.controller("OutlierGapAnalysisController", function(metaDataService, periodService, requestService, dataAnalysisService, mathService, $scope, $modal) {
		var self = this;
			    
	    self.result = undefined;
	    self.itemsPerPage = 25;
	    self.hasVisual = false;
	        
	    self.processStatus = dataAnalysisService.status;
	        
	    init();
	    initWatchers();	    
	    	    
		function init() {		
			self.alerts = [];		
			self.dataDisaggregation = 0;
			
			self.checkModel = { 
				filter: false,
				export: false,
				history: false
			};
	    	
	    	self.datasets = [];
	    	self.datasetDataelements = undefined;
	    	self.datasetSelected = undefined;
	    	metaDataService.getDataSets().then(function(data) { 
	    		self.datasets = data;
	    	});
	    	
	    	self.dataElementGroups = [];
	    	self.dataElementGroupsSelected = undefined;
	    	metaDataService.getDataElementGroups().then(function(data) { 
	    		self.dataElementGroups = data;
	    	});
	    	
	    	self.dataElements = [];
	    	self.dataElementPlaceholder = "";
	    	self.dataElementsSelected = [];
			
			
			self.indicatorGroups = [];
			self.indicatorGroupsSelected = undefined;
			metaDataService.getIndicatorGroups().then(function(data) { 
				self.indicatorGroups = data;
			});
			
	    	self.indicators = [];
	    	self.indicatorPlaceholder = "";
	    	self.indicatorsSelected = [];
	    	
	    	
	    	self.analysisOrgunits = [];
	    	self.userOrgunits = [];
	    	self.boundaryOrgunitSelected = undefined;
	    	
	    	self.ouSelected = null;
	    	self.ouSearchResult = [];
	    		    	
	    	metaDataService.getUserOrgunits().then(function(data) { 
	    		self.userOrgunits = data;
	    		self.boundarySelectionType = 0;
	    		self.boundaryOrgunitSelected = self.userOrgunits[0];
	    		self.filterLevels();
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
	    		
	    		self.filterLevels();
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
						self.dataElementsSelected = [];
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
						self.boundaryOrgunitSelected = undefined;
						self.orgunitLevelSelected = undefined						
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
						
						self.filterLevels();
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
		
		
	    self.orgunitSearch = function(searchString){
	        if (searchString.length >= 3) {
	    		var requestURL = "/api/organisationUnits.json?filter=name:like:" + searchString + "&paging=false&fields=name,id,level";
	    		requestService.getSingle(requestURL).then(function (response) {
	    			self.ouSearchResult = response.data.organisationUnits;
	    		});
	    	}
	    }
		
	
	    function updateDataElementList() {
	   		self.dataElements = [];
	   		self.dataElementsSelected = [];
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
	   		self.indicatorsSelected = [];
  	    	self.indicatorPlaceholder = "Loading...";
  	    	metaDataService.getIndicatorGroupMembers(self.indicatorGroupsSelected.id)
  	    		.then(function(data) { 
  	    			self.indicatorPlaceholder = "All indicators in " + self.indicatorGroupsSelected.name;
  	    			
  	    		   	self.indicators = data;
  	    		});
  	    }
			
		
		self.filterLevels = function() {
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
			
			var coFilter = {};
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
			
			
			if (self.datasetSelected) {
				dataIDs = [];
				
				for (var i = 0; i < self.datasetDataelements.length; i++) {
					dataIDs.push(self.datasetDataelements[i].id);	
				}
								
			}
			
			return {
				'dataIDs': uniqueArray(dataIDs),
				'details': details,  
				'coFilter': details ? coFilter : null
			};
		
		
		
		}
		
		
		function uniqueArray(array) {
		    var seen = {};
		    return array.filter(function(item) {
		        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
		    });
		}
		
		
		function getDatasetDataelements() {
			
			var requestURL = '/api/dataSets/' + self.datasetSelected.id + '.json?fields=dataElements[id]';
			requestService.getSingle(requestURL).then(function (response) {
				self.datasetDataelements = response.data.dataElements;
				self.doAnalysis();
			});
		
		}
		
		
		
		self.doAnalysis = function() {
			
			//Collapse open panels
			$('.panel-collapse').removeClass('in');
			
			
			if (self.datasetSelected && !self.datasetDataelements) {
				getDatasetDataelements();
				return;
			}
			
			var data = getDataForAnalysis();
			var variables = data.dataIDs;			
			var periods = getPeriods();
			
			//If dataset, include all optioncombos
			var coAll = false;
			if (self.datasetSelected) coAll = true;
			
			var ouGroup = null;
			if (self.orgunitGroupSelected) ouGroup = self.orgunitGroupSelected.id;
			
			var ouLevel = null;
			self.result = undefined;
			if (self.orgunitLevelSelected) {
				ouLevel = self.orgunitLevelSelected.level;
				var depth = (ouLevel-self.boundaryOrgunitSelected.level);
				if (depth > 2) {
					
					//Split queries by grandchildren of selected ou
					var requestURL = '/api/organisationUnits.json';
					if (depth === 3) {
						requestURL += '?filter=parent.id:eq:' + self.boundaryOrgunitSelected.id;
					}
					else if (depth === 4) {
						requestURL += '?filter=parent.parent.id:eq:' + self.boundaryOrgunitSelected.id;
					}
					else if (depth === 5) {
						requestURL += '?filter=parent.parent.parent.id:eq:' + self.boundaryOrgunitSelected.id;
					}
					
					requestURL += '&filter=children:ne:0';
					requestURL += '&fields=id&paging=false';
					
					requestService.getSingle(requestURL).then(function (response) {
						console.log(response);
						var orgunits = response.data.organisationUnits;
						var ouIDs = [];
						for (var i = 0; i < orgunits.length; i++) {
							ouIDs.push(orgunits[i].id);
						}
						dataAnalysisService.outlierGap(receiveResultNew, variables, coAll, data.coFilter, periods, ouIDs, ouLevel, ouGroup, 2, 3.5, 1);					
						
					});
				}
				else {
					dataAnalysisService.outlierGap(receiveResultNew, variables, coAll, data.coFilter, periods, [self.boundaryOrgunitSelected.id], ouLevel, ouGroup, 2, 3.5, 1);
				}
			}
			else {
				dataAnalysisService.outlierGap(receiveResultNew, variables, coAll, data.coFilter, periods, [self.boundaryOrgunitSelected.id], ouLevel, ouGroup, 2, 3.5, 1);
			}
			
						
			self.datasetDataelements = null;
		};
		
		
		
		/**
		RESULTS
		*/
		
		self.sortByColumn = function (columnKey) {
			self.currentPage = 1;
			if (self.sortCol === columnKey) {
				self.reverse = !self.reverse;
			}
			else {
				self.sortCol = columnKey;
				self.reverse = true;
			}
		}
		
		
		var receiveResultNew = function(result) {		    
			    
			if (!result || !result.rows || result.rows.length === 0) { 
				console.log("Empty result");
				self.alerts.push({type: 'warning', msg: 'No data!'});
			}
			else {
				self.alerts = [];
				console.log("Received " + result.rows.length + " rows");
			}
			
			self.result = result;
			
			//Reset filter
			self.stdFilterType = 0;
			self.stdFilterDegree = 1;
			
			self.updateFilter();
			
			//Default sort column
			self.sortCol = 'result.totalWeight';
			self.reverse = true;
			
			//Get nice period names
			self.periods = [];
			for (var i = 0; i < result.metaData.periods.length; i++) {
				var period = result.metaData.periods[i];
				self.periods.push(periodService.shortPeriodName(period));
			}
			
			//Calculate total number of columns in table
			self.totalColumns = self.periods.length + 8;
		};
		
       	    
	    self.isOutlier = function (value, stats) {
	    	if (value === null || value === '') return false;
	    	
	   		var standardScore = Math.abs(mathService.calculateStandardScore(value, stats));
	   		var zScore = Math.abs(mathService.calculateZScore(value, stats));
	   		
	   		if (standardScore > 2 || zScore > 3.5) return true;
	   		else return false;
	   	}
	   	
	   		   	
	   	function includeRow(row) {
	   		
	   		if (self.stdFilterType === 0) return true;
	   		
	   		if (self.stdFilterType === 1) {
	   			if (self.stdFilterDegree === 2) return row.result.maxSscore > 3;
	   			else return row.result.maxSscore > 2;
	   		}
	   		
   			if (self.stdFilterType === 2) {
   				if (self.stdFilterDegree === 2) return row.result.maxZscore > 5;
   				else return row.result.maxZscore > 3.5;
   			} 
	   		
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
	   	
	   	
	   	self.exportCSV = function() {
			  
			  var content = self.result.rows;
			  var string, csvContent = '';
			  for (var i = 0; i < content.length; i++) {
			      var value = content[i];
			  	
			  	 string = checkExportValue(value.metaData.ou.name) + ";";
			  	 string += checkExportValue(value.metaData.dx.name) + ";";
			  	 for (var j = 0; j < value.data.length; j++) {
			  	 	string += checkExportValue(value.data[j]) + ";";	
			  	 }			  	 
			     string += checkExportValue(value.result.maxSscore) + ";";
			     string += checkExportValue(value.result.maxZscore) + ";";
			     string += checkExportValue(value.result.gapWeight) + ";";
			     string += checkExportValue(value.result.outWeight) + ";";
			     string += checkExportValue(value.result.totalWeight);
			  
			     csvContent += string + '\n';
			  }
			  
			  var blob = new Blob([csvContent], {type: "text/csv;charset=utf-8"});
			  // see FileSaver.js
			  saveAs(blob, "outlier_gap_data.csv");
 
			  
	   	
	   	}
	   	
	   	function checkExportValue(value) {
	   		var innerValue =  value === null ? '' : value.toString();
	   		var result = innerValue.replace(/"/g, '""');
	   		if (result.search(/("|,|\n)/g) >= 0)
	   		    result = '"' + result + '"';
			return result;
	   	}
	   	
	   	
	   	/**INTERACTIVE FUNCTIONS*/
	   	
	   	//showDetails
        self.showDetails = function(row) {

			$('#detailedResult').html('<div id="detailChart"><svg class="bigChart"></svg></div>');
        	
        	var chart = nv.models.multiBarChart()
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
	            templateUrl: "views/_modals/modalMessage.html",
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
					

					
					dataAnalysisService.outlier(receiveResultNew, self.result.metaData.variables, self.result.metaData.periods, orgunits, self.result.metaData.parameters);
					
					self.result = null;
					
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

					

					dataAnalysisService.outlier(receiveResultNew, self.result.metaData.variables, self.result.metaData.periods, orgunits, self.result.metaData.parameters);
					
					self.result = null;
        		}
        		else {
					self.alerts.push({type: 'warning', msg: rowMetaData.ouName + ' does not have a parent'});
        		}
        		
        		
        		
        	});
        	
        	
        }
	   	        
	   	 
    	    
		return self;
	});
	
})();

