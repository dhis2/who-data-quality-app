/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

import "angular";
const moment = require("moment");

//Define module
angular.module("dashboard", ["d2", "dqAnalysis", "ui.bootstrap"]);

//Define DashboardController
angular.module("dashboard").controller("DashboardController",
	["periodService", "visualisationService", "dataAnalysisService", "notificationService", "$q", "$scope", "d2Map", "d2Meta", "dqAnalysisConsistency", "$i18next",
		function(periodService, visualisationService, dataAnalysisService, notificationService, $q, $scope, d2Map, d2Meta, dqAnalysisConsistency, $i18next) {

			var self = this;

			self.cmpLoading = false;
			self.tcLoading = false;
			self.dcLoading = false;
			self.outLoading = false;

			self.ready = false;
			self.completeness = false;
			self.consistency = false;
			self.consistencyData = false;
			self.outliers = false;
			self.orgunitLevels = [];


			/** ===== ANALYSIS ===== */

			/** COMPLETENESS */
			self.makeCompletenessCharts = function() {

				if (!self.ready) {
					return;
				}
				else if (self.cmpLoading) {
					return;
				}
				else if (self.completeness && !self.widthChanged[0]) {
					return;
				}
				else {
					self.completeness = true;
					self.widthChanged[0] = false;
				}

				var datasets = d2Map.groupDataSets(self.group.code);
				self.completenessCharts = [];
				self.expectedCompletenessCharts = datasets.length;
				var ouBoundaryID = self.selectedOrgunit.boundary.id;

				var dataset, periods, ouPeriod;
				if (datasets.length > 0) self.cmpLoading = true;
				for (let i = 0; i < datasets.length; i++) {
					dataset = datasets[i];

					periods = periodService.getISOPeriods(self.startDate, self.endDate, dataset.periodType);
					ouPeriod = periods[periods.length - 1];

					var level;
					if (self.selectedOrgunit.level) level = self.selectedOrgunit.level.level;

					var dataSetQueryID = [];
					dataSetQueryID.push(dataset.id + ".REPORTING_RATE");
					dataSetQueryID.push(dataset.id + ".REPORTING_RATE_ON_TIME");


					var promises = [];
					promises.push(promiseObject(dataset));
					promises.push(visualisationService.lineChart(null, dataSetQueryID, periods, [ouBoundaryID], "dataOverTime"));
					promises.push(visualisationService.barChart(null, [dataSetQueryID[0]], [ouPeriod], [ouBoundaryID], "ou", level));

					$q.all(promises).then(function(datas) {

						var datasetCompletenessChart = {
							name: d2Map.d2NameFromID(datas[0].id),
							id: datas[0].id,
							trendChartOptions: datas[1].opts,
							trendChartData: datas[1].data,
							ouChartOptions: datas[2].opts,
							ouChartData: datas[2].data
						};

						visualisationService.setChartYAxis(datasetCompletenessChart.trendChartOptions, 0, 100);
						datasetCompletenessChart.trendChartData[0].key = $i18next.t("Completeness");
						datasetCompletenessChart.trendChartData[1].key = $i18next.t("Timeliness");

						visualisationService.setChartLegend(datasetCompletenessChart.ouChartOptions, true);
						visualisationService.setChartYAxis(datasetCompletenessChart.ouChartOptions, 0, 100);
						datasetCompletenessChart.ouChartData[0].key = periodService.shortPeriodName(ouPeriod);

						self.completenessCharts.push(datasetCompletenessChart);

						if (self.completenessCharts.length === self.expectedCompletenessCharts) self.cmpLoading = false;

					});

				}

			};



			/** CONSISTENCY OVER TIME */
			self.makeTimeConsistencyCharts = function() {
				if (!self.ready) {
					return;
				}
				else if (self.tcLoading) {
					return;
				}
				else if (self.consistency  && !self.widthChanged[1]) {
					return;
				}
				else {
					self.consistency = true;
					self.widthChanged[1] = false;
				}

				self.consistencyCharts = [];
				self.yyReceived = 0;

				var ouBoundaryID = self.selectedOrgunit.boundary.id;
				var ouLevel;
				if (self.selectedOrgunit.level) ouLevel = self.selectedOrgunit.level.level;
				var data, endDate, startDate, periodType, yyPeriods, period, refPeriods;
				var datas = d2Map.groupNumerators(self.group.code, true);
				self.expectedConsistencyCharts = datas.length;
				if (datas.length > 0) self.tcLoading = true;
				for (let i = 0; i < datas.length; i++) {

					data = datas[i];
					periodType = d2Map.dataSets(data.dataSetID).periodType;

					refPeriods = periodService.getISOPeriods(self.startDate, self.endDate, periodType);
					period = refPeriods.pop();

					yyPeriods = [];
					startDate = self.startDate;
					endDate = self.endDate;
					yyPeriods.push(periodService.getISOPeriods(startDate, endDate, periodType));
					for (let j = 0; j < 2; j++) {
						startDate = moment(startDate).subtract(1, "year");
						endDate = moment(endDate).subtract(1, "year");
						yyPeriods.push(periodService.getISOPeriods(startDate, endDate, periodType));
					}

					var promises = [];
					promises.push(promiseObject(data));
					promises.push(visualisationService.yyLineChart(null, yyPeriods, data.dataID, ouBoundaryID));
					promises.push(dqAnalysisConsistency.analyse(data.dataID, null, period, refPeriods, ouBoundaryID, ouLevel, null, "time", data.trend, data.comparison, data.consistency, null));
					$q.all(promises).then(function(datas) {

						var data = datas[0];
						var yyLine = datas[1];
						var tConsistency = datas[2];

						//Add chart data to time consistency result object
						visualisationService.makeTimeConsistencyChart(null, tConsistency.result, null);


						var consistencyChart = {
							name: d2Map.d2NameFromID(data.dataID),
							id: data.id,
							yyChartOptions: yyLine.opts,
							yyChartData: yyLine.data,
							consistencyChartOptions: tConsistency.result.chartOptions,
							consistencyChartData: tConsistency.result.chartData
						};


						visualisationService.setChartHeight(consistencyChart.yyChartOptions, 400);
						visualisationService.setChartLegend(consistencyChart.yyChartOptions, false);

						visualisationService.setChartHeight(consistencyChart.consistencyChartOptions, 400);
						visualisationService.setChartLegend(consistencyChart.consistencyChartOptions, true);
						visualisationService.setChartYAxis(consistencyChart.consistencyChartOptions, 0, 100);
						visualisationService.setChartMargins(consistencyChart.consistencyChartOptions, 60, 30, 90, 110);


						self.consistencyCharts.push(consistencyChart);
						if (self.consistencyCharts.length === self.expectedConsistencyCharts) self.tcLoading = false;

					});

				}

			};



			/** CONSISTENCY OVER TIME */
			self.makeDataConsistencyCharts = function() {
				if (!self.ready) {
					return;
				}
				else if (self.dcLoading) {
					return;
				}
				else if (self.consistencyData && !self.widthChanged[2]) {
					return;
				}
				else {
					self.consistencyData = true;
					self.widthChanged[2] = false;
				}

				self.dataConsistencyCharts = [];

				var ouBoundaryID = self.selectedOrgunit.boundary.id;
				var ouLevel;
				if (self.selectedOrgunit.level) ouLevel = self.selectedOrgunit.level.level;


				var relations = d2Map.groupRelations(self.group.code, false);
				self.expectedDataConsistencyCharts = relations.length;
				if (relations.length > 0) self.dcLoading = true;
				for (let i = 0; i < relations.length; i++) {
					var relation = relations[i];
					var indicatorA = d2Map.numerators(relation.A);
					var indicatorB = d2Map.numerators(relation.B);


					var periodType = periodService.longestPeriod([d2Map.dataSets(indicatorA.dataSetID).periodType,
						d2Map.dataSets(indicatorB.dataSetID).periodType]);
					var period = periodService.getISOPeriods(self.startDate, self.endDate, periodType);

					var promises = [];
					promises.push(relation);
					promises.push(dqAnalysisConsistency.analyse(indicatorA.dataID, indicatorB.dataID, period, null, ouBoundaryID, ouLevel, null, "data", relation.type, null, relation.criteria, null));
					$q.all(promises).then(function(datas) {
						var data = datas[0];
						var result = datas[1];

						if (result.result.subType != "do") {
							visualisationService.makeDataConsistencyChart(null, result.result, null);
						}
						else {
							visualisationService.makeDropoutRateChart(null, result.result, null);
						}

						var dataConsistencyChart = {
							name: data.name,
							period: periodService.shortPeriodName(result.result.pe[0]) + " to " +
							periodService.shortPeriodName(result.result.pe[result.result.pe.length - 1]),
							chartOptions: result.result.chartOptions,
							chartData: result.result.chartData
						};

						if (result.result.subType != "do") {
							visualisationService.setChartLegend(dataConsistencyChart.chartOptions, true);
						}

						visualisationService.setChartHeight(dataConsistencyChart.chartOptions, 400);
						visualisationService.setChartYAxis(dataConsistencyChart.chartOptions, 0, 100);
						visualisationService.setChartMargins(dataConsistencyChart.chartOptions, 60, 20, 100, 100);

						self.dataConsistencyCharts.push(dataConsistencyChart);

						if (self.dataConsistencyCharts.length === self.expectedDataConsistencyCharts) self.dcLoading = false;
					});

				}

			};




			/** ===== OUTLIERS ===== */
			self.resultControl = {};
			function receiveResult(result) {
				self.outLoading = false;
				self.resultControl.loading = function (status) {
					self.outLoading = status;
				};
				self.resultControl.receiveResult(result);
			}


			self.makeOutlierTable = function() {
				if (!self.ready) {
					return;
				}
				else if (self.outLoading) {
					return;
				}
				else if (self.outliers) {
					return;
				}
				else {
					self.outliers = true;
				}

				var level;
				if (self.selectedOrgunit.level) level = self.selectedOrgunit.level.level;


				//Get period IDs
				var periods = periodService.getISOPeriods(self.startDate, self.endDate, "Monthly");


				//Get data IDs
				var data = d2Map.groupNumerators(self.group.code);
				var dataIDs = [];
				for (let i = 0; i < data.length; i++) {
					dataIDs.push(data[i].dataID);
				}

				self.outLoading = true;
				dataAnalysisService.outlierGap(receiveResult, dataIDs, null, null, periods, [self.selectedOrgunit.boundary.id], level, null, 2, 3.5, 1);
			};




			/** ===== UTILITIES ===== */

			function promiseObject(object) {
				var deferred = $q.defer();
				deferred.resolve(object);
				return deferred.promise;
			}


			self.setWindowWidth = function() {

				var contentWidth = angular.element(".mainView").width();

				//TODO: For now, assume there is a scrollbar - which on Win Chrome is 17 px
				contentWidth -= 17;
				self.innerWidth = contentWidth;

				var chartWidth;
				if (contentWidth <= 600) {
					chartWidth = contentWidth - 2; //border
				}
				else if (contentWidth <= 768) {
					if (self.showParameters) contentWidth -= 330; //parameter box + margin

					chartWidth = contentWidth - 2; //border
				}
				else if (contentWidth <= 900 && self.showParameters) {
					contentWidth -= 330; //parameter box + margin

					chartWidth = contentWidth - 2; //border
				}
				else {
					if (self.showParameters) contentWidth -= 330; //parameter box + margin

					chartWidth = contentWidth - 4; //border
					chartWidth = chartWidth/2; //half width for chart
				}

				self.halfChart = Math.floor(chartWidth).toString() + "px";
				self.contentWidth = Math.floor(contentWidth).toString() + "px";

				for (let i = 0; i < 3; i++) {
					self.widthChanged[i] = true;
				}
				self.widthChanged[self.selectedTab] = false;

			};


			self.update = function() {
				self.completeness = false;
				self.consistency = false;
				self.consistencyData = false;
				self.outliers = false;

				if (self.selectedOrgunit && self.selectedOrgunit.boundary && self.group) self.ready = true;


				self.endDate = moment(self.endDate).date(1);
				self.startDate = moment(self.endDate).subtract(11, "months");
				self.endDate = self.endDate.add(1, "months").subtract(1, "day");


				switch (self.selectedTab) {
				case 0:
					self.makeCompletenessCharts();
					break;
				case 1:
					self.makeTimeConsistencyCharts();
					break;
				case 2:
					self.makeDataConsistencyCharts();
					break;
				case 3:
					self.makeOutlierTable();
					break;
				}
			};


			self.updateCurrent = function() {
				switch (self.selectedTab) {
				case 0:
					self.completeness = false;
					self.makeCompletenessCharts();
					break;
				case 1:
					self.consistency = false;
					self.makeTimeConsistencyCharts();
					break;
				case 2:
					self.consistencyData = false;
					self.makeDataConsistencyCharts();
					break;
				}
			};





			/** ===== INIT ===== */
			function init() {

				self.group = {displayName: "[ Core ]", code: "core"};
				self.groups = d2Map.configuredGroups();
				self.groups.unshift(self.group);

				//Assume no groups means not configured
				if (self.groups.length === 1) {
					notificationService.notify("Info", "The data quality tool has not been configured. " +
						"Contact your system administrator.\n\n If you are an administrator select " +
						"More > Administration from the top menu to get started.");
				}

				self.endDate = moment();
				if (self.endDate.date() > 7) {
					self.endDate.subtract(new Date().getDate(), "days");
				}
				else {
					self.endDate.subtract(new Date().getDate(), "days");
					self.endDate.subtract(1, "months");
				}
				self.startDate = moment(self.endDate).subtract(12, "months").add(1, "day");

				self.datepickerOptions.maxDate = moment().subtract(1, "month").toDate();

			}


			function uiInit() {
				if (angular.element(".mainView").width() > 1280) {
					self.showParameters = true;
				}
				else {
					self.showParameters = false;
				}

				self.widthChanged = [];
				for (let i = 0; i < 3; i++) {
					self.widthChanged[i] = false;
				}

				self.setWindowWidth();
				window.jQuery( window ).resize(function() {
					self.setWindowWidth();
					$scope.$apply();
				});

				self.selectedTab = 0;

				self.datepickerOptions = {
					minMode: "month",
					datepickerMode: "month"
				};

			}


			uiInit();
			if (d2Map.ready()) {
				init();
				self.update();
			}
			else {
				d2Map.load().then(
					function() {
						init();
						self.update();
					},
					function () {
						console.log("Failed to load metadata for dashboard");
					}
				);
			}



			return self;

		}]);
