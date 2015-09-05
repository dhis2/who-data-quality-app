(function() {

	angular.module('outlierGapAnalysis').controller("OutlierGapAnalysisController", function(metaDataService, periodService, requestService, dataAnalysisService, mathService, $scope, $modal) {
		var self = this;

		self.results = [];
		self.currentResult = undefined;
		self.result = undefined;

		self.itemsPerPage = 25;
		self.hasVisual = false;

		self.processStatus = dataAnalysisService.status;

		init();

		function init() {
			self.dataDisaggregation = 0;

			self.showFilter = false;

			self.datasets = [];
			self.datasetDataelements = undefined;
			self.datasetSelected = undefined;
			metaDataService.getDataSets().then(function (data) {
				self.datasets = data;
			});

			self.dataElementGroups = [];
			self.dataElementGroupsSelected = undefined;
			metaDataService.getDataElementGroups().then(function (data) {
				self.dataElementGroups = data;
			});

			self.dataElements = [];
			self.dataElementPlaceholder = "";
			self.dataElementsSelected = [];


			self.indicatorGroups = [];
			self.indicatorGroupsSelected = undefined;
			metaDataService.getIndicatorGroups().then(function (data) {
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

			metaDataService.getUserOrgunits().then(function (data) {
				self.userOrgunits = data;
				self.boundarySelectionType = 0;
				self.boundaryOrgunitSelected = self.userOrgunits[0];
				self.filterLevels();
				self.orgunitUserDefaultLevel();
			});


			self.orgunitLevels = [];
			self.filteredOrgunitLevels = [];
			self.orgunitLevelSelected = undefined;
			metaDataService.getOrgunitLevels().then(function (data) {
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
			metaDataService.getOrgunitGroups().then(function (data) {
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

			ouTreeInit();
		}

		/** -- PARAMETER SELECTION -- */

		/** Orgunits */
		self.orgunitSearchModeSelected = function () {
			self.boundaryOrgunitSelected = undefined;
			self.orgunitLevelSelected = undefined;
		};


		self.orgunitUserModeSelected = function () {
			self.boundaryOrgunitSelected = self.userOrgunits[0];
			self.orgunitUserDefaultLevel();
		};


		self.getLevelPlaceholder = function () {
			if (!self.filteredOrgunitLevels || self.filteredOrgunitLevels.length === 0) {
				if (self.boundaryOrgunitSelected && self.boundaryOrgunitSelected.level === self.lowestLevel) return "N/A";
				else return "Loading...";

			}
			else return "Select level";
		};

		self.orgunitUserDefaultLevel = function () {

			if (!self.boundaryOrgunitSelected || !self.filteredOrgunitLevels) return;

			var level = self.boundaryOrgunitSelected.level;
			for (var i = 0; i < self.filteredOrgunitLevels.length; i++) {
				if (self.filteredOrgunitLevels[i].level === (level + 1)) {
					self.orgunitLevelSelected = self.filteredOrgunitLevels[i];
				}
			}

			if (self.filteredOrgunitLevels.length === 0) self.orgunitLevelSelected = undefined;

		};


		function ouTreeInit() {
			self.ouTreeData = [];
			self.ouTreeControl = {};

			//Get initial batch of orgunits and populate
			metaDataService.getAnalysisOrgunits().then(function (data) {

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


		self.ouTreeSelect = function (orgunit) {
			if (orgunit.noLeaf && orgunit.children.length < 1) {

				//Get children
				metaDataService.orgunitChildrenFromParentID(orgunit.data.ou.id).then(function (data) {
					console.log(data);
					for (var i = 0; i < data.length; i++) {
						var child = data[i];
						if (!orgunit.children) orgunit.children = [];
						orgunit.children.push({
							label: child.name,
							data: {
								ou: child
							},
							noLeaf: child.children
						});

					}
				});
			}

			self.boundaryOrgunitSelected = orgunit.data.ou;
			self.filterLevels();
			self.orgunitUserDefaultLevel();
		}


		self.updateDataElementList = function () {
			if (!self.dataElementGroupsSelected) return;
			self.dataElements = [];
			self.dataElementsSelected = [];
			if (self.dataDisaggregation === 0) {
				self.dataElementPlaceholder = "Loading...";
				metaDataService.getDataElementGroupMembers(self.dataElementGroupsSelected.id)
					.then(function (data) {

						if (data.length === 0) self.dataElementPlaceholder = "No valid data elements in " + self.dataElementGroupsSelected.name;
						else self.dataElementPlaceholder = "All data elements (totals) in " + self.dataElementGroupsSelected.name;
						self.dataElements = data;
					});
			}
			else {
				self.dataElementPlaceholder = "Loading...";
				metaDataService.getDataElementGroupMemberOperands(self.dataElementGroupsSelected.id)
					.then(function (data) {
						if (data.length === 0) self.dataElementPlaceholder = "No valid data elements in " + self.dataElementGroupsSelected.name;
						else self.dataElementPlaceholder = "All data elements (details) in " + self.dataElementGroupsSelected.name;

						self.dataElements = data;
					});
			}

		}

		self.updateIndicatorList = function () {
			if (!self.indicatorGroupsSelected) return;
			self.indicators = [];
			self.indicatorsSelected = [];
			self.indicatorPlaceholder = "Loading...";
			metaDataService.getIndicatorGroupMembers(self.indicatorGroupsSelected.id)
				.then(function (data) {
					if (data.length === 0) self.indicatorPlaceholder = "No indicators in " + self.indicatorGroupsSelected.name;
					else self.indicatorPlaceholder = "All indicators in " + self.indicatorGroupsSelected.name;
					self.indicators = data;
				});
		}


		self.filterLevels = function () {
			self.filteredOrgunitLevels = [];

			if (!self.orgunitLevels || !self.boundaryOrgunitSelected) return;
			for (var i = 0; i < self.orgunitLevels.length; i++) {
				if (self.orgunitLevels[i].level > self.boundaryOrgunitSelected.level) {
					self.filteredOrgunitLevels.push(self.orgunitLevels[i]);
				}
			}
		};

		function getLevelByLevel(level) {

			for (var i = 0; i < self.orgunitLevels.length; i++) {
				if (self.orgunitLevels[i].level === level) return self.orgunitLevels[i];
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


		function getDatasetDataelements() {

			var requestURL = '/api/dataSets/' + self.datasetSelected.id + '.json?fields=dataElements[id]';
			requestService.getSingle(requestURL).then(function (response) {
				self.datasetDataelements = response.data.dataElements;
				self.doAnalysis();
			});

		}


		self.doAnalysis = function () {

			//Collapse open panels
			angular.element('.panel-collapse').removeClass('in');
			angular.element('.panel-collapse').addClass('collapse');

			if (self.datasetSelected && !self.datasetDataelements) {
				getDatasetDataelements();
				return;
			}

			//Clear previous result
			self.result = undefined;
			if (self.results.length > 1) self.results.move(self.currentResult, 0);

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
		function sortName(a, b) {
			return a.name > b.name ? 1 : -1;
		}


		function notification(title, message) {
			var modalInstance = $modal.open({
				templateUrl: "appCommons/modalNotification.html",
				controller: "ModalNotificationController",
				controllerAs: 'nCtrl',
				resolve: {
					title: function () {
						return title;
					},
					message: function () {
						return message;
					}
				}
			});

			modalInstance.result.then(function (result) {
			});
		}


		//Directive will add its function here:
		self.resultControl = {};
		function receiveResult(result) {
			self.resultControl.receiveResult(result);
		}

		return self;
	});
})();