
(function(){
	
	var app = angular.module('consistencyAnalysis', []);
	
	app.filter('startFrom', function() {
	    return function(input, start) {
	        start = +start; //parse to int
	        if (input) return input.slice(start);
	        else return input;
	    }
	});
	
	app.controller("ConsistencyAnalysisController", function(metaDataService, periodService, requestService, dataAnalysisService, visualisationService, mathService, $modal, $timeout, $scope) {
		var self = this;
			    
	    self.result = undefined;
	    self.mainResult = undefined;
	    self.itemsPerPage = 25;
	    self.hasVisual = false;
	    self.req = false;
	    
	    self.processStatus = dataAnalysisService.status;
	         	    
		function init() {		
			self.alerts = [];
			self.chart = {};
			self.chartSelected = {};
			
			self.selectedObject = {};
			
			self.consistencyType = 'relation'; 
			self.relationshipType = 'eq';
			self.trendType = 'constant';
			self.consistencyCriteria = 20;
			
	    	self.dataSelection = {
	    		'deGroups': [],
	    		'indGroups': [],
	    		'a': {
	    			deGroupSelected : undefined,
	    			de : [],
	    			deSelected : undefined,
	    			deText: "",
	    			indGroupSelected : undefined,
	    			ind : [],
	    			indSelected : undefined,
	    			indText: "",
	    			type: 'de'
	    		},
	    		'b': {
	    			deGroupSelected : undefined,
	    			de: [],
	    			deSelected : undefined,
	    			deText: "",
	    			indGroupSelected : undefined,
	    			ind : [],
	    			indSelected : undefined,
	    			indText: "",
	    			type: 'de'
	    		}
			};
	    	
	    	metaDataService.getDataElementGroups().then(function(data) { 
	    		self.dataSelection.deGroups = data;
	    	});
			metaDataService.getIndicatorGroups().then(function(data) { 
				self.dataSelection.indGroups = data;
			});
			
	    	
	    	//ORGUNITS
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
	    		self.orgunitUserDefaultLevel();
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
	    		self.orgunitUserDefaultLevel();
	    	});
	    	
	    	
	    	self.orgunitGroups = [];
	    	self.orgunitGroupSelected = undefined;
	    	metaDataService.getOrgunitGroups().then(function(data) { 
	    		self.orgunitGroups = data;
	    	});
	    	
	    	
	    	//PERIODS
	    	self.periodTypes = [];
	    	self.periodTypes = periodService.getPeriodTypes();
	    	self.periodTypeSelected = self.periodTypes[4];
			self.filteredPeriodTypes = [];
			filterPeriodTypes();
	    	
	    	self.periodCount = [];	    	
	    	self.periodCounts = periodService.getPeriodCount();
	    	self.periodCountSelected = self.periodCounts[3];
	    	
			
	    	self.years = periodService.getYears();
	    	self.yearSelected = self.years[0];
	    	
	    	self.isoPeriods = [];
	    	
	    	self.currentDate = new Date();			
	    	self.date = {
	    		"startDate": moment().subtract(12, 'months'), 
	    		"endDate": moment()
	    	};
	    	
	    	self.getPeriodsInYear();	    		
	    	
	    	self.onlyNumbers = /^\d+$/;	    	
	    	self.userOrgunitLabel = "";
	    	    	
	    	//Accordion settings
	    	self.oneAtATime = true;
	    	self.status = {
	    	    isFirstOpen: true
	    	};
	    }

	
		/** -- PARAMETER SELECTION -- */

		/** Orgunits */
		self.orgunitSearchModeSelected = function() {
			self.boundaryOrgunitSelected = undefined;
			self.orgunitLevelSelected = undefined;
		};
		
		
		self.orgunitUserModeSelected = function() {
			self.boundaryOrgunitSelected = self.userOrgunits[0];
			self.orgunitUserDefaultLevel();
		};
		
		
		self.orgunitUserDefaultLevel = function() {
			
			if (!self.boundaryOrgunitSelected || !self.filteredOrgunitLevels) return;
		
			var level = self.boundaryOrgunitSelected.level;
			for (var i = 0; i < self.filteredOrgunitLevels.length; i++) {
				if (self.filteredOrgunitLevels[i].level === (level+1)) {
					self.orgunitLevelSelected = self.filteredOrgunitLevels[i];
				}
			}
			
			if (self.filteredOrgunitLevels.length === 0) self.orgunitLevelSelected = undefined;
		
		};
		
		function lowestLevel() {
		
			var lowest = 1;
			for (var i = 0; i < self.orgunitLevels.length; i++) {
				if (self.orgunitLevels[i].level > lowest) {
					lowest = self.orgunitLevels[i].level;
				}
			}
			
			return lowest;
		}
				
		
		//Lower than selected orgunit, but max two levels (until analysis can handle more)
		self.filterLevels = function() {
			self.filteredOrgunitLevels = [];
			
			if (!self.orgunitLevels || !self.boundaryOrgunitSelected) return;
			for (var i = 0; i < self.orgunitLevels.length; i++) {
			
				var belowSelectedUnit = self.orgunitLevels[i].level > self.boundaryOrgunitSelected.level;
				var belowMaxDepth = self.orgunitLevels[i].level > (self.boundaryOrgunitSelected.level + 2);
			
				if (belowSelectedUnit && !belowMaxDepth) {
					self.filteredOrgunitLevels.push(self.orgunitLevels[i]);
				}
			}			
		};
		
				
		self.getLevelPlaceholder = function() {
			if (!self.filteredOrgunitLevels || self.filteredOrgunitLevels.length === 0) {
				if (self.boundaryOrgunitSelected && self.boundaryOrgunitSelected.level === self.lowestLevel) return "N/A";
				else return "Loading...";
			
			}
			else return "Select level";
		};
		
		
	    self.orgunitSearch = function(searchString){
	        if (searchString.length >= 3) {
	    		var requestURL = "/api/organisationUnits.json?filter=name:like:" + searchString + "&paging=false&fields=name,id,level";
	    		requestService.getSingle(requestURL).then(function (response) {

					//will do with API filter once API-filter is stable
	    			var orgunits = response.data.organisationUnits;
	    			var lowest = lowestLevel();
	    			self.ouSearchResult = [];
	    			for (var i = 0; i < orgunits.length; i++) {
	    				if (orgunits[i].level < lowest) {
		    				self.ouSearchResult.push(orgunits[i]);
		    			}
	    			}
	    			
	    		});
	    	}
	    };
		
		
		/** Data */
	    self.updateDataElementList = function(dataItem) {
	    	self.dataSelection[dataItem].de = [];
	    	self.dataSelection[dataItem].deSelected = undefined;
	    	
	    	if (self.dataSelection[dataItem].type === 'de') {	    	
	    		self.dataSelection[dataItem].deText = "Loading...";
		    	metaDataService.getDataElementGroupMembers(self.dataSelection[dataItem].deGroupSelected.id)
		    	 	.then(function(data) { 

		    	       	self.dataSelection[dataItem].deText = "Select data element...";
		    	       	self.dataSelection[dataItem].de = data;
		    	       	if (dataItem == 'a' && !self.dataSelection['b'].de) {
							self.dataSelection['b'].deText = "Select data element...";
							self.dataSelection['b'].de = data;		    	       		
		    	       	}
		    	     });
	    	}
	    	else {
	    		self.dataSelection[dataItem].deText = "Loading...";
	    		metaDataService.getDataElementGroupMemberOperands(self.dataSelection[dataItem].deGroupSelected.id)
	    		 	.then(function(data) { 
		    	       	self.dataSelection[dataItem].deText = "Select data element...";    		 		
	    		       	self.dataSelection[dataItem].de = data;
	    		       	
	    		       	if (dataItem == 'a' && !self.dataSelection['b'].deGroupSelected) {
	    		       		self.dataSelection['b'].deGroupSelected = angular.copy(self.dataSelection['a'].deGroupSelected);
	    		       		self.dataSelection['b'].deText = "Select data element...";
	    		       		self.dataSelection['b'].de = data;		    	       		
	    		       	}
	    		     });
	    	}
	    
	    };
	    
	    self.dataSelected = function (itemType, itemCode) {
	    	if (itemType === 'de') {
		    	metaDataService.getDataElementPeriodType(self.selectedData(itemCode).id).then(function (periodType) {
		    		self.dataSelection[itemCode].periodType = periodType;
		    		filterPeriodTypes();
		    		
		    		//Select most recent period
		    		if (self.periodsInYear.length > 0) self.periodSelected = self.periodsInYear[0];
		    	});
		    }
		    else {
		    	metaDataService.getIndicatorPeriodTypes(self.selectedData(itemCode).id).then(function (periodTypeObject) {
		    		console.log(periodTypeObject);
		    		self.dataSelection[itemCode].periodType = periodTypeObject.longest;
		    		filterPeriodTypes();

		    		//Select most recent period
		    		if (self.periodsInYear.length > 0) self.periodSelected = self.periodsInYear[0];
		    	});
		    }
		    
		    
		    
	    };
	    
	    
	      self.updateIndicatorList = function(dataItem) {
	      	self.dataSelection[dataItem].ind = [];
	    		self.dataSelection[dataItem].indSelected = undefined;
	      	self.dataSelection[dataItem].indText = "Loading...";
	      	metaDataService.getIndicatorGroupMembers(self.dataSelection[dataItem].indGroupSelected.id)
	      		.then(function(data) { 
	      			self.dataSelection[dataItem].indText = "Select indicator";  	    			
	      		   	self.dataSelection[dataItem].ind = data;
	      		});
	      };
	      
	      
        //item a or b
        self.selectedData = function(item) {
      	    
      	    //var get data id(s)
      	    var dx;
      	    if (self.dataSelection[item].type === 'de') {
      	    	return self.dataSelection[item].deSelected;
      	    }
      	    else {
      	    	return self.dataSelection[item].indSelected;
      	    }
        };
	      	
	    
	    /** Periods */	    	
    	self.getPeriodsInYear = function() {
    		self.periodsInYear = [];
    		var isoPeriods = periodService.getISOPeriods(self.yearSelected.name.toString() + '-01-01', self.yearSelected.name.toString() + '-12-31', self.periodTypeSelected.id);
    		for (var i = 0; i < isoPeriods.length; i++) {
    			self.periodsInYear.push({
    				'id': isoPeriods[i],
    				'name': periodService.shortPeriodName(isoPeriods[i])
    			});
    		}  
    		
    		//Don't want the period we're in, which the period function gives us
    		if (self.periodTypeSelected.id != 'Yearly' && new Date().getFullYear() ===  self.yearSelected.id) {
    			self.periodsInYear.pop();
    		}
    		
    		//Want most recent first (?)
    		self.periodsInYear.sort(function(a, b) { return (a.id > b.id) ? -1 : 1});
    		
    	};
	    	    
	    
	    
	    function filterPeriodTypes() {
	    	
	    	if (!self.dataSelection['a'].periodType && !self.dataSelection['b'].periodType) {
	    		self.filteredPeriodTypes = self.periodTypes;
	    		return;
	    	}

	    	var longestPeriod = longestPeriodInSelection();
	    	
	    	self.filteredPeriodTypes = [];
	    	for (var i = self.periodTypes.length-1; i >= 0; i--) {
	    		
	    		if (self.periodTypes[i].id === longestPeriod) {
	    			self.filteredPeriodTypes.push(self.periodTypes[i]);
	    			break;	
	    		}
	    		else {
	    			self.filteredPeriodTypes.push(self.periodTypes[i]);
	    		}
	    	}
	    	
	    	defaultPeriodType();
	    	self.getPeriodsInYear();
	    }
	    
	    function defaultPeriodType() {
			
			//For drop out rate we want yearly by default
			if (self.relationshipType === 'do') {
			    self.periodTypeSelected = self.filteredPeriodTypes[0];
			}
			//Otherwise we go for shortest
			else {
				self.periodTypeSelected = self.filteredPeriodTypes[self.filteredPeriodTypes.length-1];
			}    	
	    }
	    
	    
	    function longestPeriodInSelection() {
	    	var periods = [];
	    	if (self.dataSelection['a'].periodType) periods.push(self.dataSelection['a'].periodType);
	    	if (self.consistencyType === 'relation' && self.dataSelection['b'].periodType) periods.push(self.dataSelection['b'].periodType);

	    	return periodService.longestPeriod(periods);
	    }
	    
	    
  	    
  	    self.selectedPeriod = function() {
  	    	if (self.periodTypeSelected.id != 'Yearly') return self.periodSelected;
  	    	else return self.yearSelected;
  	    };
  	    
		
		
		/** REQUEST DATA */		
		self.doAnalysis = function(ouBoundary, level) {
			
			//Collapse open panels
			$('.panel-collapse').removeClass('in');

			self.mainResult = undefined;
			self.result = undefined;
			self.chartSelected = {};
			self.chart = {};
			
			var analysisType = self.consistencyType;
			var relationType = self.relationshipType;
			var trendType = self.trendType;
			var criteria = self.consistencyCriteria;


			var period = self.selectedPeriod().id;
			var dxA = self.selectedData('a').id;
			var ouBoundary = ouBoundary ? ouBoundary : self.boundaryOrgunitSelected.id;
			var ouLevel = level ? level : self.orgunitLevelSelected.level;
			var ouGroup = null;//TODO			
			
			if (!level && self.orgunitLevelSelected) {
				ouLevel = self.orgunitLevelSelected.level;
				console.log("Depth: " + (ouLevel-self.boundaryOrgunitSelected.level));
			}
			self.req = true;
			
			//1 Relation
			if (analysisType === 'relation') {	
				var dxB = self.selectedData('b').id;
				dataAnalysisService.dataConsistency(receiveRelationResult, relationType, criteria, null, dxA, dxB, period, ouBoundary, ouLevel);
			}
			//2 Over time
			else {
				var refPeriods = periodService.precedingPeriods(period, self.periodCountSelected.value);
				
				dataAnalysisService.timeConsistency(receiveTimeResult, self.trendType, criteria, null, dxA, null, period, refPeriods, ouBoundary, ouLevel);
				
			}
			
		};
		
		
		function dataForSelectedUnit(ouID) {
					
			var periodType = longestPeriodInSelection();

			if (self.consistencyType === 'relation') {
				var periods = periodService.getSubPeriods(self.selectedPeriod().id.toString(), periodType);
				var dxA = self.selectedData('a').id;
				var dxB = self.selectedData('b').id;	
				
				visualisationService.multiBarChart(receiveDetailChart, [dxA, dxB], periods, [ouID], 'dataOverTime');
				
			}
			else {
				var periods = periodService.precedingPeriods(self.selectedPeriod().id.toString(), self.periodCountSelected.value);
				periods.push(self.mainResult.pe);
				
				var dxA = self.selectedData('a').id;
				
				visualisationService.multiBarChart(receiveDetailChart, [dxA], periods, [ouID], 'dataOverTime');
				
				self.chartSelected.options = null;
				self.chartSelected.data = null;
			}
			
		}
		
		var receiveDetailChart = function(chartData, chartOptions) {		
			chartOptions.chart.title = {
				'enable': true,
				'text': 'Reporting over time'
			};
			chartOptions.chart.margin.left = 60;
			chartOptions.chart.margin.bottom = 40;
				
			self.chartSelected.options = chartOptions;
			self.chartSelected.data = chartData; 
				
		};
				
	
		
		/**
		RESULTS
		*/
		
		var receiveRelationResult = function(result, errors) {
			
			self.req = false;
			
			self.chart.data = null;
			self.chart.options = null;
						
			
			if (result.type === 'do') 
				visualisationService.makeDropoutRateChart(null, result);
			else {
				visualisationService.makeDataConsistencyChart(null, result);	
			}
			
			result.chartOptions.chart.height = 375;
			self.chart.data = result.chartData;
			self.chart.options = result.chartOptions;
			
			
			self.tableData = [];
			for (var i = 0; i < result.subunitDatapoints.length; i++) {
				if (result.subunitDatapoints[i].value && result.subunitDatapoints[i].refValue) {
					self.tableData.push(result.subunitDatapoints[i]);
				}
			}
			
			
			
			self.mainResult = result;
			
			self.currentPage = 1;
			self.pageSize = 10;   	
			self.totalRows = self.tableData.length;
			
			self.sortByColumn('weight');
			self.reverse = true;
			
			//Look for click events in chart
			$(document).on("click", "#mainChart", function(e) {
			     
			     var item = e.target.__data__;
			     if( Object.prototype.toString.call(item) === '[object Object]' ) {
			         if (item.hasOwnProperty('series') && item.hasOwnProperty('point')) {
			         	itemClicked(item.series, item.point);
			         }
			     }
			     
			});
			
			self.updateCharts();
		};
		
		var receiveTimeResult = function(result, errors) {
			
			self.req = false;

			visualisationService.makeTimeConsistencyChart(null, result);
			
			//Adjust size to be same as table
			result.chartOptions.chart.height = 375;
			
			//Display chart
			self.chart.data = result.chartData;
			self.chart.options = result.chartOptions;		
			
			
			self.tableData = [];
			for (var i = 0; i < result.subunitDatapoints.length; i++) {
				if (result.subunitDatapoints[i].value && result.subunitDatapoints[i].refValue) {
					self.tableData.push(result.subunitDatapoints[i]);
				}
			}
			
			self.mainResult = result;
			
			self.currentPage = 1;
			self.pageSize = 10;   	
			self.totalRows = self.tableData.length;
			
			self.sortByColumn('weight');
			self.reverse = true;
			
			//Look for click events in chart
			$(document).on("click", "#mainChart", function(e) {
			     
			     var item = e.target.__data__;
			     if( Object.prototype.toString.call(item) === '[object Object]' ) {
			         if (item.hasOwnProperty('series') && item.hasOwnProperty('point')) {
			         	itemClicked(item.series, item.point);
			         }
			     }
			     
			});
			
			self.updateCharts();
		};
		
		
	
		self.title = function () {
			var title = "";
			if (self.consistencyType === 'relation') {			
				if (self.relationshipType === 'eq') {
					title += self.selectedData('a').name + " ≈ " + self.selectedData('b').name + ". " + periodService.shortPeriodName(self.selectedPeriod().id);
				}
				if (self.relationshipType === 'aGTb') {
					title += self.selectedData('a').name + " > " + self.selectedData('b').name + ". " + periodService.shortPeriodName(self.selectedPeriod().id);
				}
				if (self.relationshipType === 'do') {
					title += self.selectedData('a').name + " - " + self.selectedData('b').name + " dropout. " + periodService.shortPeriodName(self.selectedPeriod().id);
				}
			}
			else {
				title += self.selectedData('a').name + ' consistency over time. ' + periodService.shortPeriodName(self.selectedPeriod().id) + ' against ' + self.periodCountSelected.name + ' preceding periods';
			}
			
			return title;
		};
				
       	
	   	
	   	/** TABLE LAYOUT */
	   	self.sortByColumn = function (columnKey) {
	   		self.currentPage = 1;
	   		if (self.sortCol === columnKey) {
	   			self.reverse = !self.reverse;
	   		}
	   		else {
	   			self.sortCol = columnKey;
	   			self.reverse = true;
	   		}
	   	};
	   	
	   	self.isOutlier = function (value, stats) {
	   		if (value === null || value === '') return false;
	   		
   			var standardScore = Math.abs(mathService.calculateStandardScore(value, stats));
   			var zScore = Math.abs(mathService.calculateZScore(value, stats));
   			
   			if (standardScore > 2 || zScore > 3.5) return true;
   			else return false;
   		};
   		
	   	
   		self.updateFilter = function() {
   			self.filteredRows = [];
   			for (var i = 0; i < self.result.rows.length; i++) {
   				if (includeRow(self.result.rows[i])) {
   					self.filteredRows.push(self.result.rows[i]);
   				}
   			}
   			
   			//Store paging variables
   			self.currentPage = 1;
   			self.pageSize = 10;   	
   			self.totalRows = self.filteredRows.length;
   		};

   		
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
   		
   		
	   	
	   	/**INTERACTIVE FUNCTIONS*/
	   	
	   	
	   	function itemClicked(seriesIndex, pointIndex) {	   		
	   		var orgunitID = self.chart.data[seriesIndex].values[pointIndex].z;
	   		
	   		for (var i = 0; i < self.tableData.length; i++) {
	   			if (self.tableData[i].id === orgunitID) {
	   				self.selectOrgunit(self.tableData[i]);
	   				break;
	   			}
	   		}
	   		
	   		$scope.$apply();
	   	}
	   	
	   	
	   	self.selectOrgunit = function(item) {
	   	
	   		//Remove previous chart highlight
	   		if (self.relationshipType != 'do') {
   				var data = self.chart.data[0].values;
   				for (var i = 0; i < data.length; i++) {
   					if (data[i].z === self.selectedObject.id) {
   						data[i].size = 1;
   					}
   				}
   			}
	   	
	   		self.selectedObject.name = item.name;
	   		self.selectedObject.id = item.id;
	   		self.selectedObject.value = item.value;
	   		self.selectedObject.refValue = item.refValue;
	   		self.selectedObject.ratio = item.ratio;
	   			   		
	   		//Add new chart highlight
	   		if (self.relationshipType != 'do') {
	   			var data = self.chart.data[0].values;
	   			for (var i = 0; i < data.length; i++) {
	   				if (data[i].z === item.id) {
	   					data[i].size = 5;
	   				}
	   			}
	   		}
	   		
	   		dataForSelectedUnit(item.id);
	   		
	   		self.updateCharts();
	   	};
	   	
	   	function highlightPoint() {}
	   	
        
        self.sendMessage = function(row) {
        	        	
        	var modalInstance = $modal.open({
	            templateUrl: "views/_modals/outlierGapMessage.html",
	            controller: "ModalMessageController",
	            controllerAs: 'mmCtrl',
	            resolve: {
	    	        orgunitID: function () {
	    	            return row.id;
	    	        },
	    	        orgunitName: function () {
	    	            return row.name;
	    	        }
	            }
	        });
	
	        modalInstance.result.then(function (result) {
	        });
        };
        
        
        self.drillDown = function (item) {
        	
        	var requestURL = "/api/organisationUnits/" + item.id + ".json?fields=level";
        	requestService.getSingle(requestURL).then(function (response) {
        		
        		
        		var level = response.data.level;
        		if (level === lowestLevel()) {
        			console.log("Not possible to drill down");
        			return;
        		}
        		
        		self.doAnalysis(item.id, (1 + level));
        		
        		
        		
          	});
        	
        	
        };

        
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
        	
        	
        };
        
        
        function getDataItem(ouID) {
        	
        	for (var i = 0; i < self.mainResult.subunitDatapoints.length; i++) {
        		if (self.mainResult.subunitDatapoints[i].id === ouID) {
        			return self.mainResult.subunitDatapoints[i];
        		}
        	}
        
        }
        	   	
	   	
	   	/** UTILITIES */
	   	function uniqueArray(array) {
	   	    var seen = {};
	   	    return array.filter(function(item) {
	   	        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
	   	    });
	   	}
	   	
	   	self.validRatio = function(ratio) {
	   		if (!isNaN(ratio) && isFinite(ratio)) return true;
	   		else return false;
	   	
	   	};
	   	
	   	self.updateCharts = function() {
	   		$timeout(function () { window.dispatchEvent(new Event('resize')); }, 100);
	   	};
	   	
	   	self.dropoutRate = function(valueA, valueB) {
	   		
	   		return mathService.round(100*(valueA-valueB)/valueA, 2);
	   		
	   	};
	   	        
		init();
    	
		return self;
	});
	
})();

