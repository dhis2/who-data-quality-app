
(function(){
	
	var app = angular.module('dashboard', []);
	
	
	app.controller("DashboardController", function(metaDataService, periodService, requestService, visualisationService, mathService, dataAnalysisService, $scope, $window, $timeout) {

	    var self = this;
		
		
		
    	
    	function init() {
    	
    		setWindowWidth();
			$( window ).resize(function() {
				setWindowWidth();
			});

    		self.ready = true;
    		self.show = false;
    		
    		self.group = 'core';
    		self.ouBoundary = 'USER_ORGUNIT';
    		self.ouChildren = 'USER_ORGUNIT_CHILDREN';
    		    		
    		//Completeness is the default
    		self.makeCompletenessCharts();
    	}
    	     
        /** -- ANALYSIS -- */
        
        /** COMPLETENESS */
        self.makeCompletenessCharts = function() {
        	if (!self.ready) return;
	        nv.graphs = [];
	        
        	self.completenessCharts = [];
        	self.trendReceived = 0;
        	self.ouReceived = 0;
        	
        	//One year of data
        	var endDate = moment().subtract(new Date().getDate(), 'days');
        	var startDate = moment(endDate).subtract(12, 'months').add(1, 'day'); 
        	
        	var datasets = metaDataService.getDatasetsInGroup(self.group);
        	
        	var dataset, periods, ouPeriod, datasetCompletenessChart;
        	for (var i = 0; i < datasets.length; i++) {
               	dataset = datasets[i];
               	
        		datasetCompletenessChart = {
        			name: dataset.name,
        			id: dataset.id,
        			trendChartOptions: undefined,
        			trendChartData: undefined,
        			ouChartOptions: undefined,
        			ouChartData: undefined
        		}
        		
        		periods = periodService.getISOPeriods(startDate, endDate, dataset.periodType);
        		if (periods.length < 4) {
        			ouPeriod = periods[periods.length - 1];
        		}
        		else {
        			ouPeriod = periods[periods.length - 2];
        		}
        		
        		visualisationService.lineChart(receiveCompletenessTrend, [dataset.id], periods, [self.ouBoundary], 'dataOverTime');
        		
        		visualisationService.barChart(receiveCompletenessOU, [dataset.id], [ouPeriod], [self.ouChildren], 'ou');
        		
        		
        		self.completenessCharts.push(datasetCompletenessChart);  		
        	}
        }
        
        
        var receiveCompletenessTrend = function (data, options) {
        	var datasetID = options.parameters.dataIDs[0];
        	
        	//Modify options
        	options.chart.forceY = [0, 100];
        	options.chart.margin = {
	        	  "top": 20,
	        	  "right": 10,
	        	  "bottom": 60,
	        	  "left": 30
	        	};
	        options.chart.height = 300;
	        options.chart.showLegend = false;
        
        	var dsc;
        	for (var i = 0; i < self.completenessCharts.length; i++) {
        		dsc = self.completenessCharts[i];
        		if (dsc.id === datasetID) {
        		
        			options.title = {	
        				'enable': true,
        				'text': dsc.name + ' completeness'
        			};
        			options.subtitle = {	
        				'enable': true,
        				'text': 'Trend over time'
        			};
        			dsc.trendChartOptions = options;
        			dsc.trendChartData = data;
        			break;
        		}
        	}
        	
        	self.trendReceived++;
        	if (self.trendReceived === self.completenessCharts.length && self.ouReceived === self.completenessCharts.length) {
        		console.log("Completeness charts ready");
				updateCharts();
        	}
        }
        
        
        var receiveCompletenessOU = function (data, options) {
        	var datasetID = options.parameters.dataIDs[0];
        	
        	//Modify options
        	options.chart.forceY = [0, 100];
        	options.chart.margin = {
        		  "top": 20,
        		  "right": 10,
        		  "bottom": 60,
        		  "left": 30
        		};
        	options.chart.height = 300;
        	options.chart.showLegend = false;
    		options.chart.yAxis = {
    			'tickFormat': d3.format('g')
    		};
        
        	var dsc;
        	for (var i = 0; i < self.completenessCharts.length; i++) {
        		dsc = self.completenessCharts[i];
        		if (dsc.id === datasetID) {
        		
        			options.title = {	
        				'enable': true,
        				'text': dsc.name + ' completeness'
        			};
        			options.subtitle = {	
        				'enable': true,
        				'text': 'Comparison for ' + periodService.shortPeriodName(options.parameters.periods[0])
        			};
        		
        			dsc.ouChartOptions = options;
        			dsc.ouChartData = data;
        			break;
        		}
        	}
        	
        	self.ouReceived++;
        	if (self.trendReceived === self.completenessCharts.length && self.ouReceived === self.completenessCharts.length) {
        		console.log("Completeness charts ready");
				updateCharts();
        	}
        }
                  	
    	
    	
    	/** CONSISTENCY */
    	self.makeConsistencyCharts = function() { 
    		nv.graphs = [];
      		self.consistencyCharts = [];   
      		self.yyReceived = 0;
      		self.consistencyReceived = 0;
      		  		self.show = false;
      		
      		
      		var data, endDate, startDate, periodType, periods; 	
   			var datas = metaDataService.getDataInGroup(self.group);
   			var consistencyChart;
			for (var i = 0; i < datas.length; i++) {
      			
      			data = datas[i];
      			periodType = metaDataService.getDataPeriodType(data.code);
      			endDate = moment().subtract(new Date().getDate(), 'days');
      			startDate = moment(endDate).subtract(12, 'months').add(1, 'day'); 
      			
      			periods = [];
      			periods.push(periodService.getISOPeriods(startDate, endDate, periodType));
      			for (var j = 0; j < 2; j++) {
      				startDate = moment(startDate).subtract(1, 'year');
      				endDate = moment(endDate).subtract(1, 'year');
      				periods.push(periodService.getISOPeriods(startDate, endDate, periodType));
      			}

      			visualisationService.yyLineChart(receiveYY, periods, data.localData.id, 'USER_ORGUNIT');
				
				
//		    	dataAnalysisService.timeConsistency(receiveDataTimeConsistency, data.trend, data.consistency, null, data.localData.id, null, period, refPeriods, ouBoundary, ouLevel);
				
				
				
				
				
				
				consistencyChart = {
					name: data.name,
					id: data.localData.id,
					yyChartOptions: undefined,
					yyChartData: undefined,
					consistencyChartOptions: undefined,
					consistencyChartData: undefined
				}
				
				self.consistencyCharts.push(consistencyChart);
      		}
      		      		
      	}

    	
    	var receiveYY = function (data, options) {
			var dataID = options.parameters.dataID;

    		//Modify options
    		options.chart.margin = {
    			  "top": 20,
    			  "right": 10,
    			  "bottom": 30,
    			  "left": 50
    			};
    		options.chart.height = 300;
    		options.chart.yAxis = {
    			'tickFormat': d3.format('g')
    		};
    	
    		var dsc;
    		for (var i = 0; i < self.consistencyCharts.length; i++) {
    			dc = self.consistencyCharts[i];
    			if (dc.id === dataID) {
    			
    				options.title = {	
    					'enable': true,
    					'text': dc.name
    				};
    				options.subtitle = {	
    					'enable': true,
    					'text': 'Year over year'
    				};
    			
    				dc.yyChartOptions = options;
    				dc.yyChartData = data;
    				break;
    			}
    		}
    		self.yyReceived++;
    		if (self.yyReceived === self.consistencyCharts.length) {
				console.log("Consistency downloaded");
				updateCharts();
    		}
    	}
    	
    	
    	
    	/** OUTLIERS */
  	
    	
    	
      	
      	
      	
      	
      	/**UTILITIES*/
      	function getPeriodTypes(datasets) {
      		
  			var data, pTypes = {};
  			for (var i = 0; i < self.dataAvailable.length; i++) {
  				pTypes[self.dataAvailable[i].periodType] = true;
  			}
      			
      		for (pt in pTypes) {
      			self.periodTypes.push({'pt': pt});
      		}
      		
      	}
      	
      	
      	function setWindowWidth() {
      		
      		var previous = self.singleCol;
      		
      		if ($window.innerWidth < 768) {
      			self.singleCol = true;
      		}
      		else {
      			self.singleCol = false;
      		}
      		
      		//update if there was a change
      		if (previous != undefined && (previous != self.singleCol)) $scope.$apply();
      	}
      	
      	function updateCharts() {
      		$timeout(function () { window.dispatchEvent(new Event('resize')); }, 250);
      	}
      				
		//Make sure mapping is available, then intialise
		if (metaDataService.hasMapping()) {
			init();
		}
		else {
			metaDataService.getMapping().then(function (data) {
				init();
			});
		}
			
			
			
		return self;
		
	});
})();