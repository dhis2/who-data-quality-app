
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
	    				if (data[i].level > self.userOrgunit.level && data[i].level <= self.userOrgunit.level+2) {
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
	  			
	  			console.log(result);
	  		}
  			var dsCiCallback = function (result, errors) { 
  				self.completeness.consistency.push(result);
  				if (errors) self.alerts = self.alerts.concat(errors);
  				
  				console.log(result);
  			}
	  		for (var i = 0; i < datasets.length; i++) {
	  			//completeness
	  			dataAnalysisService.datasetCompleteness(dsCoCallback, datasets[i].threshold, datasets[i].id, period, ouBoundary, ouLevel);
	  			
	  			//consistency
	  			dataAnalysisService.timeConsistency(dsCiCallback, datasets[i].trend, datasets[i].consistencyThreshold, 100, datasets[i].id, null, period, refPeriods, ouBoundary, ouLevel);
	  			
	  		}
	  		
			
			//2 Get indicator completeness and consistency
	  		var dataCoCallback = function (result, errors) { 
	  			self.completeness.indicators.push(result);
	  			
 				if (errors) self.alerts = self.alerts.concat(errors);
	  		}
	  		
	  		for (var i = 0; i < indicators.length; i++) {
	  		
	  			var indicator = indicators[i];
	  			var periodType = periodTypeFromIndicator(indicator.code);
	  			
	  			var startDate = self.yearSelected.id.toString() + "-01-01";
	  			var endDate = self.yearSelected.id.toString() + "-12-31";
	  			var periods = periodService.getISOPeriods(startDate, endDate, periodType);	  			
	  			
				dataAnalysisService.indicatorCompleteness(dataCoCallback, indicator, periods, self.userOrgunit.id, self.orgunitLevelSelected.level);
	  		}
	  		
	  		
	  		return;	
	  		//3 Completeness chart
	  		var datasetIDs = [];
	  		for (var i = 0; i < datasets.length; i++) {
	  			datasetIDs.push(datasets[i].id);
	  		}
	  		var pe = precedingYears(self.yearSelected.id, 3);
	  		pe.push(self.yearSelected.id);
	  		pe.sort(function(a, b){return a-b});
	  			  		
	  		
	  		//4 Indicator outliers
	  		var coCallback = function (result) { self.consistency.outliers.push(result);}
  			for (var i = 0; i < indicatorIDs.length; i++) {
  			
  				var indicator = indicatorFromCode(indicatorIDs[i])
  				var dataset = self.datasetFromID(indicator.dataSetID);
  				
  				var startDate = self.yearSelected.id.toString() + "-01-01";
  				var endDate = self.yearSelected.id.toString() + "-12-31";
  				var periods = periodService.getISOPeriods(startDate, endDate, dataset.periodType);	  			
  				
  				dataAnalysisService.indicatorOutlier(coCallback, indicator, periods, self.userOrgunit.id, self.orgunitLevelSelected.level);
  			}
	
  			//5 Indicator consistency
  			var ccCallback = function (result, errors) {
				if (result) {
					result.chartOptions = JSON.parse(JSON.stringify(self.chartConfigurations.consistencySmall));
					if (result.datapoints) result.chartData = makeDataPoints(result.datapoints, result.boundaryConsistency, result.consistency, result.chartOptions);
					self.consistency.consistency.push(result);
					self.consistency.consistencyChart.push(result.chartSerie);
				}  				
  				if (errors) self.alerts = self.alerts.concat(errors);
  			}
  			
  			
			for (var i = 0; i < indicatorIDs.length; i++) {
				
				var indicator = indicatorFromCode(indicatorIDs[i]);  			
					
				dataAnalysisService.indicatorConsistency(ccCallback, indicator, self.yearSelected.id, refYears, self.userOrgunit.id, self.orgunitLevelSelected.level);
			}
			
			
			
			
			//6 Indicator consistency chart
			var indicatorUIDs = [];
			for (var i = 0; i < indicatorIDs.length; i++) {
				indicatorUIDs.push(indicatorFromCode(indicatorIDs[i]).localData.id);
			}
			
			chartOptions = {};
			chartOptions.title = 'Consistency trend';
			chartOptions.showLegend = true;
			visualisationService.autoLineChart('consistencyMain', pe, indicatorUIDs, self.userOrgunit.id, chartOptions);
			
			//7 Indicator relations
			var relations = applicableRelations();
			var irCallback = function (result) {
				result.chartOptions = JSON.parse(JSON.stringify(self.chartConfigurations.consistencySmall));
				result.chartData = makeDataPoints(result.datapoints, result.boundaryValue, result.criteria, chartOptions);
				
				result.chartOptions.chart.xAxis.axisLabel = indicatorFromCode(result.A).name;
				result.chartOptions.chart.yAxis.axisLabel = indicatorFromCode(result.B).name;
				
				self.consistency.relations.push(result);
			}
			for (var i = 0; i < relations.length; i++) {
				var relation = relations[i];
				var indicatorA = indicatorFromCode(relation.A);
				var indicatorB = indicatorFromCode(relation.B);
				dataAnalysisService.indicatorRelation(irCallback, relation, indicatorA, indicatorB, self.yearSelected.id, self.userOrgunit.id, self.orgunitLevelSelected.level);
			}
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
					console.log(self.map.dataSets[i]);
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
	    self.relationName = function(typeCode) {
	    
	    	if (typeCode === 'eq') return "Equal";
	    	if (typeCode === 'aGTb') return "A > B";
	    	if (typeCode === 'do') return "Dropout";
	    	
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
	    function makeDataPoints(datapoints, nationalRatio, consistency, chartOptions) {	    		    	
	    	var chartSeries = [];
	    	var chartSerie = {
	    		'key': "Districts",
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
	    			'slope': nationalRatio/100,
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
	    			'slope': (nationalRatio+consistency)/100,
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
	    			'slope': (nationalRatio-consistency)/100,
	    			'intercept': 0.001
	    		}
	    	);
	    	
	    	//Todo: update axis etc
	    	
	    	return chartSeries;
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
	    	},
	    	'consistencySmall': {
	    	   	"chart": {
	    	        "type": "scatterChart",
	    	        "height": 350,
	    	        "margin": {
	    	          "top": 40,
	    	          "right": 15,
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
    	                  "axisLabel": "Previous periods",
    	                  "axisLabelDistance": 30,
    	                  "tickFormat": d3.format('g'),
    	                  "showMaxMin": false
    	            },
    	            "yAxis": {
    	            	"axisLabel": "Current period",
    	                "axisLabelDistance": 30,
    	                "tickFormat": d3.format('g')
    	            }
	    	    }
	    	}
	    };
	    
	    self.testData = [
	    	{
		    	'key': "Districts",
		    	'values': [
		    		{
		    		'x': 1,
		    		'y': 3
		    		},
		    		{
		    		'x': 2,
		    		'y': 6
		    		},
		    		{
		    		'x': 3,
		    		'y': 7
		    		}
		    	]
	    	},
	    	{
	    		'key': "National",
	    		'values': [{
	    		'x': 0,
	    		'y': 0,
	    		'size': 0
	    		}
	    		],
	    		'slope': 1,
	    		'intercept': 0.001
	    	},
	    	{
	    		'key': "+30%",
	    		'values': [{
	    		'x': 0,
	    		'y': 0,
	    		'size': 0
	    		}
	    		],
	    		'slope': 1.3,
	    		'intercept': 0.001
	    	},
	    	{
	    		'key': "-30%",
	    		'values': [{
	    		'x': 0,
	    		'y': 0,
	    		'size': 0
	    		}
	    		],
	    		'slope': 0.7,
	    		'intercept': 0.001
	    	}
	    	
	    ];
	    
		return self;
		
	});
	
})();

