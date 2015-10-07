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


		function getData() {
			var dx = [];
			d2Utils.arrayMerge(dx, self.selectedData.ds);
			d2Utils.arrayMerge(dx, self.selectedData.deg);
			d2Utils.arrayMerge(dx, self.selectedData.ig);
			d2Utils.arrayRemoveDuplicates(dx, 'id');
			return dx;
		}


		self.doAnalysis = function () {

			//Collapse open panels
			angular.element('.panel-collapse').removeClass('in');
			angular.element('.panel-collapse').addClass('collapse');


			//Clear previous result
			self.result = undefined;
			if (self.results.length > 1) self.results.move(self.currentResult, 0);

			var dx = getData();
			var ouBoundary = self.selectedOrgunit.boundary;
			var ouLevel = self.selectedOrgunit.level;
			var ouGroup = self.selectedOrgunit.group;

			var dxIDs = d2Utils.arrayProperties(dx, 'id');
			var periods = getPeriods();

			dataAnalysisService.outlierGap(receiveResult, dxIDs, null, null, periods, [ouBoundary.id],
				ouLevel ? ouLevel.level : null, ouGroup ? ouGroup.id : null, 2, 3.5, 1);

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