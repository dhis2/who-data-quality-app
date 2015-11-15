(function(){
	
	angular.module('review', []);

	angular.module('review').controller("ReviewController",
	['d2Meta','d2Map', 'periodService', 'dataAnalysisService', 'visualisationService', 'dqAnalysisConsistency', '$timeout', 'd2Utils',
	function(d2Meta, d2Map, periodService, dataAnalysisService, visualisationService, dqAnalysisConsistency, $timeout, d2Utils) {
		var self = this;    

		//Check if map is loaded, if not, do that before initialising
		if (!d2Map.ready()) {
			d2Map.load().then(
				function(data) {
					init();
				}
			);
		}
		else {
			init();
		}
	    function init() {

			initPrint();

	    	self.notPossible = false;
	    	self.totalRequests = 0;
	    	self.outstandingRequests = 0;
	    	
	    	self.remarks = [];

			self.selectedOrgunit = {};
	    	
	    	self.years = periodService.getYears();
	    	self.years.shift();
	    	self.yearSelected = self.years[0];
	    	
	    	self.groups = [];
	    	self.groupSelected = undefined;

			//Accordion settings
			self.oneAtATime = true;
			self.status = {
				isFirstOpen: true
			};

			self.groups = d2Map.configuredGroups();
			self.groups.unshift({'name': '[ Core ]', 'code': 'core'});
			self.groupSelected = self.groups[0];
		}



	  	/** START ANALYSIS*/
	  	self.doAnalysis = function() {

			//Collapse open panels
			angular.element('.panel-collapse').removeClass('in');
			angular.element('.panel-collapse').addClass('collapse');
	  		
	  		clearResults();
	  		self.outstandingRequests = 0;

			var groupCode = self.groupSelected.code;

	  		//Metadata for queries
	  		var datasets = d2Map.groupDataSets(groupCode);
	  		var indicators = d2Map.groupNumerators(groupCode, true);

	  		
	  		var period = self.yearSelected.id;
	  		var refPeriods = precedingYears(self.yearSelected.id, 3);
	  		
	  		var ouBoundary = self.selectedOrgunit.boundary.id;
	  		var ouLevel = self.selectedOrgunit.level.level;
	  		
	  		
	  		//1 Get dataset completeness and consistency
	  		var datasetIDsForConsistencyChart = [];
	  		for (var i = 0; i < datasets.length; i++) {
	  			//completeness
	  			dataAnalysisService.datasetCompleteness(receiveDatasetCompleteness, datasets[i].threshold, datasets[i].id, period, ouBoundary, ouLevel);
	  			
	  			//consistency
				dqAnalysisConsistency.analyse(datasets[i].id, null, period, refPeriods, ouBoundary, ouLevel, null, 'time', datasets[i].trend, datasets[i].consistencyThreshold, null).then(
					function (data) {
						self.completeness.consistency.push(data.result);
						if (data.errors) self.remarks = self.remarks.concat(data.errors);
						self.outstandingRequests--;
					}
				);
	  			
	  			datasetIDsForConsistencyChart.push(datasets[i].id);
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
	  			
	  			
				dataAnalysisService.dataCompleteness(receiveDataCompleteness, indicator.missing, indicator.dataID, null, periods, ouBoundary, ouLevel);

				dqAnalysisConsistency.analyse(indicator.dataID, null, period, refPeriods, ouBoundary, ouLevel, null, 'time', indicator.trend, indicator.consistency, null).then(
					function (data) {
						var errors = data.errors;
						var result = data.result;

						if (result) {
							visualisationService.makeTimeConsistencyChart(null, result, null);
							self.consistency.data.push(result);
						}
						if (errors) {
							self.remarks = self.remarks.concat(errors);
						}
						self.outstandingRequests--;
					}
				)
				
				dataAnalysisService.indicatorOutlier(receiveDataOutliers, indicator, periods, ouBoundary, ouLevel);
				
				indicatorIDsForConsistencyChart.push(indicator.dataID);
				self.outstandingRequests += 3;
	  		}

	  		//3 Indicator relations
	  		var relations = d2Map.groupRelations(self.groupSelected.code, false);
	  		for (var i = 0; i < relations.length; i++) {
	  			var relation = relations[i];
	  			var indicatorA = d2Map.numerators(relation.A);
	  			var indicatorB = d2Map.numerators(relation.B);

				dqAnalysisConsistency.analyse(indicatorA.dataID, indicatorB.dataID, period, null, ouBoundary, ouLevel, null, 'data', relation.type, relation.criteria, relation).then(
					function(data) {
						var errors = data.errors;
						var result = data.result;
						if (errors) self.remarks = self.remarks.concat(errors);

						//Check type and format data accordingly for charts
						if (result.subType === 'do') {
							visualisationService.makeDropoutRateChart(null, result);
						}
						else {
							visualisationService.makeDataConsistencyChart(null, result);
						}


						result.relationCode = result.meta.code;

						self.consistency.relations.push(result);
						self.outstandingRequests--;
					}
				)
				self.outstandingRequests++;

	  		}



			//4 Denominator consistency
			var denominator, denominatorChecks = d2Map.denominatorsConfigured();
			for (var i = 0; i < denominatorChecks.length; i++) {
				denominator = denominatorChecks[i];

				var meta = {name: denominator.name};

				dqAnalysisConsistency.analyse(denominator.idA, denominator.idB, period, null, ouBoundary, ouLevel, null, 'data', 'eq', denominator.criteria, meta)
					.then(function(data) {

						self.outstandingRequests--;

						if (data.errors) self.remarks = self.remarks.concat(data.errors);

						visualisationService.makeDataConsistencyChart(null, data.result);

						if (denominator.type != 'un') {
							self.denominators.relations.push(data.result);
						}
						else {
							self.denominators.un = data.result;
						}

						console.log(self.denominators);

				});

				self.outstandingRequests++;
			}



	  		
	  		self.totalRequests = self.outstandingRequests;
			
			//Completeness consistency chart
			visualisationService.lineChart(receiveDatasetTimeConsistencyChart, datasetIDsForConsistencyChart, refPeriods.concat(period), [ouBoundary], 'dataOverTime');
			
			//Indicator consistency chart
			visualisationService.lineChart(receiveDataTimeConsistencyChart, indicatorIDsForConsistencyChart, refPeriods.concat(period), [ouBoundary], 'dataOverTime');
			
			
	  	};


	  	function clearResults() {
	  		//Structure for storing data
  			self.completeness = {
  				'datasets':	 [],
  				'consistency': [],
  				'indicators':	 []
  			};
  			
  			self.outliers = [];
  			
  			self.consistency = {
  				'data':		 [],
  				'relations':	 []
  			};
  			
  			self.dataConsistencyChart = {};
  			self.datasetConsistencyChart = {};

			self.denominators = {
				'un': null,
				'relations': []
			};
  			
  			self.remarks = [];
	  	}
	  	
	  	
	  	function receiveDatasetTimeConsistencyChart(chartData, chartOptions) {

  			chartOptions.chart.forceY = [0,100];
  			chartOptions.chart.yAxis = {
  				'axisLabel': "% Completeness"
  			};
  			chartOptions.chart.margin.left = 80;
			chartOptions.chart.margin.right = 40;
  			chartOptions.chart.margin.bottom = 40;
			delete chartOptions.chart['height'];
  			
  			
  			self.datasetConsistencyChart.options = chartOptions;
  			self.datasetConsistencyChart.data = chartData; 	
  			  			
  		}


	  	function receiveDataTimeConsistencyChart(chartData, chartOptions) {
	  		
	  		chartOptions.chart.title = {
	  			'enable': true,
	  			'text': 'Reporting over time'
	  		};
	  		chartOptions.chart.margin.left = 60;
  			chartOptions.chart.margin.bottom = 40;
			delete chartOptions.chart['height'];

			self.dataConsistencyChart.options = chartOptions;
			self.dataConsistencyChart.data = chartData;

	  	}



	  	/**CALLBACKS FOR RESULTS*/
	  	
	  	function receiveDatasetCompleteness(result, errors) { 
	  			self.completeness.datasets.push(result);
	  			if (errors) self.remarks = self.remarks.concat(errors);
		  		self.outstandingRequests--;
	  	}

	  	
	  	function receiveDataCompleteness(result, errors) { 
	  			self.completeness.indicators.push(result);
	  			
	  			if (errors) self.remarks = self.remarks.concat(errors);
		  		self.outstandingRequests--;
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
	  		
	  		return years.sort(function(a, b){return a-b});
	  	
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
		}

		/** DHIS 2 names */
		self.nameFromID = function(id) {
			return d2Map.d2NameFromID(id);
		}


		/** PRINT */
		function initPrint() {
			//http://tjvantoll.com/2012/06/15/detecting-print-requests-with-javascript/
			if (window.matchMedia) {
				var mediaQueryList = window.matchMedia('print');
				mediaQueryList.addListener(function(mql) {
					if (!mql.matches) {
						printDone();
					}
				});
			}

			window.onafterprint = printDone;
		}


		self.doPrint = function () {

			//Workaround for nvd3 charts. print css does not give time for charts to update
			angular.element('.bigChart').width('860px');
			angular.element('.bigChart').height('300px');
			angular.element('.smallChart').width('422px');
			angular.element('.relationChart').width('552px');


			window.dispatchEvent(new Event('resize'));

			interpretationToParagraph();

			//Give charts time to finish animation
			$timeout(function () { window.print(); }, 3000);

		}


		function printDone() {

			//Remove the chart scaling
			var classes = ['.bigChart', '.smallChart', '.relationTableHolderPrint', '.relationChartPrint'];
			for (var i = 0; i < classes.length; i++) {
				var elements = angular.element(classes[i]);
				for (var j = 0; j < elements.length; j++) {
					elements[j].style.width = null;

					if (classes[i] === '.bigChart') {
						elements[j].style.height = null;
					}
				}
			}

			angular.element('.tablePrint').addClass('table');
			angular.element('.tablePrint').addClass('table-bordered');

			window.dispatchEvent(new Event('resize'));

			interpretationFromParagraph();
		}


		function interpretationToParagraph() {
			var textAreas = angular.element('.interpretation');

			for (var i = 0; i < textAreas.length; i++) {
				var text = textAreas[i].value;
				var parent = textAreas[i].parentElement;

				//If no text, remove heading
				if (text === '') {
					var header = textAreas[i].previousElementSibling;
					header.classList.add('no-print');
				}
				else {
					var header = textAreas[i].previousElementSibling;
					header.classList.remove('no-print');
				}
				parent.innerHTML += '<p class="interpretationText">' + text + '</p>';
			}

			angular.element('.interpretation').remove();
		}


		function interpretationFromParagraph() {
			var textAreas = angular.element('.interpretationText');

			for (var i = 0; i < textAreas.length; i++) {
				var text = textAreas[i].innerHTML;
				var parent = textAreas[i].parentElement;
				parent.innerHTML += '<textarea class="interpretation">' + text + '</textarea>';
			}

			angular.element('.interpretationText').remove();
		}


	    	    
		return self;
		
	}]);
	
})();

