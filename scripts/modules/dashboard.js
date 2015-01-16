
(function(){
	
	var app = angular.module('dashboard', []);
	
	
	app.controller("DashboardController", function(metaDataService, periodService, requestService, visualisationService, mathService, dataAnalysisService, $scope, $window, $timeout) {

	    var self = this;

    	init();
    	
    	function init() {
    	
    		setWindowWidth();
			$( window ).resize(function() {
				setWindowWidth();
			});
			
			nv.graphs = [];
    		    		
    		self.count = 0;
    		self.loaded = {};
    		
    		self.dataSetsAvailable = [];
    		self.dataAvailable = [];
    		self.periodTypes = [];
    		self.periodTypeAggregates = [];
    		self.dataSetIsSet = false;
    		self.dataIsSet = false;
    		
    		//Makes it possible to switch later if necessary
    		self.group = 'Core';
    		self.core = true;
    		
    		if (self.metaData) return;
    		
    		//Get mapped data, then do analysis
			requestService.getSingle('/api/systemSettings/DQAmapping').then(function(response) {
				self.metaData = response.data;
				self.updateDashboard();
			
			});
			
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
    	
    	
    	self.updateCharts = function() {
    		$timeout(function() {		
	    		for (var i = 0; i < nv.graphs.length; i++) {
	    			nv.graphs[i].update();
	    		}
	    	});
    	}
    	
    	
    	self.updateDashboard = function() {
    		
    		if (self.done) return;
    		
    		if (!self.metaData) return;
    		
    		if (!self.dataSetIsSet) {
    			getAvailableDataSets();
    			self.dataSetIsSet = true;
    		}
    		if (!self.dataIsSet) {
    			getAvailableData();
    			self.dataIsSet = true;
    			getPeriodTypes();
    		}
    		self.done = true;
    		makeCompletenessTrendCharts();
    				
    	}
       
           
       	function getAvailableDataSets() {
   			var data, dataSetIDs = {};
   			for (var i = 0; i < self.metaData.data.length; i++) {
   				data = self.metaData.data[i];
   				if (data.matched) {
   					if ((data.core && self.core) || (data.group === self.group)) {
   						dataSetIDs[data.dataSetID] = true;
   					}
   				}
   			}
   			var dataSet;
   			for (var i = 0; i < self.metaData.dataSets.length; i++) {
   				dataSet = self.metaData.dataSets[i];
   				if (dataSetIDs[dataSet.id]) self.dataSetsAvailable.push(dataSet);
   			}       	
       	}
       	
       	
       	function getAvailableData() {
			var data;
			for (var i = 0; i < self.metaData.data.length; i++) {
				data = self.metaData.data[i];
				if (data.matched && ((data.core && self.core) || (data.group === self.group))) {
					
					for (var j = 0; j < self.dataSetsAvailable.length; j++) {
						if (self.dataSetsAvailable[j].id === data.dataSetID) {
							data.periodType = self.dataSetsAvailable[j].periodType;
						} 
					}
									
					self.dataAvailable.push(data);
				}
			}
       	}
       	
       	
       	function getPeriodTypes() {
       	
       		var data, pTypes = {};
       		for (var i = 0; i < self.dataAvailable.length; i++) {
       			pTypes[self.dataAvailable[i].periodType] = true;
       		}
       		
			for (pt in pTypes) {
				self.periodTypes.push({'pt': pt});
			}
       	
       	}
       	
       	
       	function getDataWithID(id) {
       		for (var i = 0; i < self.dataAvailable.length; i++) {
       			if (self.dataAvailable[i].localData.id === id) return self.dataAvailable[i];
       		}
       	}
       	    	
    	  	
    	
    	function makeOutlierCharts() {
			
			console.log("Making outlier charts");
			
			var periodType;			
			for (var k = 0; k < self.periodTypes.length; k++) {
				periodType = self.periodTypes[k].pt;
				
							
				//Rewind one period
				var endDate = moment();
				var startDate = moment(endDate).subtract(12, 'months').add(1, 'day');
				startDate = moment(startDate).subtract(1, 'month');
				endDate = moment(endDate).subtract(1, 'month');
				var pe = periodService.getISOPeriods(startDate, endDate, periodType);
				
				
				var variables = [];
				for (var i = 0; i < self.dataAvailable.length; i++) {
					
					if (self.dataAvailable[i].periodType === periodType) {
						variables.push(self.dataAvailable[i].localData.id);
					}
				}
							
				
				var orgunit = ["USER_ORGUNIT_CHILDREN"];
				
				
				var parameters = {
					'outlierLimit': 2.0,
					'co': false
				};
				
				dataAnalysisService.outlier(drawOutlierCharts, variables, pe, orgunit, parameters);
			}
			    	
    	}
    	
    	
    	function drawOutlierCharts(result) {

    		var outlierSeries = result.aggregates.dxPeOut;
    		
    		//Outliers
    		var stackedSeries = [];
    		for (key in outlierSeries) {
    			var series = {};
    			series.key = result.metaData.names[key];
    			series.values = [];
    			
    			var i = 0;
    			for (pe in outlierSeries[key]) {
    				series.values.push({'x': i++, 'y': outlierSeries[key][pe]});
    			}
    			
    			stackedSeries.push(series);
    		}
    		var categoryNames = [];
    		for (var i = 0; i < result.metaData.periods.length; i++) {
    			categoryNames.push(periodService.shortPeriodName(result.metaData.periods[i]));
    		}
    		
    		var periodType = periodService.periodTypeFromPeriod(result.metaData.periods[0]);
    		
    		visualisationService.makeMultiBarChart('out_' + periodType, stackedSeries, {'categoryLabels': categoryNames, 'title': "Outliers over time - " + periodType});
    		
    		self.periodTypeAggregates[periodType] = result.aggregates;    		
    		
    		drawOutlierPieCharts();
    	}
    	
    	
    	function drawOutlierPieCharts() {
    		
    		var count = 0;
    		for (k in self.periodTypeAggregates) if (self.periodTypeAggregates.hasOwnProperty(k)) count++;
    		
    		//Check if all data is here for the summary charts
    		if (count < self.periodTypes.length) return;
    		
    		var periodType;
    		for (var i = 0; i < self.periodTypes.length; i++) {
    			periodType = self.periodTypes[i];
    			
    			
    			
    			
    		}    	
    	
    	}
    	
    	
    	function makeCompletenessTrendCharts() {
    		
    		
			var endDate = moment().subtract(new Date().getDate(), 'days');
			var startDate = moment(endDate).subtract(12, 'months').add(1, 'day'); 
			
			var dataSet;
			
			var chartOptions = {};
			chartOptions.range = {'min': 0, 'max': 110};
			chartOptions.yLabel = 'Completeness (%)';
			
			
			for (var i = 0; i < self.dataSetsAvailable.length; i++) {
				
				
				dataSet = self.dataSetsAvailable[i];
				var periods = periodService.getISOPeriods(startDate, endDate, dataSet.periodType, chartOptions);
				
				var options = angular.copy(chartOptions);
				options.title = dataSet.name + ' trend';				
				visualisationService.autoLineChart('compPE_'+dataSet.id, periods, [dataSet.id], 'USER_ORGUNIT', options);
		
		
				options = angular.copy(chartOptions);
				
				var periodComparison; 
				if (periods.length < 4) {
					periodComparison = periods[periods.length - 1];
				}
				else {
					periodComparison = periods[periods.length - 2];
				}
				
				options.title = dataSet.name + ' comparison - ' + periodService.shortPeriodName(periodComparison);
				if (i === self.dataSetsAvailable.length - 1) {
					options.callBack = function() {console.log("Calling YY"); makeYYtrendCharts();};
				}
				
				visualisationService.autoOUBarChart('compOU_'+dataSet.id, periodComparison, [dataSet.id], 'USER_ORGUNIT_CHILDREN', options);
				
			}
			
    	}
      	
      	
      	function makeYYtrendCharts() {
      		 
      		     		
      		var chartOptions = {}, periods, data, endDate, startDate; 	
   
			for (var i = 0; i < self.dataAvailable.length; i++) {
      			
      			
      			data = self.dataAvailable[i];
      			endDate = moment().subtract(new Date().getDate(), 'days');
      			startDate = moment(endDate).subtract(12, 'months').add(1, 'day'); 
      			periods = [];
      			periods.push(periodService.getISOPeriods(startDate, endDate, data.periodType));
      			for (var j = 0; j < 2; j++) {
      				startDate = moment(startDate).subtract(1, 'year');
      				endDate = moment(endDate).subtract(1, 'year');
      				periods.push(periodService.getISOPeriods(startDate, endDate, data.periodType));
      			}
      			
      			var options = angular.copy(chartOptions);
      			if (i === self.dataAvailable.length-1) {
	      			options.callBack = function() {console.log("Calling gap"); makeOutlierCharts();};
      			}
      			
      			options.title = data.localData.name;
      			
      			visualisationService.autoYYLineChart('yy_' + data.localData.id, periods, data.localData.id, 'USER_ORGUNIT', options);

      		}
      		
      	}
      	    
    
		return self;
		
	});
})();