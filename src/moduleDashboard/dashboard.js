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


					let chartModel = {
						name: d2Map.d2NameFromID(dataset.id),
						trendChart: {
							loading: true,
							options: null,
							data: null
						},
						ouChart: {
							loading: true,
							options: null,
							data: null
						}
					};

					self.completenessCharts.push(chartModel);


					visualisationService.lineChart(null, dataSetQueryID, periods, [ouBoundaryID], "dataOverTime").then((x) => {
						let trendChartData = [...x.data];
						trendChartData[0].key = $i18next.t("Completeness");
						trendChartData[1].key = $i18next.t("Timeliness");

						chartModel.trendChart = {
							loading: false,
							options: x.opts,
							data: trendChartData
						};

						const chartsLoading = self.completenessCharts.filter(x => x.ouChart.loading || x.trendChart.loading);
						self.cmpLoading = chartsLoading.length > 0;
					});

					visualisationService.barChart(null, [dataSetQueryID[0]], [ouPeriod], [ouBoundaryID], "ou", level).then((x) => {
						let ouChartData = [...x.data];
						ouChartData[0].key = periodService.shortPeriodName(ouPeriod);
						visualisationService.setChartLegend(x.opts, true);
						visualisationService.setChartYAxis(x.opts, 0, 100);

						chartModel.ouChart = {
							loading: false,
							options: x.opts,
							data: ouChartData
						};

						const chartsLoading = self.completenessCharts.filter(x => x.ouChart.loading || x.trendChart.loading);
						self.cmpLoading = chartsLoading.length > 0;
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
				else if (self.consistency && !self.widthChanged[1]) {
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

					let chartModel = {
						yyChart: {
							loading: true,
							options: null,
							data: null
						},
						consistencyChart: {
							loading: true,
							options: null,
							data: null
						},
						name: d2Map.d2NameFromID(data.dataID)
					};	
					self.consistencyCharts.push(chartModel);

					visualisationService.yyLineChart(null, yyPeriods, data.dataID, ouBoundaryID).then((x) => {
						chartModel.yyChart = { 
							loading: false,
							options: x.opts, 
							data: x.data 
						};
						visualisationService.setChartHeight(chartModel.yyChart.options, 400);
						visualisationService.setChartLegend(chartModel.yyChart.options, false);

						const chartsLoading = self.consistencyCharts.filter(x => x.yyChart.loading || x.consistencyChart.loading);
						self.tcLoading = chartsLoading.length > 0;
					});

					dqAnalysisConsistency.analyse(data.dataID, null, period, refPeriods, ouBoundaryID, ouLevel, null, "time", data.trend, data.comparison, data.consistency, null).then((x) => {
						
						visualisationService.makeTimeConsistencyChart(null, x.result, null);

						chartModel.consistencyChart = { 
							loading: false,
							options: x.result.chartOptions, 
							data: x.result.chartData 
						};
						

						visualisationService.setChartHeight(chartModel.consistencyChart.options, 400);
						visualisationService.setChartLegend(chartModel.consistencyChart.options, true);
						visualisationService.setChartYAxis(chartModel.consistencyChart.options, 0, 100);
						visualisationService.setChartMargins(chartModel.consistencyChart.options, 60, 30, 90, 110);

						const chartsLoading = self.consistencyCharts.filter(x => x.yyChart.loading || x.consistencyChart.loading);
						self.tcLoading = chartsLoading.length > 0;
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


					var periodType = periodService.longestPeriod([d2Map.dataSets(indicatorA.dataSetID).periodType, d2Map.dataSets(indicatorB.dataSetID).periodType]);
					var period = periodService.getISOPeriods(self.startDate, self.endDate, periodType);

					let data = relation;

					let chartModel = {
						loading: true,
						name: data.name,
						period: "",
						chartOtions: null,
						chartData: null
					};

					self.dataConsistencyCharts.push(chartModel);
					
					dqAnalysisConsistency.analyse(indicatorA.dataID, indicatorB.dataID, period, null, ouBoundaryID, ouLevel, null, "data", relation.type, null, relation.criteria, null)
						.then((result) => {
							if (result.result.subType != "do") {
								visualisationService.makeDataConsistencyChart(null, result.result, null);
								visualisationService.setChartLegend(result.result.chartOptions, true);
							}
							else {
								visualisationService.makeDropoutRateChart(null, result.result, null);
							}

							chartModel.period = periodService.shortPeriodName(result.result.pe[0]) + " to " + periodService.shortPeriodName(result.result.pe[result.result.pe.length - 1]);
							chartModel.chartOptions = result.result.chartOptions;
							chartModel.chartData = result.result.chartData;
							chartModel.loading = false;

							visualisationService.setChartHeight(chartModel.chartOptions, 400);
							visualisationService.setChartYAxis(chartModel.chartOptions, 0, 100);
							visualisationService.setChartMargins(chartModel.chartOptions, 60, 20, 100, 100);

							let chartsLoadingCount = self.dataConsistencyCharts.filter(x => x.loading).length;
							if (chartsLoadingCount === self.expectedDataConsistencyCharts) self.dcLoading = false;
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
				window.addEventListener("resize", () => {
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
