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
	['d2Meta', 'd2Utils', 'dqAnalysisConsistency', 'periodService', 'visualisationService', 'mathService',
		'$uibModal', '$timeout', '$scope',
	function(d2Meta, d2Utils, dqAnalysisConsistency, periodService, visualisationService, mathService,
			 $uibModal, $timeout, $scope) {
		var self = this;

		//Variables for storing result and result history
	    self.result = undefined;
		self.results = [];
		self.maxResults = 5;
		self.currentResult = null;

	    self.itemsPerPage = 25;
	    self.hasVisual = false;
	    self.req = false;

	         	    
		function init() {		
			self.alerts = [];
			self.chart = {};
			self.chartSelected = {};
			
			self.selectedObject = {};

			self.dataSelectedA = null;
			self.dataSelectedA = null;
			self.selectedOrgunit = {};

	    	//PERIODS
	    	self.periodTypes = [];
	    	self.periodTypes = periodService.getPeriodTypes();
			self.filteredPeriodTypes = self.periodTypes;//TODO: temporary?
	    	self.periodTypeSelected = self.periodTypes[4]; //Default yearly
			self.currentPeriodType = self.periodTypes[1].id; //Default monthly

	    	self.periodCountSelected = 3;
			
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


	
		/** PARAMETER SELECTION **/

	    /** Periods */
		self.updatePeriodType = function (selectedItem) {

			var id = selectedItem.id;

			if (self.dataTypeSelectedA === 'dataElements') {

				d2Meta.object('dataElements', id.substring(0,11), 'dataSets[periodType]').then(
					function (data) {
						if (!data.dataSets && data.dataSets.length > 1) return;
						self.currentPeriodType = data.dataSets[0].periodType;
					}
				);
			}
			else {
				d2Meta.indicatorPeriodType(id).then(
					function (data) {
						self.currentPeriodType = data;
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



		function selectedPeriod() {
  	    	if (self.periodTypeSelected.id != 'Yearly') return self.periodSelected;
  	    	else return self.yearSelected;
  	    };
  	    



		/** REQUEST DATA **/

		self.doAnalysis = function(boundary, level) {
			
			//Collapse open panels
			angular.element('.panel-collapse').removeClass('in');
			angular.element('.panel-collapse').addClass('collapse');


			self.selectedObject = {};
			self.result = undefined;
			if (self.results.length > 1) self.results.move(self.currentResult, 0);

			self.chartSelected = {};
			self.chart = {};
			
			var analysisType = self.type;
			var relationType = self.comparisonType === 'level' ? 'level' : self.subType;
			var trendType = self.trendType;
			var criteria = self.consistencyCriteria;
			var comparison = self.comparisonType === 'level' ? 'ou' : 'th';


			var period = selectedPeriod().id;
			var dxA = self.dataSelectedA.id;

			var ouBoundary = self.selectedOrgunit.boundary.id;
			var ouLevel = self.selectedOrgunit.level;
			var ouGroup = self.selectedOrgunit.group;

			ouLevel = ouLevel ? ouLevel.level : null;
			ouGroup = ouGroup ? ouGroup.id : null;

			if (boundary) {
				ouBoundary = boundary;
			}
			if (level) {
				ouLevel = level;
				ouGroup = null;
			}


			var maxPeriodType = {
				periodType: self.currentPeriodType
			}

			self.req = true;
			
			//1 Relation
			if (analysisType === 'data') {	
				var dxB = self.dataSelectedB.id;
				dqAnalysisConsistency.analyse(dxA, dxB, period, null, ouBoundary, ouLevel, ouGroup, 'data', relationType, null, criteria, maxPeriodType).then(
					function (data) {
						receiveResult(data.result, data.errors);
					}
				);
			}
			//2 Over time
			else {
				var refPeriods = periodService.precedingPeriods(period, self.periodCountSelected);

				dqAnalysisConsistency.analyse(dxA, null, period, refPeriods, ouBoundary, ouLevel, ouGroup, 'time', trendType, comparison, criteria, null).then(
					function (data) {
						receiveResult(data.result, data.errors);
					}
				);
			}
		};
		
		
		function dataForSelectedUnit(ouID) {


			var periods, dx = [];
			if (self.result.type === 'data') {

				var minPeriodType = self.result.meta.periodType;
				periods = periodService.getSubPeriods(self.result.pe.toString(), minPeriodType);

				dx.push(self.result.dxIDa);
				dx.push(self.result.dxIDb);

			}
			else {
				periods = self.result.peRef.slice();
				periods.push(self.result.pe.toString());
				dx.push(self.result.dxIDa);
				


			}
			visualisationService.multiBarChart(null, dx, periods, [ouID], 'dataOverTime').then(
				function (result) {
					self.chartSelected.options = result.opts;
					self.chartSelected.data = result.data;
				}


			);

			
		}




		/** RECEIVE AND PROCESS ANALYSIS RESULT **/
		
		function receiveResult(result, errors) {
			//Save result
			self.currentResult = 0;
			self.results.unshift(result);

			//Only keep 5
			if (self.results.length > 5) self.results.pop();

			prepareResult();
		};


		function prepareResult() {
			self.result = self.results[self.currentResult];
			self.req = false;


			self.tableData = [];
			for (var i = 0; i < self.result.subunitDatapoints.length; i++) {
				self.tableData.push(self.result.subunitDatapoints[i]);

			}

			self.currentPage = 1;
			self.pageSize = 10;
			self.totalRows = self.tableData.length;

			self.sortByColumn('weight');
			self.reverse = true;

			if (self.result.type === 'data') {
				if (self.result.subType === 'do')
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
						itemClicked(item.data.point[4].z);
					}
				}
			});

		}


	   	
	   	/** PRESENTATION AND TABLE LAYOUT */
		self.title = function () {
			var title = "";
			if (self.result.type === 'data') {
				if (self.result.subType === 'level') {
					title += self.result.dxNameA + " to " + self.result.dxNameB + " ratio. " +
						self.resultPeriodName() + '.';
				}
				if (self.result.subType === 'eq') {
					title += self.result.dxNameA + " ≈ " + self.result.dxNameB + ". " +
						self.resultPeriodName() + '.';
				}
				if (self.result.subType === 'aGTb') {
					title += self.result.dxNameA + " > " + self.result.dxNameB + ". " +
						self.resultPeriodName() + '.';
				}
				if (self.result.subType === 'do') {
					title += self.result.dxNameA + " to " + self.result.dxNameB + " dropout. " +
						self.resultPeriodName() + '.';
				}
			}
			else {
				title += self.result.dxNameA + ' consistency over time. ' +
					self.resultPeriodName() + ' against ' + self.resultReferencePeriodNames().length + ' preceding periods.';
			}

			return title;
		};


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
			if (self.result.type === 'data') {
				if (self.result.subType === 'do') {
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
			for (var i = 0; i < self.result.peRef.length; i++) {
				periodNames.push(periodService.shortPeriodName(self.result.peRef[i]));
			}

			return periodNames;

		}



		/**INTERACTIVE FUNCTIONS*/
		self.previousResult = function() {
			self.currentResult++;
			prepareResult();
		};


		function itemClicked(orgunitID) {
	   		for (var i = 0; i < self.tableData.length; i++) {
	   			if (self.tableData[i].id === orgunitID) {
	   				self.selectOrgunit(self.tableData[i]);
	   				break;
	   			}
	   		}
	   	}
	   	
	   	
	   	self.selectOrgunit = function(item) {

	   		//Remove previous chart highlight
	   		if (self.result.subType != 'do') {
   				for (var j = 0; j < self.chart.data.length; j++) {
					var data = self.chart.data[j].values;
					for (var i = 0; i < data.length; i++) {
						if (data[i].z === self.selectedObject.id) {
							data[i].size = 1;
							i = data.length;
							j = self.chart.data.length;
						}
					}
				}

   			}
	   	
	   		self.selectedObject.name = item.name;
	   		self.selectedObject.id = item.id;
	   		self.selectedObject.value = item.value;
	   		self.selectedObject.refValue = item.refValue;
	   		self.selectedObject.ratio = item.ratio;
	   			   		
	   		//Add new chart highlight
			if (self.result.subType != 'do') {
				for (var j = 0; j < self.chart.data.length; j++) {
					var data = self.chart.data[j].values;
					for (var i = 0; i < data.length; i++) {
						if (data[i].z === self.selectedObject.id) {
							data[i].size = 5;
							i = data.length;
							j = self.chart.data.length;
						}
					}
				}

			}

	   		dataForSelectedUnit(item.id);
	   	};


        self.drillDown = function (item) {

			d2Meta.object('organisationUnits', item.id, 'level,children::isNotEmpty').then(
				function (orgunit) {

					var hasChildren = orgunit.children;
					if (!hasChildren) {
						//TODO
						var modalInstance = $uibModal.open({
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
					self.doAnalysis(item.id, (1 + orgunit.level));

				}
			);

			//Scroll to top of main chart/table
			element = document.getElementById("mainChart")
			alignWithTop = true;
			element.scrollIntoView(alignWithTop);
        };


		self.exportCSV = function() {
			var fileContent = getFileContent();
			var modalInstance = $uibModal.open({
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


		self.sendMessage = function(item) {

			var modalInstance = $uibModal.open({
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

			if (self.result.type === 'data') {
				if (self.result.subType != 'do') {
					headers = headers.concat([self.result.dxNameA, self.result.dxNameB, 'Ratio']);
				}
				else {
					headers = headers.concat([self.result.dxNameA, self.result.dxNameB, 'Dropout rate (%)']);
				}
			}
			else {
				headers = headers.concat([
					self.result.dxName + ' - ' + self.resultPeriodName(),
					self.result.dxName + (self.result.subType === 'constant'
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

				if (self.result.subType === 'do') {
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
			if (self.result.subType === 'do') {
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


		//TODO: Move to d2?
	   	self.validRatio = function(ratio) {
	   		if (!isNaN(ratio) && isFinite(ratio)) return true;
	   		else return false;
	   	
	   	};


	   	self.dropoutRate = function(valueA, valueB) {
	   		if (valueA === valueB) return 0.0;
	   		return mathService.round(100*(valueA-valueB)/valueA, 1);
	   		
	   	};


		init();
    	
		return self;
	}]);
	
})();

