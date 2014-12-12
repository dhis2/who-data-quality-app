
(function(){
	
	var app = angular.module('dashboard', []);
	
	/**Directive: Completeness results*/	
	app.directive("dashboard", function() {
		return {
			restrict: "E",
	        templateUrl: "views/dashboard.html"
		};
	  
	});
	
	
	app.controller("DashboardController", function(metaDataService, periodService, requestService, visualisationService) {

	    var self = this;

    	
    	
    	
    	init();
    	
    	
    	function init() {
    		self.activeTab = true;
    		self.metaData = {};
    		
    		self.dataSetsAvailable = [];
    		self.dataAvailable = [];
    		
    		//Makes it possible to switch later if necessary
    		self.group = 'Core';
    		self.core = true;
    		
    		//Get mapped data, then do analysis
			requestService.getSingle('/api/systemSettings/DQAmapping').then(function(response) {
			
				self.metaData = response.data;
				generateDashboard();
			
			});

    	}
    	
    	
    	function generateDashboard() {
    		getAvailableDataSets();
    		getAvailableData();
    		
    		
    		console.log("Making dashboard. DataSets: " + self.dataSetsAvailable.length + ", indicators: " + self.dataAvailable.length);
			
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
					self.dataAvailable.push(data);
				}
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
				
				visualisationService.autoLineChart('compPE_'+dataSet.id, periods, [dataSet.id], 'USER_ORGUNIT', chartOptions);
				
				visualisationService.autoOUBarChart('compOU_'+dataSet.id, periods.pop(), [dataSet.id], 'USER_ORGUNIT_CHILDREN', chartOptions);
				
			}
    	}
      
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
		return self;
		
	});
})();