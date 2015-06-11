
(function(){
	
	var app = angular.module('reportCard', []);
	
	app.controller("ReviewController", function(metaDataService, periodService, mathService, requestService, dataAnalysisService, visualisationService, $timeout, $scope) {
		var self = this;    
		
	    init();

	    function init() {
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
	    	
	    	
	    	
	    	metaDataService.getUserOrgunits().then(function(data) { 
	    		self.userOrgunit = data[0];
	    		
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
	  			dataAnalysisService.timeConsistency(receiveDatasetTimeConsistency, datasets[i].trend, datasets[i].consistencyThreshold, 100, datasets[i].id, null, period, refPeriods, ouBoundary, ouLevel);
	  			
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
				
				dataAnalysisService.timeConsistency(receiveDataTimeConsistency, indicator.trend, indicator.consistency, null, indicator.localData.id, null, period, refPeriods, ouBoundary, ouLevel);
				
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
	  			
	  			dataAnalysisService.dataConsistency(receiveDataConsistency, relation.type, relation.criteria, relation.code, indicatorA.localData.id, indicatorB.localData.id, period, ouBoundary, ouLevel);
	  			
	  			self.outstandingRequests++;
	  		}
	  		
	  		self.totalRequests = self.outstandingRequests;
			
			//Completeness consistency chart
			visualisationService.lineChart(receiveDatasetTimeConsistencyChart, datasetIDsForConsistencyChart, refPeriods.concat(period), [ouBoundary], 'dataOverTime');
			
			//Indicator consistency chart
			visualisationService.lineChart(receiveDataTimeConsistencyChart, indicatorIDsForConsistencyChart, refPeriods.concat(period), [ouBoundary], 'dataOverTime');
			
			
	  	}
	  	
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
  			
  			self.remarks = [];
	  	}
	  	
	  	
	  	function receiveDatasetTimeConsistencyChart(chartData, chartOptions) {
  			//Customise a bit
  			chartOptions.title = {
  				'enable': true,
  				'text': 'Reporting completeness over time'
  			};
  			chartOptions.chart.forceY = [0,100];
  			chartOptions.chart.yAxis = {
  				'axisLabel': "% Completeness"
  			};
  			chartOptions.chart.margin.left = 80;
  			chartOptions.chart.margin.bottom = 40;
  			
  			
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
		  			makeTimeConsistencyChart(result);
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
  				makeDropoutRateChart(result);
  			}
  			else {
	  			makeDataConsistencyChart(result);
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
	    	
	    }
	    
	    
	    self.relationName = function(code) {
	    
	    	var relations = relationsForAnalysis();
	    	for (var i = 0; i < relations.length; i++) {
	    		if (relations[i].code === code) return relations[i].name;
	    	}
	    	
	    }
	    
	    //Returns relations relevant for the selected group (i.e. both indicators are in the group)
	    function relationsForAnalysis() {
	    	
	    	var relation, relations = [];
	    	for (var i = 0; i < self.map.relations.length; i++) {
	    		relation = self.map.relations[i];
	    		
	    		if (indicatorIsRelevant(relation.A) && indicatorIsRelevant(relation.B)) {
	    			relations.push(relation);
	    		}
	    	}
	    	return relations;	
	    }
	    
	    
	    
  	  	/** CHARTS */
  	  	function makeTimeConsistencyChart(result) {	    		    	
  	  		    
	    	var datapoints = result.subunitDatapoints;
	    	var boundaryRatio = result.boundaryRatio;
	    	var consistency = result.threshold; 
	    		    	
	    	var toolTip = function(key, x, y, e, graph) {
	    		var data = result.subunitDatapoints;
	    		
	    		var toolTipHTML = '<h3>' + data[graph.pointIndex].name + '</h3>';
    			toolTipHTML += '<p style="margin-bottom: 0px">' + result.pe + ': ' + y + '</p>';
	    		if (result.type === 'constant') {
	    			toolTipHTML += '<p>Average: ' + x + '</p>'; 	    			
	    		}
	    		else {
	    			toolTipHTML += '<p>Forecasted: ' + x + '</p>'; 	    			
	    		}
	    	    return toolTipHTML;
	    	};
	    	
	    	
	    	var chartSeries = [];
	    	var chartSerie = {
	    		'key': self.orgunitLevelSelected.name + "s",
	    		'values': []
	    	}
	    	
	    	for (var i = 0; i < datapoints.length; i++) {
	    		chartSerie.values.push({
	    			'x': datapoints[i].refValue,
	    			'y': datapoints[i].value
	    		});
	    	}

	    	chartSeries.push(chartSerie);
	    	chartSeries.push(
	    		{
	    			'key': "Overall",
	    			'color': '#ffff',
	    			'values': [{
	    			'x': 0,
	    			'y': 0,
	    			'size': 0
	    			}
	    			],
	    			'slope': boundaryRatio,
	    			'intercept': 0.001
	    		},
	    		{
	    			'key': "+ " + consistency + "%",
	    			'color': '#F00',
	    			'values': [{
	    			'x': 0,
	    			'y': 0,
	    			'size': 0
	    			}
	    			],
	    			'slope': boundaryRatio+consistency/100,
	    			'intercept': 0.001
	    		},
	    		{
	    			'key': "- " + consistency + "%",
	    			'color': '#00F',
	    			'values': [{
	    			'x': 0,
	    			'y': 0,
	    			'size': 0
	    			}
	    			],
	    			'slope': boundaryRatio-consistency/100,
	    			'intercept': 0.001
	    		}
	    	);
	    		    	
			var xAxisLabel;
			if (result.type === "constant") xAxisLabel = "Average of previous periods";
			else xAxisLabel = "Forecasted value";
			
	    	result.chartOptions = {
	    	   	"chart": {
	    	        "type": "scatterChart",
	    	        "height": 300,
	    	        "margin": {
	    	          "top": 10,
	    	          "right": 30,
	    	          "bottom": 100,
	    	          "left": 50
	    	        },
	    	        "scatter": {
	    	        	"onlyCircles": false
	    	        },
	    	        "clipEdge": false,
	    	        "staggerLabels": true,
	    	        "transitionDuration": 1,
	    	        "showDistX": true,
	    	        "showDistY": true,
	    	        "xAxis": {
	    	              "axisLabel": xAxisLabel,
	    	              "axisLabelDistance": 30,
	    	              "tickFormat": d3.format('g')
	    	        },
	    	        "yAxis": {
	    	        	"axisLabel": result.pe,
	    	            "axisLabelDistance": 30,
	    	            "tickFormat": d3.format('g')
	    	        },
	    	        'tooltips': true,
	    	        'tooltipContent': toolTip
	    	        
	    	    },
	    	    "title": {
	    	    	'enable': true,
	    	    	'text': result.dxName
	    	    },
	    	    "subtitle": {
	    	    	'enable': false
	    	    }
	    	};
	    	
	    	result.chartData = chartSeries;
	    }
  	  	
  	  		    
	    function makeDataConsistencyChart(result) {	    		    	
	    
	    	var datapoints = result.subunitDatapoints;
	    	var boundaryRatio = result.boundaryRatio;
	    	var consistency = result.criteria; 
	    		    	
	    	var toolTip = function(key, x, y, e, graph) {
	    		var data = result.subunitDatapoints;
	    	    return '<h3>' + data[graph.pointIndex].name + '</h3>' +
	    	        '<p style="margin-bottom: 0px">' + result.dxNameA + ': ' + y + '</p>' + 
	    	        '<p>' + result.dxNameB + ': ' + x + '</p>'; 
	    	};
	    	
	    	
	    	var chartSeries = [];
	    	var chartSerie = {
	    		'key': self.orgunitLevelSelected.name + "s",
	    		'values': []
	    	}
	    	
	    	for (var i = 0; i < datapoints.length; i++) {
	    		chartSerie.values.push({
	    			'x': datapoints[i].refValue,
	    			'y': datapoints[i].value
	    		});
	    	}

	    	chartSeries.push(chartSerie);
	    	chartSeries.push(
	    		{
	    			'key': "Overall",
	    			'color': '#ffff',
	    			'values': [{
	    			'x': 0,
	    			'y': 0,
	    			'size': 0
	    			}
	    			],
	    			'slope': boundaryRatio,
	    			'intercept': 0.001
	    		},
	    		{
	    			'key': "+ " + consistency + "%",
	    			'color': '#F00',
	    			'values': [{
	    			'x': 0,
	    			'y': 0,
	    			'size': 0
	    			}
	    			],
	    			'slope': boundaryRatio+consistency/100,
	    			'intercept': 0.001
	    		},
	    		{
	    			'key': "- " + consistency + "%",
	    			'color': '#00F',
	    			'values': [{
	    			'x': 0,
	    			'y': 0,
	    			'size': 0
	    			}
	    			],
	    			'slope': boundaryRatio-consistency/100,
	    			'intercept': 0.001
	    		}
	    	);
	    	result.chartOptions = {
	    	   	"chart": {
	    	        "type": "scatterChart",
	    	        "height": 300,
	    	        "margin": {
	    	          "top": 10,
	    	          "right": 30,
	    	          "bottom": 80,
	    	          "left": 50
	    	        },
	    	        "scatter": {
	    	        	"onlyCircles": false
	    	        },
	    	        "clipEdge": false,
	    	        "staggerLabels": true,
	    	        "transitionDuration": 1,
	    	        "showDistX": true,
	    	        "showDistY": true,
	    	        "xAxis": {
	    	              "axisLabel": result.dxNameA,
	    	              "axisLabelDistance": 30,
	    	              "tickFormat": d3.format('g')
	    	        },
	    	        "yAxis": {
	    	        	"axisLabel": result.dxNameB,
	    	            "axisLabelDistance": 30,
	    	            "tickFormat": d3.format('g')
	    	        },
	    	        'tooltips': true,
	    	        'tooltipContent': toolTip
	    	    }
	    	};
	    	
	    	result.chartData = chartSeries;
	    }
	    
	    
	    function makeDropoutRateChart(result) {	    		    	
	    	var chartSeries = [];
	    	var chartSerie = {
	    		'key': self.orgunitLevelSelected.name + "s",
	    		'values': []
	    	}

	    	var toolTip = function(key, x, y, e, graph) {
	    		var data = result.subunitDatapoints;
	    	    return '<h3>' + data[x].name + '</h3>' +
	    	        '<p>' +  mathService.round(100*(data[x].value-data[x].refValue)/data[x].value,1)  + '% dropout</p>'
	    	};
	    	
	    	var minVal = 0.9;
	    	var maxVal = 2;
	    	var point, value;
	    	for (var i = 0; i < result.subunitDatapoints.length; i++) {
	    		point = result.subunitDatapoints[i];
	    		value = point.value/point.refValue;
	    		
	    		if (value > maxVal) maxVal = value;
	    		else if (value < minVal) minVal = value;
	    		
	    		chartSerie.values.push({
	    			'x': i,
	    			'y': mathService.round(value, 2)
	    		});
	    	}

	    	chartSeries.push(chartSerie);	    	
	    	result.chartData = chartSeries;    	
	    	
	    	result.chartOptions = {
	    	   	"chart": {
	    	        "type": "lineChart",
	    	        "height": 300,
	    	        "margin": {
	    	          "top": 10,
	    	          "right": 30,
	    	          "bottom": 60,
	    	          "left": 50
	    	        },
	    	        "xAxis": {
	    	          "showMaxMin": false,
	    	          'axisLabel': axisLabel = self.orgunitLevelSelected.name + "s"
	    	        },
	    	        "yAxis": {
	    	          "axisLabel": "Ratio"
	    	        },
	    	        'tooltips': true,
	    	        'tooltipContent': toolTip,
	    	        'showLegend': true,
	    	      	'forceY': [Math.floor(minVal*10)/10, Math.ceil(maxVal*10)/10], 
	    	    }
	    	}
	    }
	    
	    self.updateCharts = function() {
	    	$timeout(function() {
	    		for (var i = 0; i < nv.graphs.length; i++) {
	    			nv.graphs[i].update();
	    		}
	    		window.dispatchEvent(new Event('resize'));
	    	});
	    }
	    	    
	    	    
		return self;
		
	});
	
})();

