
(function(){
	
	var app = angular.module('appAdmin', []);
	
	
	app.directive("appAdmin", function() {
		return {
			restrict: "E",
	        templateUrl: "views/appAdmin.html"
		};
      
	});
	
		
	
	/**Controller: Parameters*/
	app.controller("AdminController", function(metaDataService, requestService, $modal) {
	    	    
	    var self = this;
	    self.activeTab = true;
	    
	    init();
	    
	    function init() {
	    	self.dataElements = [];
	    	self.indicators = [];
	    	self.outlierOptions = makeOutlierOptions();
	    	
    		metaDataService.getDataElements().then(function(data) { 
    			self.dataElements = data;
    		});
    		
    		metaDataService.getIndicators().then(function(data) { 
    			self.indicators = data;
    		});
    		
    		
    		//TODO: check for updates to metaData
    		requestService.getSingle('/api/systemSettings/DQAmapping').then(function(response) {
    			if (response.data != "") {
    				self.mapping = response.data;
    				
    			}
    			else {
    			
    				requestService.getSingleLocal('data/metaData.json').then(function(response) {
    					self.mapping = response.data;
    				});
    			}
    		});
    		
    		
	    }
	    
	    
	    self.mapIndicator = function(indicator) {
	       	     	
	    	var modalInstance = $modal.open({
	            templateUrl: "modals/modalMapping.html",
	            controller: "ModalMappingController",
	            controllerAs: 'mapCtrl',
	            resolve: {
	    	        indicator: function () {
	    	            return indicator;
	    	        }
	            }
	        });
	
	        modalInstance.result.then(function (result) {
	        	if (result) saveMappingChanges();
	        });
	    }
	    
	    
	    self.deleteMapping = function(indicator) {
	        	indicator.localData = {};
	        	indicator.matched = false;
				saveMappingChanges();
	        }
	    
	    
	    function saveMappingChanges() {	    	
	    	var requestURL = '/api/systemSettings/';
	    	requestService.post(requestURL, {'DQAmapping': JSON.stringify(self.mapping)});
	    }
	    	
	    
	    function makeOutlierOptions() {
	    	var opts = [];
	    	for (var i = 1.5; i <= 4.05; i += 0.1) {
	    		opts.push({'val': (Math.round(10*i)/10), 'label': (Math.round(10*i)/10).toString()});
	    	}
	    	return opts;
	    }
	    
	        
		return self;
		
	});
	
})();

