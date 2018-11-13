/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

var app = angular.module("outlierGapAnalysis");

app.directive("outlierResult", function () {
	return {
		scope: {
			"resultControl": "=resultControl"
		},
		bindToController: true,
		controller: "OutlierResultController",
		controllerAs: "resultCtrl",
		template: require("./viewOutlierAnalysisResult.html")
	};
});

app.filter("startFrom", function() {
	return function(input, start) {
		start = +start; //parse to int
		if (input) return input.slice(start);
		else return input;
	};
});

app.controller("OutlierResultController",
	["periodService", "mathService", "dataAnalysisService", "requestService", "visualisationService", "$i18next", "$uibModal",
		function(periodService, mathService, dataAnalysisService, requestService, visualisationService, $i18next, $uibModal) {
			var self = this;

			//"API" for sending result
			self.results = [];
			self.resultControl.receiveResult = receiveResult;

			function receiveResult(result) {

				if (!result || !result.rows || result.rows.length === 0) {
					notification("Info", "No data returned from server.");
				}
				else {
					self.alerts = [];
					console.log("Received " + result.rows.length + " rows");
					if (result.trimmed) {
						var message = $i18next.t("Due to its size, the result was trimmed down to ") + result.rows.length + $i18next.t(" rows. ");
						message += $i18next.t("Rows were prioritized based on total weight (significance of missing data and outliers), with rows with the lowest weight being left out of the result.");
						notification("Warning", message);
					}
				}

				self.results.unshift(result);
				self.currentResult = 0;

				//Only keep 5
				if (self.results.length > 5) self.results.pop();

				prepareResult();
			}


			function prepareResult() {

				self.result = self.results[self.currentResult];

				//Reset filter
				self.typeFilter = 0;
				self.stdFilterType = 0;
				self.stdFilterDegree = 1;

				self.updateFilter();

				//Default sort column
				self.sortCol = "result.totalWeight";
				self.reverse = true;

				//Get nice period names
				self.periods = [];
				for (let i = 0; i < self.result.metaData.periods.length; i++) {
					var period = self.result.metaData.periods[i];
					self.periods.push(periodService.shortPeriodName(period));
				}

				//Calculate total number of columns in table
				self.totalColumns = self.periods.length + 8 + self.result.metaData.hierarchy.length;

			}


			self.previousResult = function () {
				self.currentResult++;
				prepareResult();
			};


			self.isOutlier = function (value, stats, criteria) {
				if (value === null || value === "") return false;

				var standardScore = Math.abs(mathService.calculateStandardScore(value, stats));
				var zScore = Math.abs(mathService.calculateZScore(value, stats));

				//Use specific criteria here
				if (standardScore > criteria.moderate.s || zScore > criteria.moderate.z) return true;
				else return false;
			};


			function includeRow(row) {

				if (self.stdFilterType === 0) return true;

				if (self.stdFilterType === 1) {
					if (self.stdFilterDegree === 2) return row.result.maxSscore > row.criteria.extreme.s;
					else return row.result.maxSscore > row.criteria.moderate.s;
				}

				if (self.stdFilterType === 2) {
					if (self.stdFilterDegree === 2) return row.result.maxZscore > row.criteria.extreme.z;
					else return row.result.maxZscore > row.criteria.moderate.z;
				}

				return false;
			}


			self.updateFilter = function () {
				self.filteredRows = [];
				for (let i = 0; i < self.result.rows.length; i++) {
					if (includeRow(self.result.rows[i])) {
						self.filteredRows.push(self.result.rows[i]);
					}
				}

				//Store paging variables
				self.currentPage = 1;
				self.pageSize = 15;
				self.totalRows = self.filteredRows.length;
			};


			self.updateType = function () {
				switch (self.typeFilter) {
				case 0:
					self.sortByColumn("result.totalWeight");
					break;
				case 1:
					self.sortByColumn("result.gapWeight");
					break;
				case 2:
					self.sortByColumn("result.outWeight");
					break;
				}
				self.reverse = true;
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


			/**INTERACTIVE FUNCTIONS*/
			self.showDetails = function (row) {
				var chartData = [{
					"key": row.metaData.dx.name + " - " + row.metaData.ou.name,
					"color": "green",
					"values": []
				}];
				for (let i = 0; i < row.data.length; i++) {
					var value = row.data[i];
					if (value === "") value = null;
					else value = parseFloat(value);
					chartData[0].values.push({
						"y": value,
						"x": self.periods[i]
					});
				}


				var chartOptions = {
					"chart": {
						"type": "multiBarChart",
						"interactiveGuideline": false,
						"height": 400,
						"margin": {
							"top": 40,
							"right": 20,
							"bottom": 40,
							"left": 100
						},
						"xAxis": {
							"rotateLabels": -30
						},
						"tooltip": {
							enabled: true
						},
						"showLegend": false,
						"showControls": false
					}
				};

				var modalInstance = $uibModal.open({
					template: require("./modalOutlierAnalysisGraph.html"),
					controller: "ModalGraphController",
					controllerAs: "mgCtrl",
					resolve: {
						ouName: function () {
							return row.metaData.ou.name;
						},
						dxName: function () {
							return row.metaData.dx.name;
						},
						chartOptions: function () {
							return chartOptions;
						},
						chartData: function () {
							return chartData;
						}
					}
				});

				// eslint-disable-next-line no-unused-vars
				modalInstance.result.then(function (result) {
				});
			};


			self.sendMessage = function (metaData) {

				var modalInstance = $uibModal.open({
					template: require("../appCommons/modalMessage.html"),
					controller: "ModalMessageController",
					controllerAs: "mmCtrl",
					resolve: {
						orgunitID: function () {
							return metaData.ou.id;
						},
						orgunitName: function () {
							return metaData.ou.name;
						}
					}
				});

				// eslint-disable-next-line no-unused-vars
				modalInstance.result.then(function (result) {
				});
			};


			self.drillDown = function (rowMetaData) {

				//TODO: Check that it has children, then use level in query rather
				var requestURL = "/organisationUnits/" + rowMetaData.ou.id + ".json?fields=children[id]";
				requestService.getSingle(requestURL).then(function (response) {

					if (!requestService.validResponse(response)) return;
					var children = response.data.children;
					if (children.length > 0) {

						var orgunits = [];
						for (let i = 0; i < children.length; i++) {
							orgunits.push(children[i].id);
						}


						dataAnalysisService.outlierGap(receiveResult, self.result.metaData.dataIDs, self.result.metaData.coAll, self.result.metaData.coFilter, self.result.metaData.periods, orgunits, null, null, 2, 3.5, 1);


						//Move currently shown result to front of results

						self.result = undefined;
						self.results.move(self.currentResult, 0);

					}

					else {
						notification($i18next.t("Warning"), $i18next.t("Not possible to drill down, ") + rowMetaData.ou.name + $i18next.t(" has no children."));
					}
				});


			};

			self.exportCSV = function () {
				var fileContent = getFileContent();
				var modalInstance = $uibModal.open({
					template: require("../appCommons/modalExport.html"),
					controller: "ModalExportController",
					controllerAs: "exportCtrl",
					resolve: {
						fileContent: function () {
							return fileContent;
						},
						fileName: function () {
							return "Outlier and missing data analysis";
						}
					}
				});

				// eslint-disable-next-line no-unused-vars
				modalInstance.result.then(function (result) {
					console.log("Export done");
				});

			};

			function getFileContent() {
				var headers = [];
				var rows = [];

				headers = headers.concat(["Orgunit ID", "Data ID"]);
				headers = headers.concat(self.result.metaData.hierarchy);
				headers = headers.concat(["Orgunit name", "Data"]);
				headers = headers.concat(self.periods);
				headers = headers.concat(["Max Z score", "Max modified Z score", "Gap weight", "Outlier weight", "Total weight"]);

				var data = self.result.rows;
				var j;
				for (let i = 0; i < data.length; i++) {
					var row = [];
					var value = data[i];

					row.push(value.metaData.ou.id);
					row.push(value.metaData.dx.id);
					for (j = 0; j < self.result.metaData.hierarchy.length; j++) {
						value.metaData.ou.hierarchy[j] ? row.push(value.metaData.ou.hierarchy[j]) : row.push("");
					}
					row.push(value.metaData.ou.name);
					row.push(value.metaData.dx.name);
					for (j = 0; j < value.data.length; j++) {
						row.push(value.data[j]);
					}
					row.push(value.result.maxSscore);
					row.push(value.result.maxZscore);
					row.push(value.result.gapWeight);
					row.push(value.result.outWeight);
					row.push(value.result.totalWeight);

					rows.push(row);
				}
				return {
					headers: headers,
					rows: rows
				};
			}

			function notification(title, message) {
				var modalInstance = $uibModal.open({
					template: require("../appCommons/modalNotification.html"),
					controller: "ModalNotificationController",
					controllerAs: "nCtrl",
					resolve: {
						title: function () {
							return title;
						},
						message: function () {
							return message;
						}
					}
				});

				// eslint-disable-next-line no-unused-vars
				modalInstance.result.then(function (result) {
				});
			}

			return self;
		}]);
