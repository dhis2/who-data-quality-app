(function(){
	
	angular.module('review', []);

	angular.module('review').controller("ReviewController",
	['metaDataService', 'periodService', 'mathService', 'requestService', 'dataAnalysisService', 'visualisationService',
		'dqAnalysisConsistency', '$timeout',
	function(metaDataService, periodService, mathService, requestService, dataAnalysisService, visualisationService,
			 dqAnalysisConsistency, $timeout) {
		var self = this;    
		
	    init();

	    function init() {

			initPrint();

	    	self.notPossible = false;
	    	self.totalRequests = 0;
	    	self.outstandingRequests = 0;
	    	
	    	self.remarks = [];
	    	
	    	self.orgunitLevels = [];
	    	self.orgunitLevelSelected = undefined;
	    	
	    	self.userOrgunit = undefined;
	    	
	    	self.years = periodService.getYears();
	    	self.years.shift();
	    	self.yearSelected = self.years[0];
	    	
	    	self.groups = [];
	    	self.groupSelected = undefined;
	    	
	    	
	    	
	    	metaDataService.getUserOrgunit().then(function(data) { 
	    		self.userOrgunit = data;
	    		
	    		metaDataService.getOrgunitLevels().then(function(data) { 
	    			var validLevels = [];
	    			
	    			for (var i = 0; i < data.length; i++) {
	    				if (data[i].level > self.userOrgunit.level && data[i].level <= self.userOrgunit.level+3) {
	    					validLevels.push(data[i]);
	    				}
	    			}
	    			
	    			self.orgunitLevels = validLevels;
	    			if (self.orgunitLevels.length === 0) {
	    				self.notPossible = true;
	    			}
	    		});
	    		
	    	});


	    	//Get mapped data
	    	requestService.getSingle('/api/systemSettings/DQAmapping').then(function(response) {
	    		
	    		self.map = response.data;
	    		
	    		self.groups = response.data.groups;
	    		self.groups.unshift({'name': '[ Core ]', 'code': 'C'});
	    		self.groupSelected = self.groups[0];
	    	});


			metaDataService.getMapping(false);
	    }
	  	
	  	/** START ANALYSIS*/
	  	self.doAnalysis = function() {
	  		
	  		clearResults();
	  		self.outstandingRequests = 0;

	  		//Metadata for queries
	  		var datasets = datasetsForAnalysis();
	  		var indicators = indicatorsForAnalysis();
	  		
	  		var period = self.yearSelected.id;
	  		var refPeriods = precedingYears(self.yearSelected.id, 3);
	  		
	  		var ouBoundary = self.userOrgunit.id;
	  		var ouLevel = self.orgunitLevelSelected.level;
	  		
	  		
	  		//1 Get dataset completeness and consistency
	  		var datasetIDsForConsistencyChart = [];
	  		for (var i = 0; i < datasets.length; i++) {
	  			//completeness
	  			dataAnalysisService.datasetCompleteness(receiveDatasetCompleteness, datasets[i].threshold, datasets[i].id, period, ouBoundary, ouLevel);
	  			
	  			//consistency
	  			dataAnalysisService.timeConsistency(receiveDatasetTimeConsistency, datasets[i].trend, datasets[i].consistencyThreshold, 100, datasets[i].id, null, period, refPeriods, ouBoundary, ouLevel, null);
	  			
	  			datasetIDsForConsistencyChart.push(datasets[i].id);
	  			self.outstandingRequests += 2;
	  		}
	  		
			  		
  		  	//2 Get indicator completeness, consistency, outliers
	  		var indicatorIDsForConsistencyChart = [];
	  		for (var i = 0; i < indicators.length; i++) {
	  		
	  			var indicator = indicators[i];
	  			var periodType = periodTypeFromIndicator(indicator.code);
	  			
	  			//periods for data completeness
	  			var startDate = self.yearSelected.id.toString() + "-01-01";
	  			var endDate = self.yearSelected.id.toString() + "-12-31";
	  			var periods = periodService.getISOPeriods(startDate, endDate, periodType);	  			
	  			
	  			
				dataAnalysisService.dataCompleteness(receiveDataCompleteness, indicator.missing, indicator.localData.id, null, periods, ouBoundary, ouLevel);
				
				dataAnalysisService.timeConsistency(receiveDataTimeConsistency, indicator.trend, indicator.consistency, null, indicator.localData.id, null, period, refPeriods, ouBoundary, ouLevel, null);
				
				dataAnalysisService.indicatorOutlier(receiveDataOutliers, indicator, periods, ouBoundary, ouLevel);
				
				indicatorIDsForConsistencyChart.push(indicator.localData.id);
				self.outstandingRequests += 3;
	  		}
	  		
	  		
	  		//3 Indicator relations
	  		var relations = relationsForAnalysis();
	  		for (var i = 0; i < relations.length; i++) {
	  			var relation = relations[i];
	  			var indicatorA = indicatorFromCode(relation.A);
	  			var indicatorB = indicatorFromCode(relation.B);
	  			
	  			dataAnalysisService.dataConsistency(receiveDataConsistency, relation.type, relation.criteria, relation.code, indicatorA.localData.id, indicatorB.localData.id, period, ouBoundary, ouLevel, null);
	  			
	  			self.outstandingRequests++;
	  		}


			//4 Denominator consistency
			var denominator, denominatorChecks = metaDataService.denominatorRelations();
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
	  	
	  	
	  	function receiveDatasetTimeConsistency(result, errors) { 
	  			self.completeness.consistency.push(result);
	  			if (errors) self.remarks = self.remarks.concat(errors);
	  			self.outstandingRequests--;
	  	}
	  	
	  	
	  	function receiveDataCompleteness(result, errors) { 
	  			self.completeness.indicators.push(result);
	  			
	  			if (errors) self.remarks = self.remarks.concat(errors);
		  		self.outstandingRequests--;
	  	}
	  	
	  		
	  	function receiveDataTimeConsistency(result, errors) {
  			if (result) {
	  			visualisationService.makeTimeConsistencyChart(null, result, null);
  				self.consistency.data.push(result);
  			}  				
  			if (errors) {
  				self.remarks = self.remarks.concat(errors);
  			}
	  		self.outstandingRequests--;
  		}
	  	
	  	
	  	function receiveDataOutliers(result) {
	  		self.outliers.push(result);
	  		self.outstandingRequests--;
	  	}
	  	
	  	
	  	function receiveDataConsistency(result, errors) {
	  		if (errors) self.remarks = self.remarks.concat(errors);
	  			
  			//Check type and format data accordingly for charts
  			if (result.type === 'do') {
  				visualisationService.makeDropoutRateChart(null, result);
  			}
  			else {
	  			visualisationService.makeDataConsistencyChart(null, result);
  			}
  			self.consistency.relations.push(result);
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
		
		function periodTypeFromDataSet(dataSetID) {
			for (var i = 0; i < self.map.dataSets.length; i++) {
				if (dataSetID === self.map.dataSets[i].id) return self.map.dataSets[i].periodType;
			}
		}
		
		function periodTypeFromIndicator(code) {
		
			return periodTypeFromDataSet(indicatorFromCode(code).dataSetID);

		}

	  	/** DATASETS */		
		function datasetsForAnalysis() {
			
			var datasetIDs = {};
			var indicators = indicatorsForAnalysis();
			for (var i = 0; i < indicators.length; i++) {
			
				var indicator = indicators[i];
				if (indicator.matched) datasetIDs[indicator.dataSetID] = true;
			}
			
			var datasets = [];
			for (key in datasetIDs) {
				for (var i = 0; i < self.map.dataSets.length; i++) {
					if (self.map.dataSets[i].id === key) {
						datasets.push(self.map.dataSets[i]);
					}
				}
			}
			
			return datasets;
		}
		
		
	  	/** INDICATORS */	  	
		function indicatorsForAnalysis() {
			
			//First find all that might be relevant
			var IDs;
			if (self.groupSelected.code === 'C') {
				IDs = self.map.coreIndicators;
			}
			else {
				for (var i = 0; i < self.map.groups.length; i++) {
					if (self.map.groups[i].code === self.groupSelected.code) {
						IDs = self.map.groups[i].members;
					}
				}
			}
			
			//Then filter out the ones matched to local data
			var indicator, matchedIndicators = [];
			for (var i = 0; i < IDs.length; i++) {
				indicator = indicatorFromCode(IDs[i]);
				if (indicator.matched) matchedIndicators.push(indicator);
			}
			
			return matchedIndicators;
			
			
		}
		
		
		function indicatorFromCode(code) {
			for (var i = 0; i < self.map.data.length; i++) {
				if (self.map.data[i].code === code) return self.map.data[i];
			}
		}
		
		
		//Returns true/false depending on whether indicator is in selected group
		function indicatorIsRelevant(code) {
		
			var indicators = indicatorsForAnalysis();
		
			for (var i = 0; i < indicators.length; i++) {				
				if (indicators[i].code === code) return true
			}

			return false;
		}
		
		
	    
	    
   	  	/** RELATIONS */
	    self.relationTypeName = function(code) {
	    
	    	if (code === 'eq') return "Equal";
	    	if (code === 'aGTb') return "A > B";
	    	if (code === 'do') return "Dropout";
	    	
	    };
	    
	    
	    self.relationName = function(code) {
	    
	    	var relations = relationsForAnalysis();
	    	for (var i = 0; i < relations.length; i++) {
	    		if (relations[i].code === code) return relations[i].name;
	    	}
	    	
	    };
	    
	    //Returns relations relevant for the selected group (i.e. both indicators are in the group)
	    function relationsForAnalysis() {
	    	
	    	var relation, relations = [];
	    	for (var i = 0; i < self.map.relations.length; i++) {
	    		relation = self.map.relations[i];
	    		
	    		if (indicatorIsRelevant(relation.A) || indicatorIsRelevant(relation.B)) {
	    			relations.push(relation);
	    		}
	    	}
	    	return relations;	
	    }
	    
	    
	    
  	  	/** UTILITIES */


	    self.updateCharts = function() {
			$timeout(function () { window.dispatchEvent(new Event('resize')); }, 100);
		};


		self.progress = function() {

			return Math.round(100-100*self.outstandingRequests/self.totalRequests);

		};

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
			$timeout(function () { window.print(); }, 1000);

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

