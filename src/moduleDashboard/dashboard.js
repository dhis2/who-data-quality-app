
(function(){

	//Define module
	angular.module('dashboard', []);

	//Define DashboardController
	angular.module('dashboard').controller("DashboardController",
	['periodService', 'visualisationService', 'dataAnalysisService', '$q', '$scope', 'd2Map', 'd2Meta',
	function(periodService, visualisationService, dataAnalysisService, $q, $scope, d2Map, d2Meta) {

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
		self.orgunitLevelSelected;
		self.orgunitLevels = [];


        /** ===== ANALYSIS ===== */
        
        /** COMPLETENESS */
        self.makeCompletenessCharts = function() {
        	if (!self.ready) return;
			if (self.completeness && !self.widthChanged[0]) {
				return;
			}
			else {
				self.completeness = true;
				self.widthChanged[0] = false;
			}

			var datasets = d2Map.groupDataSets(self.group.code);
			self.completenessCharts = [];
			self.expectedCompletenessCharts = datasets.length;
			self.cmpLoading = true;
			var ouBoundaryID = self.ouBoundary.id;

        	var dataset, periods, ouPeriod;
        	for (var i = 0; i < datasets.length; i++) {
               	dataset = datasets[i];

        		periods = periodService.getISOPeriods(self.startDate, self.endDate, dataset.periodType);
        		ouPeriod = periods[periods.length - 1];

				var level;
				if (self.orgunitLevelSelected) level = self.orgunitLevelSelected.level;

				var promises = [];
				promises.push(promiseObject(dataset));
				promises.push(visualisationService.lineChart(null, [dataset.id], periods, [ouBoundaryID], 'dataOverTime'));
				promises.push(visualisationService.barChart(null, [dataset.id], [ouPeriod], [ouBoundaryID], 'ou', level));

				$q.all(promises).then(function(datas) {

					var datasetCompletenessChart = {
						name: datas[0].name,
						id: datas[0].id,
						trendChartOptions: datas[1].opts,
						trendChartData: datas[1].data,
						ouChartOptions: datas[2].opts,
						ouChartData: datas[2].data
					};

					visualisationService.setChartLegend(datasetCompletenessChart.trendChartOptions, false);
					visualisationService.setChartYAxis(datasetCompletenessChart.trendChartOptions, 0, 100);

					visualisationService.setChartLegend(datasetCompletenessChart.ouChartOptions, false);
					visualisationService.setChartYAxis(datasetCompletenessChart.ouChartOptions, 0, 100);

					self.completenessCharts.push(datasetCompletenessChart);

					if (self.completenessCharts.length === self.expectedCompletenessCharts) self.cmpLoading = false;

				});

        	}

        };


    	
    	/** CONSISTENCY OVER TIME */
    	self.makeTimeConsistencyCharts = function() {
			if (!self.ready) return;
			if (self.consistency  && !self.widthChanged[1]) {
				return;
			}
			else {
				self.consistency = true;
				self.widthChanged[1] = false;
			}

      		self.consistencyCharts = [];
      		self.yyReceived = 0;

      		var ouBoundaryID = self.ouBoundary.id;
			var ouLevel;
			if (self.orgunitLevelSelected) ouLevel = self.orgunitLevelSelected.level;
      		var data, endDate, startDate, periodType, yyPeriods, period, refPeriods; 	
   			var datas = d2Map.groupNumerators(self.group.code);
			self.expectedConsistencyCharts = datas.length;
			self.tcLoading = true;
			var consistencyChart;
			for (var i = 0; i < datas.length; i++) {
      			
      			data = datas[i];
      			periodType = d2Map.dataSets(data.dataSetID).periodType;

      			refPeriods = periodService.getISOPeriods(self.startDate, self.endDate, periodType);
				period = refPeriods.pop();

      			yyPeriods = [];
				startDate = self.startDate;
				endDate = self.endDate;
      			yyPeriods.push(periodService.getISOPeriods(startDate, endDate, periodType));
      			for (var j = 0; j < 2; j++) {
      				startDate = moment(startDate).subtract(1, 'year');
      				endDate = moment(endDate).subtract(1, 'year');
      				yyPeriods.push(periodService.getISOPeriods(startDate, endDate, periodType));
      			}

				var promises = [];
				promises.push(promiseObject(data));
				promises.push(visualisationService.yyLineChart(null, yyPeriods, data.localData.id, ouBoundaryID));
				promises.push(dataAnalysisService.timeConsistency(null, data.trend, data.consistency, null, data.localData.id, null, period, refPeriods, ouBoundaryID, ouLevel, null));

				$q.all(promises).then(function(datas) {

					var data = datas[0];
					var yyLine = datas[1];
					var tConsistency = datas[2];

					//Add chart data to time consistency result object
					visualisationService.makeTimeConsistencyChart(null, tConsistency.result, null);


					var consistencyChart = {
						name: data.name,
						id: data.id,
						yyChartOptions: yyLine.opts,
						yyChartData: yyLine.data,
						consistencyChartOptions: tConsistency.result.chartOptions,
						consistencyChartData: tConsistency.result.chartData
					};


					visualisationService.setChartHeight(consistencyChart.yyChartOptions, 400);
					visualisationService.setChartLegend(consistencyChart.yyChartOptions, false);
					visualisationService.setChartYAxis(consistencyChart.yyChartOptions, 0, 100);
					//visualisationService.setChartMargins(consistencyChart.yyChartOptions, 20, 20, 100, 50);

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
			if (!self.ready) return;

			if (self.consistencyData && !self.widthChanged[2]) {
				return;
			}
			else {
				self.consistencyData = true;
				self.widthChanged[2] = false;
			}

			self.dataConsistencyCharts = [];

			var ouBoundaryID = self.ouBoundary.id;
			var ouLevel;
			if (self.orgunitLevelSelected) ouLevel = self.orgunitLevelSelected.level;


			var period;
			var endDate = moment(self.endDate);
			if (endDate.month() <= 5) {
				period = endDate.subtract(12, 'months').year();
			}
			else {
				period = endDate.year();
			}


			var relations = d2Map.groupRelations(self.group.code, false);
			self.expectedDataConsistencyCharts = relations.length;
			self.dcLoading = true;
			for (var i = 0; i < relations.length; i++) {
				var relation = relations[i];
				var indicatorA = d2Map.numerators(relation.A);
				var indicatorB = d2Map.numerators(relation.B);

				var promises = [];
				promises.push(relation);
				promises.push(dataAnalysisService.dataConsistency(null, relation.type, relation.criteria, relation.code, indicatorA.localData.id, indicatorB.localData.id, period, ouBoundaryID, ouLevel, null));
				$q.all(promises).then(function(datas) {
					var data = datas[0]
					var result = datas[1];
					if (result.result.type != 'do') {
						visualisationService.makeDataConsistencyChart(null, result.result, null);
					}
					else {
						visualisationService.makeDropoutRateChart(null, result.result, null);
					}

					var dataConsistencyChart = {
						name: data.name,
						period: result.result.pe,
						chartOptions: result.result.chartOptions,
						chartData: result.result.chartData
					};


					visualisationService.setChartHeight(dataConsistencyChart.chartOptions, 400);
					visualisationService.setChartLegend(dataConsistencyChart.chartOptions, true);
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
			if (!self.ready) return;

			if (self.outliers) {
				return;
			}
			else {
				self.outliers = true;
			}

			var level;
			if (self.orgunitLevelSelectedOutliers) level = self.orgunitLevelSelectedOutliers.level;


			//Get period IDs
			var periods = periodService.getISOPeriods(self.startDate, self.endDate, 'Monthly');


			//Get data IDs
			var data = d2Map.groupNumerators(self.group.code);
			var dataIDs = [];
			for (var i = 0; i < data.length; i++) {
				dataIDs.push(data[i].localData.id);
			}

			self.outLoading = true;
			dataAnalysisService.outlierGap(receiveResult, dataIDs, null, null, periods, [self.ouBoundary.id], level, null, 2, 3.5, 1);
		}



      	
      	/** ===== UTILITIES ===== */

		function promiseObject(object) {
			var deferred = $q.defer();
			deferred.resolve(object);
			return deferred.promise;
		}


		function getPeriodTypes(datasets) {
      		
  			var data, pTypes = {};
  			for (var i = 0; i < self.dataAvailable.length; i++) {
  				pTypes[self.dataAvailable[i].periodType] = true;
  			}
      			
      		for (pt in pTypes) {
      			self.periodTypes.push({'pt': pt});
      		}
      		
      	}


      	self.setWindowWidth = function() {

			var contentWidth = angular.element('.mainView').width();
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

			self.halfChart = Math.floor(chartWidth).toString() + 'px';
			self.contentWidth = Math.floor(contentWidth).toString() + 'px';

			for (var i = 0; i < 3; i++) {
				self.widthChanged[i] = true;
			}
			self.widthChanged[self.selectedTab] = false;

		}


		function sortName(a, b) {
			return a.name > b.name ? 1 : -1;
		}


		/** ===== OU TREE ===== */

		self.update = function() {
			self.completeness = false;
			self.consistency = false;
			self.consistencyData = false;
			self.outliers = false;

			self.startDate = moment(self.endDate).subtract(12, 'months').add(1, 'day');


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
		}


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
		}


		self.ouTreeInit = function () {

			if (self.ouTreeData) return;

			self.ouTreeData = [];
			self.ouTreeControl = {};

			//Get initial batch of orgunits and populate
			d2Meta.userAnalysisOrgunits().then(function (data) {

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
			if (orgunit.noLeaf && orgunit.children.length < 1 && orgunit.expanded) {

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
			self.currentSelection = orgunit;
			self.ouBoundary = orgunit.data.ou;
			self.filterLevels();
			self.orgunitUserDefaultLevel();
			self.update();
		}


		self.filterLevels = function () {
			self.filteredOrgunitLevels = [];
			self.filteredOrgunitLevelsOutliers = [];

			if (!self.orgunitLevels || !self.ouBoundary) return;
			for (var i = 0; i < self.orgunitLevels.length; i++) {
				var belowSelectedUnit = self.orgunitLevels[i].level > self.ouBoundary.level;
				var belowMaxDepth = self.orgunitLevels[i].level > (self.ouBoundary.level + 2);

				if (belowSelectedUnit && !belowMaxDepth) {
					self.filteredOrgunitLevels.push(self.orgunitLevels[i]);
				}
			}
			for (var i = 0; i < self.orgunitLevels.length; i++) {
				var belowSelectedUnit = self.orgunitLevels[i].level > self.ouBoundary.level;
				var belowMaxDepth = self.orgunitLevels[i].level > (self.ouBoundary.level + 3);

				if (belowSelectedUnit && !belowMaxDepth) {
					self.filteredOrgunitLevelsOutliers.push(self.orgunitLevels[i]);
				}
			}
		};


		self.orgunitUserDefaultLevel = function () {

			if (!self.ouBoundary || !self.filteredOrgunitLevels) return;

			var level = self.ouBoundary.level;
			for (var i = 0; i < self.filteredOrgunitLevels.length; i++) {
				if (self.filteredOrgunitLevels[i].level === (level + 1)) {
					self.orgunitLevelSelected = self.filteredOrgunitLevels[i];
				}
			}

			if (!self.ouBoundary || !self.filteredOrgunitLevelsOutliers) return;
			var level = self.ouBoundary.level;
			for (var i = 0; i < self.filteredOrgunitLevelsOutliers.length; i++) {
				if (self.filteredOrgunitLevelsOutliers[i].level === (level + 2)) {
					self.orgunitLevelSelectedOutliers = self.filteredOrgunitLevelsOutliers[i];
				}
			}

			if (self.filteredOrgunitLevels.length === 0) self.orgunitLevelSelected = undefined;
			if (self.filteredOrgunitLevelsOutliers.length === 0) self.orgunitLevelSelectedOutliers = undefined;

		};


		
      	/** ===== INIT ===== */		
      	
      	function init() {
			self.ready = true;
			if (angular.element('.mainView').width() > 1280) {
				self.showParameters = true;
			}
			else {
				self.showParameters = false;
			}

			self.widthChanged = [];
			for (var i = 0; i < 3; i++) {
				self.widthChanged[i] = false;
			}

			self.setWindowWidth();
      		$( window ).resize(function() {
      			self.setWindowWidth();
				$scope.$apply();
      		});

			self.ouTreeInit();
      		
      		self.group = {name: 'Core', code: 'core'};
			self.groups = d2Map.groups();
			self.groups.unshift(self.group);

			self.selectedTab = 0;

			var promises = [];
			promises.push(d2Meta.userOrgunit());
			promises.push(d2Meta.objects('organisationUnitLevels', null, 'name,id,level'));
			$q.all(promises).then(function(datas) {
				self.ouBoundary = datas[0];
				self.orgunitLevels = datas[1];

				self.lowestLevel = 0;
				for (var i = 0; i < self.orgunitLevels.length; i++) {
					var level = self.orgunitLevels[i].level;
					if (level > self.lowestLevel) self.lowestLevel = level;
				}

				self.filterLevels();
				self.orgunitUserDefaultLevel();

				//Completeness is the default tab
				self.makeCompletenessCharts();
			});



			self.endDate = moment().subtract(new Date().getDate(), 'days');
			self.startDate = moment(self.endDate).subtract(12, 'months').add(1, 'day');
      	}

		if (d2Map.ready()) {
			init();
		}
		else {
			d2Map.load().then(
				function(data) {
					init();
				},
				function (error) {
					console.log("Failed to load metadata for dashboard");
				}
			);
		}

		self.partialGroupUrl='moduleDashboard/selectGroup.html';
		self.partialDateUrl='moduleDashboard/selectPeriod.html';
		self.partialOuUrl='moduleDashboard/selectOu.html';
			
			
			
		return self;
		
	}]);
})();