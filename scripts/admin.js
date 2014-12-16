
(function(){
	
	var app = angular.module('admin', []);
	
	
	app.directive("admin", function() {
		return {
			restrict: "E",
	        templateUrl: "views/admin.html"
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
	        	if (result) {
	        		updateDataSetListAndSave();
	        	}
	        });
	    }
	    
	    
	    self.deleteMapping = function(indicator) {
        	indicator.localData = {};
        	indicator.matched = false;
        	indicator.dataSetID = undefined;
			updateDataSetListAndSave();
        }
        
        
        self.dataSetNameFromID = function(dataSetID) {
        	var current = self.mapping.dataSets;
        		
    		//check if there are data sets to remove
    		for (var i = 0; i < current.length; i++) {
    			
    			if (current[i].id === dataSetID) return current[i].name;
    		}
        
        
        }
        
        
        self.dataNameFromCode = function(dataCode) {
        	var current = self.mapping.data;
        		
        	//check if there are data sets to remove
        	for (var i = 0; i < current.length; i++) {
        		
        		if (current[i].code === dataCode) return current[i].name;
        	}
        }
        
        self.filterMatchedRelations = function(relation) {
        	if (!self.mapping) return false;
        	if (!relation) return false;
        	
        	var Afound = false;
        	var Bfound = false;
        	var data;
    		for (var i = 0; i < self.mapping.data.length; i++) {
    			data = self.mapping.data[i];
    			if (data.code === relation.A && data.matched) {
    				Afound = true;
    			}
    			if (data.code === relation.B && data.matched) {
    				Bfound = true;
    			}
    			
    		}
    		
    		return (Afound && Bfound);
        	
        }
        
        
	    
	    function updateDataSetListAndSave() {
	   		var dataSetsUnique = {};
	   		
	   		for (var i = 0; i < self.mapping.data.length; i++) {
	   			if (self.mapping.data[i].dataSetID) {
	   				dataSetsUnique[self.mapping.data[i].dataSetID] = true;
	   			}
	   		}
	   		
	   		var dataSetIDs = [];
	   		for (key in dataSetsUnique) {
	   			dataSetIDs.push(key);
	   		}
	   		
	   		var dataSetsToAdd = [];
	   		var dataSetsToKeep = [];
	   		var current = self.mapping.dataSets;
	   		
	   		//check if there are data sets to remove
	   		for (var i = 0; i < current.length; i++) {
	   			
	   			var found = false;
	   			for (var j = 0; j < dataSetIDs.length; j++) {
	   				
	   				if (current[i].id === dataSetIDs[j]) {
	   					found = true;
	   					j = dataSetIDs.length;
	   				}
	   				
	   			}
	   			if (found) dataSetsToKeep.push(current[i]);
	   			//else it is not linked to any mapped data element/indicator
	   		}
	   		
	   		self.mapping.dataSets = dataSetsToKeep;
	   		current = self.mapping.dataSets;
	   		
	   		//check if there are data sets to add
   			for (var i = 0; i < dataSetIDs.length; i++) {
   				
   				var found = false;
   				for (var j = 0; j < current.length; j++) {
   					
   					if (current[j].id === dataSetIDs[i]) {
   						found = true;
   						j = current.length;
   					}
   					
   				}
   				if (!found) dataSetsToAdd.push(dataSetIDs[i]);
   			}
   			
   			if (dataSetsToAdd.length > 0) {
	   			metaDataService.getDataSetsFromIDs(dataSetsToAdd).then(function (data) {
	   			
	   				self.mapping.dataSets.push.apply(self.mapping.dataSets, data.dataSets);
	   				
	   				//Add default completeness
	   				for (var i = 0; i < self.mapping.dataSets.length; i++) {
	   					if (!self.mapping.dataSets[i].threshold) self.mapping.dataSets[i].threshold = 80;
	   				}
	   				
	   				var requestURL = '/api/systemSettings/';
	   				requestService.post(requestURL, {'DQAmapping': angular.toJson(self.mapping)});
	   			
	   			});
			}
			else {
				var requestURL = '/api/systemSettings/';
				requestService.post(requestURL, {'DQAmapping': angular.toJson(self.mapping)});
			}	
	    
	    }
	    
	    
	    self.saveParameterChanges = function () {
	    	var requestURL = '/api/systemSettings/';	    		    	
	    	requestService.post(requestURL, {'DQAmapping': angular.toJson(self.mapping)});
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

