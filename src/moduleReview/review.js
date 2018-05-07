/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

angular.module("review", []);

angular.module("review").controller("ReviewController",
	["d2Meta","d2Map", "periodService", "dataAnalysisService", "visualisationService", "dqAnalysisConsistency", "dqAnalysisExternal", "dqAnalysisCompleteness", "$timeout", "d2Utils", "$scope",
		function(d2Meta, d2Map, periodService, dataAnalysisService, visualisationService, dqAnalysisConsistency, dqAnalysisExternal, dqAnalysisCompleteness, $timeout, d2Utils, $scope) {

			var self = this;

			//Check if map is loaded, if not, do that before initialising
			if (!d2Map.ready()) {
				d2Map.load().then(
					function() {
						init();
					}
				);
			}
			else {
				init();
			}

			//HTML partials
			self.selection = "moduleReview/selection.html";
			self.resultSummary= "moduleReview/result0Summary.html";
			self.resultFrontpage = "moduleReview/result0Frontpage.html";
			self.result1Completeness = "moduleReview/result1Completeness.html";
			self.result2Consistency = "moduleReview/result2Consistency.html";
			self.result3External = "moduleReview/result3External.html";
			self.result4Denominators = "moduleReview/result4Denominators.html";


			function init() {

				initPrint();

				self.notPossible = false;
				self.totalRequests = 0;
				self.outstandingRequests = 0;

				self.remarks = [];

				self.years = periodService.getYears();
				self.years.shift();
				self.yearSelected = self.years[0];
				self.selectedRefPeriod = 3;

				self.groups = [];
				self.groupSelected = undefined;

				//Accordion settings
				self.oneAtATime = true;
				self.status = {
					isFirstOpen: true
				};

				self.groups = d2Map.configuredGroups();
				self.groups.unshift({"name": "[ Core ]", "code": "core"});
				self.groupSelected = self.groups[0];

				//Warning if closing window
				window.onbeforeunload = function (event) {
					var message = "Are you sure you want to leave this page? Any interpretations will be lost.";
					if (typeof event == "undefined") {
						event = window.event;
					}
					if (event) {
						event.returnValue = message;
					}
					return message;
				};

				//Warning if navigating away from report
				$scope.$on("$locationChangeStart", function( event ) {
					var answer = confirm("Are you sure you want to leave this page? Any interpretations will be lost.");
					if (!answer) {
						event.preventDefault();
					}
				});
			}



			/** START ANALYSIS*/
			self.doAnalysis = function() {

				//Collapse open panels
				angular.element(".panel-collapse").removeClass("in");
				angular.element(".panel-collapse").addClass("collapse");

				clearResults();
				self.outstandingRequests = 0;

				var groupCode = self.groupSelected.code;

				//Metadata for queries
				var datasets = d2Map.groupDataSets(groupCode);
				var indicators = d2Map.groupNumerators(groupCode, true);


				var period = self.yearSelected.id;
				var refPeriods = precedingYears(self.yearSelected.id, self.selectedRefPeriod);
				var allYears = angular.copy(refPeriods);
				allYears.push(period);

				var ouBoundary = self.selectedOrgunit.boundary.id;
				var ouLevel = self.selectedOrgunit.level.level;


				//1 Get dataset completeness and consistency
				var datasetIDsForConsistencyChart = [];

				for (var i = 0; i < datasets.length; i++) {

					var dataSetQueryID = datasets[i].id + ".REPORTING_RATE";

					//completeness
					dataAnalysisService.datasetCompleteness(receiveDatasetCompleteness, datasets[i].threshold, dataSetQueryID, period, ouBoundary, ouLevel);


					//consistency
					dqAnalysisConsistency.analyse(dataSetQueryID, null, period, refPeriods, ouBoundary, ouLevel, null, "time", datasets[i].trend, datasets[i].comparison, datasets[i].consistencyThreshold, null).then(
						function (data) {
							self.completeness.consistency.push(data.result);
							if (data.errors) self.remarks = self.remarks.concat(data.errors);
							self.outstandingRequests--;
						}
					);
					datasetIDsForConsistencyChart.push(dataSetQueryID);

					//timeliness
					self.outstandingRequests++;
					dataSetQueryID = datasets[i].id + ".REPORTING_RATE_ON_TIME";
					dataAnalysisService.datasetCompleteness(receiveDatasetTimeliness, datasets[i].timelinessThreshold, dataSetQueryID, period, ouBoundary, ouLevel);


					self.outstandingRequests += 2;
				}



				//2 Get indicator completeness, consistency, outliers
				var indicatorIDsForConsistencyChart = [];
				for (var i = 0; i < indicators.length; i++) {

					var indicator = indicators[i];
					var periodType = d2Map.dataSetPeriodType(indicator.dataSetID);

					//periods for data completeness
					var startDate = self.yearSelected.id.toString() + "-01-01";
					var endDate = self.yearSelected.id.toString() + "-12-31";
					var periods = periodService.getISOPeriods(startDate, endDate, periodType);


					dqAnalysisCompleteness.analyse(indicator.dataElementOperandID, indicator.dataSetID, period, periods, ouBoundary, ouLevel, null, indicator.missing, "dataCompleteness", null)
						.then(function (data) {
							receiveDataCompletenessDetailed(data.result, data.errors);
						});


					dqAnalysisConsistency.analyse(indicator.dataID, null, period, refPeriods, ouBoundary, ouLevel, null, "time", indicator.trend, indicator.comparison, indicator.consistency, null).then(
						function (data) {
							var errors = data.errors;
							var result = data.result;

							if (result) {
								visualisationService.makeTimeConsistencyChart(null, result, null);

								self.consistency.data.push(result);

								visualisationService.lineChart(null, [result.dxIDa], allYears, ouBoundary, "dataOverTime").then(function (data) {

									var dataID = data.opts.parameters.dataIDs[0];

									for (var i = 0; i < self.consistency.data.length; i++) {

										if (self.consistency.data[i].dxIDa === dataID) {
											self.consistency.data[i].trendChartData = data.data;
											self.consistency.data[i].trendChartOptions = data.opts;

											visualisationService.setChartLegend(self.consistency.data[i].trendChartOptions, false);
											visualisationService.setChartMargins(self.consistency.data[i].trendChartOptions, null, null, null, 60);
											self.consistency.data[i].trendChartOptions.chart.xAxis.tickValues = [0, 1, 2, 3];
										}

									}
									self.outstandingRequests--;
								});

							}
							if (errors) {
								self.remarks = self.remarks.concat(errors);
							}
							self.outstandingRequests--;
						}
					);

					dataAnalysisService.indicatorOutlier(receiveDataOutliers, indicator, periods, ouBoundary, ouLevel);

					indicatorIDsForConsistencyChart.push(indicator.dataID);
					self.outstandingRequests += 4+5;
				}

				//3 Indicator relations
				var relations = d2Map.groupRelations(self.groupSelected.code, false);
				for (var i = 0; i < relations.length; i++) {
					var relation = relations[i];
					var indicatorA = d2Map.numerators(relation.A);
					var indicatorB = d2Map.numerators(relation.B);

					if (!indicatorA.dataID || !indicatorB.dataID) continue;
					dqAnalysisConsistency.analyse(indicatorA.dataID, indicatorB.dataID, period, null, ouBoundary, ouLevel, null, "data", relation.type, null, relation.criteria, relation).then(
						function(data) {
							var errors = data.errors;
							var result = data.result;
							if (errors) self.remarks = self.remarks.concat(errors);

							//Check type and format data accordingly for charts
							if (result.subType === "do") {
								visualisationService.makeDropoutRateChart(null, result);
							}
							else {
								visualisationService.makeDataConsistencyChart(null, result);
							}


							result.relationCode = result.meta.code;

							self.consistency.relations.push(result);
							self.outstandingRequests--;
						}
					);
					self.outstandingRequests++;

				}



				//4 Denominator consistency
				var denominatorRelations = d2Map.denominatorRelations();
				for (var i = 0; i < denominatorRelations.length; i++) {
					var denominatorPair = d2Map.denominatorRelationDenominators(denominatorRelations[i].code);

					denominatorPair.relation = denominatorRelations[i];
					if (!denominatorPair.a.dataID || !denominatorPair.b.dataID) continue;

					//Need to make sure we don't try to get population at lower level than what is available
					var denomMinLevel = denominatorPair.a.lowLevel < denominatorPair.b.lowLevel ? denominatorPair.a.lowLevel : denominatorPair.b.lowLevel;
					denomMinLevel = denomMinLevel < ouLevel ? denomMinLevel : ouLevel;
					if (self.selectedOrgunit.boundary.level > denomMinLevel) continue;
					dqAnalysisConsistency.analyse(denominatorPair.a.dataID, denominatorPair.b.dataID, period, null, ouBoundary, denomMinLevel, null, "data", "eq", null, denominatorRelations[i].criteria, denominatorPair)
						.then(function(data) {

							self.outstandingRequests--;

							if (data.errors) self.remarks = self.remarks.concat(data.errors);

							visualisationService.makeDataConsistencyChart(null, data.result);

							if (data.result.meta.relation.type != "un") {
								self.denominators.relations.push(data.result);
							}
							else {
								self.denominators.un = data.result;
							}

						});

					self.outstandingRequests++;
				}


				//5 External data consistency
				var externalRelation, externalRelations = d2Map.externalRelations();
				for (var i = 0; i < externalRelations.length; i++) {
					externalRelation = externalRelations[i];

					var dataIdExternal = externalRelation.externalData;
					var dataIdNumerator = d2Map.numerators(externalRelation.numerator).dataID;
					var dataIdDenominator = d2Map.denominators(externalRelation.denominator).dataID;

					if (!dataIdExternal || !dataIdNumerator || !dataIdDenominator) continue;

					dqAnalysisExternal.analyse(dataIdExternal, dataIdNumerator, dataIdDenominator, period, ouBoundary, externalRelation.level, externalRelation.criteria, externalRelation)
						.then(function(data) {

							self.outstandingRequests--;

							if (data.errors) self.remarks = self.remarks.concat(data.errors);
							if (!data.result.hasOwnProperty("failed")) {
								self.external.push(data.result);
								visualisationService.makeExternalConsistencyChart(null, data.result);
							}

						});

					self.outstandingRequests++;
				}



				self.totalRequests = self.outstandingRequests;

				//Completeness consistency chart
				visualisationService.lineChart(receiveDatasetTimeConsistencyChart, datasetIDsForConsistencyChart, refPeriods.concat(period), [ouBoundary], "dataOverTime");

				//Indicator consistency chart
				visualisationService.lineChart(receiveDataTimeConsistencyChart, indicatorIDsForConsistencyChart, refPeriods.concat(period), [ouBoundary], "dataOverTime");


			};


			function clearResults() {
				//Structure for storing data
				self.completeness = {
					"datasets":	 [],
					"timeliness": [],
					"consistency": [],
					"indicators":	 [],
					"indicatorsDetailed": []
				};

				self.outliers = [];

				self.consistency = {
					"data":		 [],
					"relations":	 []
				};

				self.dataConsistencyChart = {};
				self.datasetConsistencyChart = {};

				self.external = [];

				self.denominators = {
					"un": null,
					"relations": []
				};

				self.remarks = [];
			}


			function receiveDatasetTimeConsistencyChart(chartData, chartOptions) {

				chartOptions.chart.forceY = [0,100];
				chartOptions.chart.yAxis = {
					"axisLabel": "% Completeness"
				};
				chartOptions.chart.margin.left = 80;
				chartOptions.chart.margin.right = 40;
				chartOptions.chart.margin.bottom = 40;
				delete chartOptions.chart["height"];


				self.datasetConsistencyChart.options = chartOptions;
				self.datasetConsistencyChart.data = chartData;

			}


			function receiveDataTimeConsistencyChart(chartData, chartOptions) {

				chartOptions.chart.title = {
					"enable": true,
					"text": "Reporting over time"
				};
				chartOptions.chart.margin.left = 60;
				chartOptions.chart.margin.bottom = 40;
				delete chartOptions.chart["height"];

				self.dataConsistencyChart.options = chartOptions;
				self.dataConsistencyChart.data = chartData;

			}



			/**CALLBACKS FOR RESULTS*/

			function receiveDatasetCompleteness(result, errors) {
				self.completeness.datasets.push(result);
				if (errors) self.remarks = self.remarks.concat(errors);
				self.outstandingRequests--;
			}

			function receiveDatasetTimeliness(result, errors) {
				self.completeness.timeliness.push(result);
				if (errors) self.remarks = self.remarks.concat(errors);
				self.outstandingRequests--;
			}


			function receiveDataCompletenessDetailed(result, errors) {
				self.completeness.indicatorsDetailed.push(result);

				//if (errors) self.remarks = self.remarks.concat(errors);
				self.outstandingRequests -= 6;
			}



			function receiveDataOutliers(result) {
				result.displayName = d2Map.d2NameFromID(result.dataID);
				self.outliers.push(result);
				self.outstandingRequests--;
			}


			/** PERIODS */
			function precedingYears(year, numberOfYears) {

				var start = parseInt(year);
				var years = [];
				for (var i = 1; i <= numberOfYears; i++) {
					years.push(start-i);
				}

				return years.sort(function(a, b){return a-b;});

			}


			/** RELATIONS */
			self.relationType = function(typeCode) {
				return d2Map.dataRelationType(typeCode);
			};


			self.relationName = function(code) {
				return d2Map.relations(code).name;
			};



			/** UTILITIES */
			self.progress = function() {

				return Math.round(100-100*self.outstandingRequests/self.totalRequests);

			};


			self.isNumber = function(number) {
				return d2Utils.isNumber(number);
			};

			/** DHIS 2 names */
			self.nameFromID = function(id) {
				return d2Map.d2NameFromID(id);
			};


			/** PRINT */
			function initPrint() {
				//http://tjvantoll.com/2012/06/15/detecting-print-requests-with-javascript/
				if (window.matchMedia) {
					var mediaQueryList = window.matchMedia("print");
					mediaQueryList.addListener(function(mql) {
						if (!mql.matches) {
							printDone();
						}
					});
				}

				window.onafterprint = printDone;
			}


			self.doPrint = function () {

				interpretationToParagraph();

				//Give charts time to finish animation
				window.print();

			};


			function printDone() {

				interpretationFromParagraph();
			}


			function interpretationToParagraph() {
				var textAreas = angular.element(".interpretation");

				for (var i = 0; i < textAreas.length; i++) {
					var text = textAreas[i].value;
					var parent = textAreas[i].parentElement;

					//If no text, remove heading
					var header;
					if (text === "") {
						header = textAreas[i].previousElementSibling;
						header.classList.add("no-print");
					}
					else {
						header = textAreas[i].previousElementSibling;
						header.classList.remove("no-print");
					}
					//Make sure we keep line break
					text = text.replace(/\n/g, "<br/>");
					parent.innerHTML += "<p class=\"interpretationText\">" + text + "</p>";
				}

				angular.element(".interpretation").remove();
			}


			function interpretationFromParagraph() {
				var textAreas = angular.element(".interpretationText");

				for (var i = 0; i < textAreas.length; i++) {
					var text = textAreas[i].innerHTML;
					var parent = textAreas[i].parentElement;
					text = text.replace(/\<br\>/g, "\n");
					parent.innerHTML += "<textarea class=\"interpretation\">" + text + "</textarea>";
				}

				angular.element(".interpretationText").remove();
			}



			return self;

		}]
);
