(function() {

	angular.module('outlierGapAnalysis').controller("OutlierGapAnalysisController",
	['d2Meta', 'd2Utils', 'periodService', 'requestService', 'dataAnalysisService', '$scope', '$modal',
	function(d2Meta, d2Utils, periodService, requestService, dataAnalysisService, $scope, $modal) {

		var self = this;

		self.results = [];
		self.currentResult = undefined;
		self.result = undefined;

		self.itemsPerPage = 25;
		self.hasVisual = false;

		self.processStatus = dataAnalysisService.status;

		init();

		function init() {
			self.showFilter = false;

			self.selectedData = {
				ds: [],
				deg: [],
				ig: []
			};
			self.selectedOrgunit;

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

			//Accordion settings
			self.oneAtATime = true;
			self.status = {
				isFirstOpen: true
			};
		}

		/** -- PARAMETER SELECTION -- */

		/** Orgunits */



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
					startDate = moment().subtract(self.periodCountSelected.value * 2, 'months').format("YYYY-MM-DD");
				}
				else if (self.periodTypeSelected.id === 'Quarterly') {
					startDate = moment().subtract(self.periodCountSelected.value, 'quarters').format("YYYY-MM-DD");
				}
				else if (self.periodTypeSelected.id === 'SixMonthly') {
					startDate = moment().subtract(self.periodCountSelected.value * 2, 'quarters').format("YYYY-MM-DD");
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
			return array.filter(function (item) {
				return seen.hasOwnProperty(item) ? false : (seen[item] = true);
			});
		}


		self.doAnalysis = function () {

			//Collapse open panels
			angular.element('.panel-collapse').removeClass('in');
			angular.element('.panel-collapse').addClass('collapse');


			//Clear previous result
			self.result = undefined;
			if (self.results.length > 1) self.results.move(self.currentResult, 0);


			console.log(self.selectedOrgunit);
			console.log(self.selectedData);
			return;

			var data = getDataForAnalysis();
			var variables = data.dataIDs;
			var periods = getPeriods();

			//If dataset, include all optioncombos
			var coAll = false;
			if (self.datasetSelected) coAll = true;

			var ouGroup = null;
			if (self.orgunitGroupSelected) ouGroup = self.orgunitGroupSelected.id;

			var ouLevel = null;
			if (self.orgunitLevelSelected) {
				ouLevel = self.orgunitLevelSelected.level;
				var depth = (ouLevel - self.boundaryOrgunitSelected.level);
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
						dataAnalysisService.outlierGap(receiveResult, variables, coAll, data.coFilter, periods, ouIDs, ouLevel, ouGroup, 2, 3.5, 1);

					});
				}
				else {
					dataAnalysisService.outlierGap(receiveResult, variables, coAll, data.coFilter, periods, [self.boundaryOrgunitSelected.id], ouLevel, ouGroup, 2, 3.5, 1);
				}
			}
			else {
				dataAnalysisService.outlierGap(receiveResult, variables, coAll, data.coFilter, periods, [self.boundaryOrgunitSelected.id], ouLevel, ouGroup, 2, 3.5, 1);
			}


			self.datasetDataelements = null;
		};


		/** UTILITIES */

		//Directive will add its function here:
		self.resultControl = {};
		function receiveResult(result) {
			self.resultControl.receiveResult(result);
		}

		return self;
	}]);
})();