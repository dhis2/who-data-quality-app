
(function(){
	
	var app = angular.module('dashboard', []);
	
	/**Directive: Completeness results*/	
	app.directive("dashboard", function() {
		return {
			restrict: "E",
	        templateUrl: "views/dashboard.html"
		};
	  
	});
	
	
	app.controller("DashboardController", function(metaDataService, periodService, requestService, visualisationService, mathService, $scope) {

	    var self = this;

    	init();
    	
    	
    	function init() {
    		self.analysisType = 'comp'; 
    		self.count = 0;

    		self.metaData = undefined;
    		
    		self.dataSetsAvailable = [];
    		self.dataAvailable = [];
    		self.dataSetIsSet = false;
    		self.dataIsSet = false;
    		
    		//Makes it possible to switch later if necessary
    		self.group = 'Core';
    		self.core = true;
    		
    		//Get mapped data, then do analysis
			requestService.getSingle('/api/systemSettings/DQAmapping').then(function(response) {
			
				self.metaData = response.data;
				self.updateDashboard();
			
			});
			
    	}
    	
    	
    	self.updateDashboard = function() {
    		
    		console.log("Update dashboard");
    		
    		if (!self.metaData) return;
    		
    		if (!self.dataSetIsSet) {
    			getAvailableDataSets();
    			self.dataSetIsSet = true;
    		}
    		if (!self.dataIsSet) {
    			getAvailableData();
    			self.dataIsSet = true;
    		}
    		
			makeCompletenessTrendCharts();
			makeYYtrendCharts();
			fetchOutlierGapChartsData();
			
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
       	
       	
       	function getDataWithID(id) {
       		for (var i = 0; i < self.dataAvailable.length; i++) {
       			if (self.dataAvailable[i].localData.id === id) return self.dataAvailable[i];
       		}
       	}
       	
       	
       	
       	function fetchOutlierGapChartsData() {
       		
       		var variables = [];
       		for (var i = 0; i < self.dataAvailable.length; i++) {
       			variables.push(self.dataAvailable[i].localData.id);
       		}
       		
       		var requestURL = "/api/analytics.json?";
       		requestURL += "&dimension=dx:" + variables.join(';');
       		requestURL += "&dimension=ou:USER_ORGUNIT_CHILDREN";
       		
      		//TODO: deal with different period types?
       		//requestURL += "&dimension=pe:LAST_12_MONTHS";
       		
       		//Rewind one period
       		var endDate = moment();
       		var startDate = moment(endDate).subtract(12, 'months').add(1, 'day');
       		startDate = moment(startDate).subtract(1, 'month');
       		endDate = moment(endDate).subtract(1, 'month');
       		
       		requestURL += "&dimension=pe:" + periodService.getISOPeriods(startDate, endDate, 'Monthly').join(';'); 
       		  		       		
       		requestURL += '&hideEmptyRows=false';
       		requestURL += '&tableLayout=true';
       		requestURL += '&columns=pe&rows=dx;ou';
       		requestURL += '&displayProperty=SHORTNAME';
       		
       		
       		requestService.getSingle(requestURL).then(function(response) {
       		
       			processOutlierGapCharts(response.data);
       		
       		});
       		       	
       	}
    	
    	
    	
    	function processOutlierGapCharts(data) {
    		
    		var periods = data.metaData.pe;
    		var orgunits = data.metaData.ou;
    		var variables = [];
    		for (var i = 0; i < self.dataAvailable.length; i++) {
    			variables.push(self.dataAvailable[i].localData.id);
    		}
    		
    		var periodOutliers = {};
    		var orgunitOutliers = {};
    		var variableOutliers = {};
    		
    		var periodGaps = {};
    		var orgunitGaps = {};
    		var variableGaps = {};
    		
    		var dx, ou;
    		for (var i = 0; i < data.headers.length; i++) {
    			if (data.headers[i].column === 'dataid') dx = i;
    			if (data.headers[i].column === 'organisationunitid') ou = i;
    		}
    		
    		
    		for (var i = 0; i < data.rows.length; i++) {
   				var row = data.rows[i];   			
    			var valueSet  = [];
    			for (var j = 0; j < row.length; j++) {
    				if (!data.headers[j].meta) valueSet.push(parseFloat(row[j]));
    			}
    			
    			var mean = mathService.getMean(valueSet); 
    			var variance = mathService.getVariance(valueSet);
    			var standardDeviation = mathService.getStandardDeviation(valueSet);
    			var noDevs = parseFloat(getDataWithID(row[dx]).moderateOutlier);
    			var highLimit = Math.round((mean + noDevs*standardDeviation) * 10) / 10;
    			var lowLimit = Math.round((mean - noDevs*standardDeviation) * 10) / 10;
    			if (lowLimit < 0) lowLimit = 0;
    			
    			
    			var dataCount = 0;
    			for (var j = 0; j < row.length; j++) {
    				if (!data.headers[j].meta) {
    					if (row[j] === "") {
    						
    						//store as gap
    						if (periodGaps[periods[dataCount]]) periodGaps[periods[dataCount]]++;
    						else {
    							periodGaps[periods[dataCount]] = 1;
    						}
    						
    						
    						if (orgunitGaps[row[ou]]) orgunitGaps[row[ou]]++;
    						else {
    							orgunitGaps[row[ou]] = 1;
    						}
    						
    						
    						if (variableGaps[row[dx]]) variableGaps[row[dx]]++;
    						else {
    							variableGaps[row[dx]] = 1;
    						}
    					
    					}
    					else if (parseFloat(row[j]) > highLimit || parseFloat(row[j]) < lowLimit) {
    						//store as outlier
    						if (periodOutliers[periods[dataCount]]) periodOutliers[periods[dataCount]]++;
    						else {
    							periodOutliers[periods[dataCount]] = 1;
    						}
    						
    						
    						if (orgunitOutliers[row[ou]]) orgunitOutliers[row[ou]]++;
    						else {
    							orgunitOutliers[row[ou]] = 1;
    						}
    						
    						
    						if (variableOutliers[row[dx]]) variableOutliers[row[dx]]++;
    						else {
    							variableOutliers[row[dx]] = 1;
    						}
    					}
    					dataCount++;
    				}
    			}
    		}
    		
    		var chartSeries = [];
			chartSeries.push(makeSeries(periods, periodOutliers, data.metaData, "Outliers by period"));
			chartSeries.push(makeSeries(orgunits, orgunitOutliers, data.metaData, "Outliers by orgunit"));
			chartSeries.push(makeSeries(variables, variableOutliers, data.metaData, "Outliers by indicator"));
			
			chartSeries.push(makeSeries(periods, periodOutliers, data.metaData, "Gaps by period"));
			chartSeries.push(makeSeries(orgunits, orgunitGaps, data.metaData, "Gaps by orgunit"));
			chartSeries.push(makeSeries(variables, variableGaps, data.metaData, "Gaps by indicator"));			
									
			visualisationService.makeDistinctBarChart('out_pe', [chartSeries[0]], null);
			visualisationService.makeDistinctBarChart('out_ou', [chartSeries[1]], null);
			visualisationService.makeDistinctBarChart('out_dx', [chartSeries[2]], null);
			
			visualisationService.makeDistinctBarChart('gap_pe', [chartSeries[3]], null);
			visualisationService.makeDistinctBarChart('gap_ou', [chartSeries[4]], null);
			visualisationService.makeDistinctBarChart('gap_dx', [chartSeries[5]], null);
    	}
    	
    	
    	
    	
    	function makeSeries(reference, data, metaData,name) {
    		var values = [];
    		var series = {};
    		series.key = name;
    		for (var i = 0; i < reference.length; i++) {
    			
    			var label =  metaData.names[reference[i]];
    			if (!label) label = reference[i]; //waiting for bug fix
    			var value = 0;
    			if (data[reference[i]]) value = data[reference[i]];
    			values.push({'label': label, 'value': value});
    		}
    		series.values = values;
    		return series;
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
				
				visualisationService.autoLineChart('compPE_'+dataSet.id, periods, [dataSet.id], 'USER_ORGUNIT', chartOptions);
				
				visualisationService.autoOUBarChart('compOU_'+dataSet.id, periods.pop(), [dataSet.id], 'USER_ORGUNIT_CHILDREN', chartOptions);
				
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
      			
      			visualisationService.autoYYLineChart('yy_' + data.localData.id, periods, data.localData.id, 'USER_ORGUNIT', chartOptions);

      		}
      		
      	}
      	    
    
		return self;
		
	});
})();