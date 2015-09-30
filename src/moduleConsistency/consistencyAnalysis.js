
(function(){
	
	angular.module('consistencyAnalysis', []);

	angular.module('consistencyAnalysis').filter('startFrom', function() {
	    return function(input, start) {
	        start = +start; //parse to int
	        if (input) return input.slice(start);
	        else return input;
	    }
	});

	angular.module('consistencyAnalysis').controller("ConsistencyAnalysisController",
	['d2Meta', 'd2Utils', 'periodService', 'requestService', 'dataAnalysisService', 'visualisationService', 'mathService',
		'$modal', '$timeout', '$scope',
	function(d2Meta, d2Utils, periodService, requestService, dataAnalysisService, visualisationService, mathService,
			 $modal, $timeout, $scope) {
		var self = this;

		//Variables for storing result and result history
	    self.result = undefined;
		self.results = [];
		self.maxResults = 5;
		self.currentResult = null;

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
			self.relationshipType = 'level';
			self.trendType = 'constant';
			self.consistencyCriteria = 20;
			
	    	self.dataSelection = {
				deGroups: [],
				inGroups: [],
	    		'a': {
					groups: [], 		//list of groups
					group: undefined,	//selected group
					itemDescription: '',//Placeholder for item dropdown
					items: [],			//list of items in selected group
					item: undefined,	//selected item
	    			type: 'de',			//item type
					periodType: undefined
	    		},
	    		'b': {
					groups: [], 		//list of groups
					group: undefined,	//selected group
					itemDescription: '',//Placeholder for item dropdown
					items: [],			//list of items in selected group
					item: undefined,	//selected item
					type: 'de',			//item type
					periodType: undefined
	    		}
			};


			d2Meta.objects('dataElementGroups').then(function(data) {
	    		self.dataSelection.deGroups = data;
	    	});
			d2Meta.objects('indicatorGroups').then(function(data) {
				self.dataSelection.inGroups = data;
			});
			
	    	
	    	//ORGUNITS
	    	self.analysisOrgunits = [];
	    	self.userOrgunits = [];
	    	self.boundaryOrgunitSelected = undefined;
	    	
	    	self.ouSelected = null;
	    	self.ouSearchResult = [];
	    		    	
	    	d2Meta.userOrgunits().then(
				function(data) {
					self.userOrgunits = data;
					self.boundarySelectionType = 0;
					self.boundaryOrgunitSelected = self.userOrgunits[0];
					self.filterLevels();
					self.orgunitUserDefaultLevel();
	    		}
			);
	    	
	    	self.orgunitLevels = [];
	    	self.filteredOrgunitLevels = [];
	    	self.orgunitLevelSelected = undefined;
			d2Meta.objects('organisationUnitLevels', null, 'name,id,level').then(
				function(data) {
					self.orgunitLevels = data;

					self.lowestLevel = 0;
					for (var i = 0; i < self.orgunitLevels.length; i++) {
						var level = self.orgunitLevels[i].level;
						if (level > self.lowestLevel) self.lowestLevel = level;
					}

					self.filterLevels();
					self.orgunitUserDefaultLevel();
	    		}
			);
	    	
	    	
	    	self.orgunitGroups = [];
	    	self.orgunitGroupSelected = undefined;
			d2Meta.objects('organisationUnitGroups').then(function(data) {
	    		self.orgunitGroups = data;
	    	});
	    	
	    	
	    	//PERIODS
	    	self.periodTypes = [];
	    	self.periodTypes = periodService.getPeriodTypes();
	    	self.periodTypeSelected = self.periodTypes[4];
			self.filteredPeriodTypes = [];
			updatePeriodParameters();
	    	
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

			initWathcers();
			ouTreeInit();
	    }

		function ouTreeInit() {
			self.ouTreeData = [];
			self.ouTreeControl = {};

			//Get initial batch of orgunits and populate

			d2Meta.userAnalysisOrgunits().then(function(data) {

				//Iterate in case of multiple roots
				for (var i = 0; i < data.length; i++) {
					var ou = data[i];
					var root = {
						label: ou.name,
						data: {
							ou: ou
						},
						children: []
					}

					ou.children.sort(sortName);

					for (var j = 0; ou.children && j < ou.children.length; j++) {

						var child = ou.children[j];

						root.children.push({
							label: child.name,
							data: {
								ou: child
							},
							noLeaf: child.children
						});
					}

					self.ouTreeData.push(root);
					self.ouTreeControl.select_first_branch();
					self.ouTreeControl.expand_branch(self.ouTreeControl.get_selected_branch());

				}
			});

		}


		self.ouTreeSelect = function(orgunit) {
			if (orgunit.noLeaf && orgunit.children.length < 1) {

				//Get children
				d2Meta.object('organisationUnits', orgunit.data.ou.id, 'children[name,id,children::isNotEmpty]').then(
					function (data) {
						var children = data.children;
						for (var i = 0; i < children.length; i++) {
							var child = children[i];
							if (!orgunit.children) orgunit.children = [];
							orgunit.children.push({
								label: child.name,
								data: {
									ou: child
								},
								noLeaf: child.children
							});

						}
					}
				);
			}
			//Cannot use leaf for consistency analysis, so use level above if selecting leaf
			if (!orgunit.noLeaf) {
				orgunit = self.ouTreeControl.get_parent_branch(orgunit);
			}
			self.boundaryOrgunitSelected = orgunit.data.ou;
			self.filterLevels();
			self.orgunitUserDefaultLevel();
		}



		function initWathcers() {
			//Watch for changes in data selection type, clear selection if changing from data element to indicator etc
			$scope.$watchCollection(function() { return self.dataSelection.a.type; },
				function(newObject, oldObject) {
					if (oldObject && newObject && oldObject != newObject) {
						self.dataSelection.a.item = undefined;
						self.dataSelection.a.itemDescription = '';
						self.dataSelection.a.group = undefined;
					}
				}
			);
			$scope.$watchCollection(function() { return self.dataSelection.b.type; },
				function(newObject, oldObject) {
					if (oldObject && newObject && oldObject != newObject) {
						self.dataSelection.b.item = undefined;
						self.dataSelection.b.itemDescription = '';
						self.dataSelection.b.group = undefined;
					}
				}
			);
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
		

		
		/** Data */
		self.getGroupForCode = function(code) {
			if (self.dataSelection[code].type === 'ind') {
				return self.dataSelection.inGroups;
			}
			else {
				return self.dataSelection.deGroups;
			}
		}


	    self.updateItemList = function(code) {

			if (!self.dataSelection[code].group) {
				self.dataSelection[code].itemDescription = '';
				return;
			}

	    	self.dataSelection[code].items = [];
	    	self.dataSelection[code].item = undefined;
			self.dataSelection[code].itemDescription = 'Loading...';

			if (self.dataSelection[code].type === 'de') {
				d2Meta.object('dataElementGroups', self.dataSelection[code].group.id, 'name,id,dataElements[name,id]').then(
					function(data) {
						self.dataSelection[code].itemDescription  = 'Select data element...';
						self.dataSelection[code].items = data.dataElements;
						d2Utils.arraySortByProperty(self.dataSelection[code].items, 'name', false);
					}
				);
			}
			else if (self.dataSelection[code].type === 'dc') {
				var filter = 'dataElement.dataElementGroups.id:eq:' + self.dataSelection[code].group.id;
				var fields = 'name,id,dataElementId,optionComboId';
				d2Meta.objects('dataElementOperands', null, fields, filter).then(function(data) {
						self.dataSelection[code].itemDescription  = "Select data element...";
						self.dataSelection[code].items = data;
						d2Utils.arraySortByProperty(self.dataSelection[code].items, 'name', false);
					});
			}
			else {
				d2Meta.object('indicatorGroups', self.dataSelection[code].group.id, 'name,id,indicators[name,id]').then(
					function(data) {
						self.dataSelection[code].itemDescription  = "Select indicator...";
						self.dataSelection[code].items = data.indicators;
						d2Utils.arraySortByProperty(self.dataSelection[code].items, 'name', false);
					}
				);
			}
	    };

		

		/**
		 * Get data element id for the selection box with the given code
		 * @param code
		 */
		function dataElementIDForCode(code) {
			var item = self.dataSelection[code].item;
			if (item.hasOwnProperty('dataElementId')) { //I.e. data element operand
				return item.dataElementId;
			}
			else {
				return item.id;
			}
		}


        //item a or b
        self.dataItemForCode = function(code) {
      	    
      	    //var get data id(s)
      	    return self.dataSelection[code].item;
        };
	      	
	    
	    /** Periods */
		self.updatePeriodList = function (code) {
			var dataType = self.dataSelection[code].type;
			if (!self.dataSelection[code].item) {
				return;
			}
			else if (dataType === 'de' || dataType === 'dc') {

				var dataElementID = dataElementIDForCode(code);

				d2Meta.object('dataElements', dataElementID, 'dataSets[periodType]').then(
					function (data) {
						if (!data.dataSets && data.dataSets.length > 1) return;
						self.dataSelection[code].periodType = data.dataSets[0].periodType;
						updatePeriodParameters();
					}
				);
			}
			else {
				var indicatorID = self.dataItemForCode(code).id;
				d2Meta.indicatorPeriodType(indicatorID).then(
					function (data) {
						self.dataSelection[code].periodType = data;
						updatePeriodParameters();
					}
				);
			}
		};
		


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

	    
	    function updatePeriodParameters() {

			var periodsForRelation = self.dataSelection['a'].periodType && self.dataSelection['b'].periodType;
			var periodsForTime = self.dataSelection['a'].periodType;

			if ((self.consistencyType === 'relation' && !periodsForRelation) || (self.consistencyType && !periodsForTime)) {
				self.filteredPeriodTypes = self.periodTypes;
				return;
			}

	    	var longestPeriodType = longestPeriodInSelection();
	    	
	    	self.filteredPeriodTypes = [];
	    	for (var i = self.periodTypes.length-1; i >= 0; i--) {
	    		
	    		if (self.periodTypes[i].id === longestPeriodType) {
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

			//TODO: Should use result, not parameters

	    	var periods = [];
	    	if (self.dataSelection['a'].periodType) periods.push(self.dataSelection['a'].periodType);
	    	if (self.consistencyType === 'relation' && self.dataSelection['b'].periodType) periods.push(self.dataSelection['b'].periodType);

	    	return periodService.longestPeriod(periods);
	    }


		function selectedPeriod() {
  	    	if (self.periodTypeSelected.id != 'Yearly') return self.periodSelected;
  	    	else return self.yearSelected;
  	    };
  	    

		/** REQUEST DATA */		
		self.doAnalysis = function(ouBoundary, level) {
			
			//Collapse open panels
			angular.element('.panel-collapse').removeClass('in');
			angular.element('.panel-collapse').addClass('collapse');

			self.result = undefined;
			if (self.results.length > 1) self.results.move(self.currentResult, 0);

			self.chartSelected = {};
			self.chart = {};
			
			var analysisType = self.consistencyType;
			var relationType = self.relationshipType;
			var trendType = self.trendType;
			var criteria = self.consistencyCriteria;


			var period = selectedPeriod().id;
			var dxA = self.dataItemForCode('a').id;
			var ouBoundary = ouBoundary ? ouBoundary : self.boundaryOrgunitSelected.id;
			var ouLevel = level ? level : (self.orgunitLevelSelected ? self.orgunitLevelSelected.level : null);
			var ouGroup = ouLevel ? null : self.orgunitGroupSelected.id; //if we have level, ignore group
			
			if (!level && self.orgunitLevelSelected) {
				ouLevel = self.orgunitLevelSelected.level;
				console.log("Depth: " + (ouLevel-self.boundaryOrgunitSelected.level));
			}
			self.req = true;
			
			//1 Relation
			if (analysisType === 'relation') {	
				var dxB = self.dataItemForCode('b').id;
				dataAnalysisService.dataConsistency(receiveRelationResult, relationType, criteria, null, dxA, dxB, period, ouBoundary, ouLevel, ouGroup);
			}
			//2 Over time
			else {
				var refPeriods = periodService.precedingPeriods(period, self.periodCountSelected.value);
				
				dataAnalysisService.timeConsistency(receiveTimeResult, self.trendType, criteria, null, dxA, null, period, refPeriods, ouBoundary, ouLevel, ouGroup);
				
			}
			
		};
		
		
		function dataForSelectedUnit(ouID) {
					
			var periodType = longestPeriodInSelection();

			if (self.consistencyType === 'relation') {
				var periods = [self.result.pe.toString()];
				var dxA = self.result.dxIDa;
				var dxB = self.result.dxIDb;
				
				visualisationService.multiBarChart(receiveDetailChart, [dxA, dxB], periods, [ouID], 'dataOverTime');
				
			}
			else {
				var periods = self.result.refPe.slice();
				periods.push(self.result.pe.toString());
				var dx = self.result.dxID;
				
				visualisationService.multiBarChart(receiveDetailChart, [dx], periods, [ouID], 'dataOverTime');
				
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
		
		function receiveRelationResult(result, errors) {

			result.consistencyType = 'relation';

			//Save result
			self.currentResult = 0;
			self.results.unshift(result);

			//Only keep 5
			if (self.results.length > 5) self.results.pop();

			prepareResult();
		};

		
		function receiveTimeResult(result, errors) {
			
			self.req = false;

			self.result = result;
			self.result.consistencyType = 'time';

			self.currentResult = 0;
			self.results.unshift(result);

			//Only keep 5
			if (self.results.length > 5) self.results.pop();

			prepareResult();
		};


		function prepareResult() {
			self.result = self.results[self.currentResult];
			self.req = false;

			//self.chart.data = null;
			//self.chart.options = null;


			self.tableData = [];
			for (var i = 0; i < self.result.subunitDatapoints.length; i++) {
				self.tableData.push(self.result.subunitDatapoints[i]);

			}

			self.currentPage = 1;
			self.pageSize = 10;
			self.totalRows = self.tableData.length;

			self.sortByColumn('weight');
			self.reverse = true;



			if (self.result.consistencyType === 'relation') {
				if (self.result.type === 'do')
					visualisationService.makeDropoutRateChart(null, self.result);
				else {
					visualisationService.makeDataConsistencyChart(null, self.result);
				}
			}
			else {
				visualisationService.makeTimeConsistencyChart(null, self.result, null);
			}

			//Display chart
			self.chart.data = self.result.chartData;
			self.chart.options = self.result.chartOptions;
			self.chart.options.chart.height = 375;

			//Look for click events in chart
			$(document).on("click", "#mainChart", function(e) {
				var item = e.target.__data__;
				if( Object.prototype.toString.call(item) === '[object Object]' ) {
					if (item.hasOwnProperty('series') && item.hasOwnProperty('point')) {
						itemClicked(item.series, item.point);

						//TODO: Workaround for tooltip getting re-created rather than re-used
						var elements = angular.element('.nvtooltip');
						for (var i = 0; i < elements.length - 1; i++) {
							elements[i].remove(); //Keep under 2 - rest is old
						}
					}
				}
			});

		}


		self.previousResult = function() {
			self.currentResult++;
			prepareResult();
		};
		
	
		self.title = function () {
			var title = "";
			if (self.result.consistencyType === 'relation') {
				if (self.result.type === 'level') {
					title += self.result.dxNameA + " to " + self.result.dxNameB + " ratio. " +
						self.resultPeriodName() + '.';
				}
				if (self.result.type === 'eq') {
					title += self.result.dxNameA + " ≈ " + self.result.dxNameB + ". " +
						self.resultPeriodName() + '.';
				}
				if (self.result.type === 'aGTb') {
					title += self.result.dxNameA + " > " + self.result.dxNameB + ". " +
						self.resultPeriodName() + '.';
				}
				if (self.result.type === 'do') {
					title += self.result.dxNameA + " to " + self.result.dxNameB + " dropout. " +
						self.resultPeriodName() + '.';
				}
			}
			else {
				title += self.result.dxName + ' consistency over time. ' +
					self.resultPeriodName() + ' against ' + self.resultReferencePeriodNames().length + ' preceding periods.';
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

		self.ratioDescription = function() {
			var description = "";
			if (self.result.consistencyType === 'relation') {
				if (self.result.type === 'do') {
					description += "Dropout rate from " + self.result.dxNameA + " to " + self.result.dxNameB + ".";
				}
				else {
					description += "Ratio between " + self.result.dxNameA + " and " + self.result.dxNameB + ".";
				}
			}
			else {
				description += "Ratio between the selected period and preceding periods.";
			}

			return description;
		}

		self.resultPeriodName = function() {
			return periodService.shortPeriodName(self.result.pe);

		}

		self.resultReferencePeriodNames = function() {
			var periodNames = [];
			for (var i = 0; i < self.result.refPe.length; i++) {
				periodNames.push(periodService.shortPeriodName(self.result.refPe[i]));
			}

			return periodNames;

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

	   	};
	   	
	   	function highlightPoint() {}
	   	
        
        self.sendMessage = function(row) {
        	        	
        	var modalInstance = $modal.open({
	            templateUrl: "appCommons/modalMessage.html",
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
					var modalInstance = $modal.open({
						templateUrl: "appCommons/modalNotification.html",
						controller: "ModalNotificationController",
						controllerAs: 'nCtrl',
						resolve: {
							title: function () {
								return "Warning";
							},
							message: function () {
								return "Not possible to drill down, " + self.selectedObject.name + " has no children.";
							}
						}
					});

					modalInstance.result.then(function (result) {
					});
        			return;
        		}
        		self.selectedObject = {};
        		self.doAnalysis(item.id, (1 + level));

          	});
        };


		self.exportCSV = function() {
			var fileContent = getFileContent();
			var modalInstance = $modal.open({
				templateUrl: "appCommons/modalExport.html",
				controller: "ModalExportController",
				controllerAs: 'exportCtrl',
				resolve: {
					fileContent: function () {
						return fileContent;
					},
					fileName: function () {
						return 'Consistency analysis';
					}
				}
			});

			modalInstance.result.then(function (result) {
				console.log("Export done");
			});

		}


		self.sendMessage = function(metaData) {

			var modalInstance = $modal.open({
				templateUrl: "appCommons/modalMessage.html",
				controller: "ModalMessageController",
				controllerAs: 'mmCtrl',
				resolve: {
					orgunitID: function () {
						return self.selectedObject.id;
					},
					orgunitName: function () {
						return self.selectedObject.name;
					}
				}
			});

			modalInstance.result.then(function (result) {
			});
		};


        	   	
	   	
	   	/** UTILITIES */
		function getFileContent() {
			var headers = [];
			var rows = [];

			headers = headers.concat(["Orgunit"]);

			if (self.result.consistencyType === 'relation') {
				if (self.result.type != 'do') {
					headers = headers.concat([self.result.dxNameA, self.result.dxNameB, 'Ratio']);
				}
				else {
					headers = headers.concat([self.result.dxNameA, self.result.dxNameB, 'Dropout rate (%)']);
				}
			}
			else {
				headers = headers.concat([
					self.result.dxName + ' - ' + self.resultPeriodName(),
					self.result.dxName + (self.result.type === 'constant'
						? ' - average of ' + self.resultReferencePeriodNames().join(' ,')
						: ' - forecast from ' + self.resultReferencePeriodNames().join(' ,')),
					'Ratio']);
			}

			headers = headers.concat(["Weight"]);




			var data = self.result.subunitDatapoints;
			for (var i = 0; i < data.length; i++) {
				var row = [];
				var value = data[i];
				row.push(value.name);
				row.push(value.value);
				row.push(value.refValue);

				if (self.result.type === 'do') {
					row.push(self.dropoutRate(value.value, value.refValue));
				}
				else {
					row.push(value.ratio);
				}
				row.push(value.weight);

				rows.push(row);
			}

			rows.sort(function(a, b) {
				return b[4] - a[4];
			});

			//Add boundary to top of export
			var boundaryRow = [self.result.boundaryName + ' (boundary)', self.result.boundaryValue, self.result.boundaryRefValue];
			if (self.result.type === 'do') {
				boundaryRow.push(self.dropoutRate(self.result.boundaryValue, self.result.boundaryRefValue));
			}
			else {
				boundaryRow.push(self.result.boundaryRatio);
			}
			boundaryRow.push(''); //weight
			rows.unshift(boundaryRow);

			return {
				headers: headers,
				rows: rows
			};
		};


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


	   	self.dropoutRate = function(valueA, valueB) {
	   		if (valueA === valueB) return 0.0;
	   		return mathService.round(100*(valueA-valueB)/valueA, 1);
	   		
	   	};


		function sortName(a, b) {
			return a.name > b.name ? 1 : -1;
		}

		init();
    	
		return self;
	}]);
	
})();

