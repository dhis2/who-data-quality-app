
(function(){
	
	var app = angular.module('reportCard', []);
	
	app.controller("ReviewController", function(metaDataService, periodService, mathService, requestService, dataAnalysisService, visualisationService) {
		var self = this;    
		
	    init();

	    function init() {
	    	self.notPossible = false;
	    	self.completeness = null;
	    	
	    	self.alerts = [];
	    	
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
	  		
	  		//Structure for storing data
	  		self.completeness = {};
	  		self.completeness.datasets = [];
	  		self.completeness.consistency = [];
	  		self.completeness.indicators = [];
	  		
	  		self.outliers = [];
	  		
	  		self.consistency = {};
	  		self.consistency.data = [];
	  		self.consistency.relations = [];
	  		
	  		
	  		//Metadata for queries
	  		var datasets = datasetForAnalysis();
	  		var indicators = indicatorsForAnalysis();
	  		
	  		var period = self.yearSelected.id;
	  		var refPeriods = precedingYears(self.yearSelected.id, 3);
	  		
	  		var ouBoundary = self.userOrgunit.id;
	  		var ouLevel = self.orgunitLevelSelected.level;
	  		
	  		
	  		
	  		//1 Get dataset completeness and consistency
	  		var dsCoCallback = function (result, errors) { 
	  			self.completeness.datasets.push(result);
	  			if (errors) self.alerts = self.alerts.concat(errors);
	  		}
  			var dsCiCallback = function (result, errors) { 
  				self.completeness.consistency.push(result);
  				if (errors) self.alerts = self.alerts.concat(errors);
  			}
	  		for (var i = 0; i < datasets.length; i++) {
	  			//completeness
	  			dataAnalysisService.datasetCompleteness(dsCoCallback, datasets[i].threshold, datasets[i].id, period, ouBoundary, ouLevel);
	  			
	  			//consistency
	  			dataAnalysisService.timeConsistency(dsCiCallback, datasets[i].trend, datasets[i].consistencyThreshold, 100, datasets[i].id, null, period, refPeriods, ouBoundary, ouLevel);
	  		}
	  		
			
			//2 Get indicator completeness, consistency, outliers
	  		var dataCoCallback = function (result, errors) { 
	  			self.completeness.indicators.push(result);
	  			
 				if (errors) self.alerts = self.alerts.concat(errors);
	  		}
	  		
	  		var dataCiCallback = function (result, errors) {
	  			if (result) {
	  				self.consistency.data.push(result);
	  			}  				
	  			if (errors) {
	  				self.alerts = self.alerts.concat(errors);
	  			}
	  		}
	  		
	  	
	  		var indicatorIDsForConsistencyChart = [];
	  		for (var i = 0; i < indicators.length; i++) {
	  		
	  			var indicator = indicators[i];
	  			var periodType = periodTypeFromIndicator(indicator.code);
	  			
	  			//periods for data completeness
	  			var startDate = self.yearSelected.id.toString() + "-01-01";
	  			var endDate = self.yearSelected.id.toString() + "-12-31";
	  			var periods = periodService.getISOPeriods(startDate, endDate, periodType);	  			
	  			
				dataAnalysisService.dataCompleteness(dataCoCallback, indicator.missing, indicator.localData.id, null, periods, ouBoundary, ouLevel);
				
				dataAnalysisService.timeConsistency(dataCiCallback, indicator.trend, indicator.consistency, null, indicator.localData.id, null, period, refPeriods, ouBoundary, ouLevel);
				
				dataAnalysisService.indicatorOutlier(receiveDataOutliers, indicator, periods, ouBoundary, ouLevel);
				
				indicatorIDsForConsistencyChart.push(indicator.localData.id);
	  		}
	  		
	  		
	  		//3 Indicator relations
	  		var relations = applicableRelations();
	  		for (var i = 0; i < relations.length; i++) {
	  			var relation = relations[i];
	  			var indicatorA = indicatorFromCode(relation.A);
	  			var indicatorB = indicatorFromCode(relation.B);
	  			
	  			dataAnalysisService.dataConsistency(receiveDataConsistency, relation.type, relation.criteria, relation.code, indicatorA.localData.id, indicatorB.localData.id, period, ouBoundary, ouLevel);
	  		}
		
			//Indicator consistency chart			
			chartOptions = {};
			chartOptions.title = 'Consistency trend';
			chartOptions.showLegend = true;
			visualisationService.autoLineChart('consistencyMain', [period], indicatorIDsForConsistencyChart, ouBoundary, chartOptions);
			
			
	  	}
	  	
	  	
	  	function receiveDataOutliers(result) {
	  		self.outliers.push(result);
	  	}
	  	
	  	
	  	function receiveDataConsistency(result, errors) {
	  		if (errors) self.alerts = self.alerts.concat(errors);
	  			
  			//Check type and format data accordingly for charts
  			if (result.type === 'do') {
  				makeDropoutDataPoints(result);
  			}
  			else {
	  			makeConsistencyDataPoints(result);
  			}
  			self.consistency.relations.push(result);
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
		function datasetForAnalysis() {
			
			var datasetIDs = {};
			var indicatorIDs = indicatorIDsForAnalysis();
			for (var i = 0; i < indicatorIDs.length; i++) {
			
				var indicator = indicatorFromCode(indicatorIDs[i]);				
				if (indicator.matched) datasetIDs[indicator.dataSetID] = true;
			}
			
			var dataset = [];
			for (key in datasetIDs) {
				dataset.push(self.datasetFromID(key));			
			}
			
			return dataset;
		}
		
		self.datasetFromID = function(id) {
			for (var i = 0; i < self.map.dataSets.length; i++) {
				if (self.map.dataSets[i].id === id) {
					return self.map.dataSets[i];
				}
			}
		}
		
	  	/** INDICATORS */
	  	function indicatorIDsForAnalysis() {
	  		
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
	  		var matchedIDs = [];
	  		for (var i = 0; i < IDs.length; i++) {
	  			if (indicatorFromCode(IDs[i]).matched) matchedIDs.push(IDs[i]);
	  		}
	  		
	  		return matchedIDs;
	  		
	  		
	  	}
	  	
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
		
		
		function dataForOutliers() {
			
			var data, dataIDs = [];
			for (var i = 0; i < self.map.data.length; i++) {
				data = self.map.data[i];
				if (data.matched && ((self.core && indicatorIsCore(data.code)) || indicatorInGroup(data.code))) {
					
					dataIDs.push({
						'id': data.localData.id,
						'modStdDev': data.moderateOutlier,
						'extStdDev': data.extremeOutlier,
						'consistency': data.consistency,
						'periodType': periodTypeFromDataSet(data.dataSetID)
					});
					
					
				}
			}

			return dataIDs;
			
		}
	
		
		function localDataIDfromCode(code) {
			var data;
			for (var i = 0; i < self.map.data.length; i++) {
				data = self.map.data[i];
				if (data.matched && ((self.core && indicatorIsCore(data.code)) || indicatorInGroup(data.code)) && data.code === code) {
					return self.map.data[i].localData.id;
				}
			}
			
			return null;
		}
		
		//Returns true/false depending on whether indicator is in selected group
		function indicatorIsRelevant(code) {
		
			var indicators = indicatorIDsForAnalysis();
		
			for (var i = 0; i < indicators.length; i++) {				
				if (indicators[i] === code) return true
			}

			return false;
		}
		
		
	    
	    
   	  	/** RELATIONS */
	    self.relationTypeName = function(typeCode) {
	    
	    	if (typeCode === 'eq') return "Equal";
	    	if (typeCode === 'aGTb') return "A > B";
	    	if (typeCode === 'do') return "Dropout";
	    	
	    }
	    
	    self.relationName = function(relationCode) {
	    
	    	var relations = applicableRelations();
	    	for (var i = 0; i < relations.length; i++) {
	    		if (relations[i].code === relationCode) return relations[i].name;
	    	}
	    	
	    }
	    
	    //Returns relations relevant for the selected group (i.e. both indicators are in the group)
	    function applicableRelations() {
	    	
	    	var dataIDs = indicatorIDsForAnalysis(), relation, relations = [];
	    	for (var i = 0; i < self.map.relations.length; i++) {
	    		relation = self.map.relations[i];
	    		
	    		if (indicatorIsRelevant(relation.A) && indicatorIsRelevant(relation.B)) {
	    			relations.push(relation);
	    		}
	    	}
	    	return relations;	
	    }
	    
	    
	    
  	  	/** CHARTS */	    
	    function makeConsistencyDataPoints(result) {	    		    	
	    
	    	var datapoints = result.subunitDatapoints;
	    	var nationalRatio = result.boundaryRatio;
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
	    			'key': "National",
	    			'color': '#ffff',
	    			'values': [{
	    			'x': 0,
	    			'y': 0,
	    			'size': 0
	    			}
	    			],
	    			'slope': nationalRatio,
	    			'intercept': 0.001
	    		},
	    		{
	    			'key': "High",
	    			'color': '#F00',
	    			'values': [{
	    			'x': 0,
	    			'y': 0,
	    			'size': 0
	    			}
	    			],
	    			'slope': nationalRatio+consistency/100,
	    			'intercept': 0.001
	    		},
	    		{
	    			'key': "Low",
	    			'color': '#00F',
	    			'values': [{
	    			'x': 0,
	    			'y': 0,
	    			'size': 0
	    			}
	    			],
	    			'slope': nationalRatio-consistency/100,
	    			'intercept': 0.001
	    		}
	    	);
	    	result.chartOptions = {
	    	   	"chart": {
	    	        "type": "scatterChart",
	    	        "height": 400,
	    	        "margin": {
	    	          "top": 40,
	    	          "right": 20,
	    	          "bottom": 100,
	    	          "left": 100
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
	    
	    function makeDropoutDataPoints(result) {	    		    	
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
	    	        "height": 400,
	    	        "margin": {
	    	          "top": 140,
	    	          "right": 20,
	    	          "bottom": 100,
	    	          "left": 100
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
	    	    
	    self.chartConfigurations = {
	    	'completeness': {
			   	"chart": {
			        "type": "multiBarChart",
			        "height": 350,
			        "margin": {
			          "top": 20,
			          "right": 20,
			          "bottom": 40,
			          "left": 60
			        },
			        "clipEdge": true,
			        "staggerLabels": true,
			        "transitionDuration": 1,
			        "stacked": false,
			        "xAxis": {
			          "showMaxMin": false
			        },
			        "yAxis": {
			          "axisLabel": "% Completeness",
			          "axisLabelDistance": 20
			        },
			        "forceY": [0,100],
			        "showControls": false
			    }
	    	},
	    	'consistency': {
	    	   	"chart": {
	    	        "type": "multiBarChart",
	    	        "height": 350,
	    	        "margin": {
	    	          "top": 20,
	    	          "right": 20,
	    	          "bottom": 40,
	    	          "left": 80
	    	        },
	    	        "clipEdge": true,
	    	        "staggerLabels": true,
	    	        "transitionDuration": 1,
	    	        "stacked": false,
	    	        "xAxis": {
	    	          "showMaxMin": false
	    	        },
	    	        "yAxis": {
	    	          "axisLabelDistance": 20,
	    	          "tickFormat": d3.format('g')
	    	        },
	    	        "showControls": false
	    	    }
	    	}
	    };
	    	    
		return self;
		
	});
	
})();

