
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
	    
	    init();
	    
	    function init() {
   		    self.activeTab = true;
	    	self.dataElements = [];
	    	self.indicators = [];
	    	self.outlierOptions = makeOutlierOptions();
	    	
	    	self.groupSelect = {};
	    	    		
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
	            templateUrl: "scripts/modals/modalMapping.html",
	            controller: "ModalMappingController",
	            controllerAs: 'mapCtrl',
	            resolve: {
	    	        indicator: function () {
	    	            return indicator;
	    	        },
	    	        groups: function () {
	    	        	return self.dataGroups(indicator.code);
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
        
        self.deleteIndicator = function(indicator) {
		//TODO
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
        
        self.dataGroups = function(dataCode) {
        	var groups = [];
        	
        	var current = self.mapping.groups;
        	for (var i = 0; i < current.length; i++) {
        		for (var j = 0; j < current[i].members.length; j++) {
        			if (current[i].members[j] === dataCode) {
        				 groups.push(current[i].name);
        			}
        		}
        	}
        	
        	return groups.sort().join(', ');
        }
        
        self.getIndicatorsInGroup = function(groupCode) {
        	var indicators = [];
        	
        	var current = self.mapping.groups;
        	for (var i = 0; i < current.length; i++) {
        		
        		if (current[i].code === groupCode) {
	        		for (var j = 0; j < current[i].members.length; j++) {
	        			
	        			indicators.push(indicatorFromCode(current[i].members[j]));        			
	        			
	        		}
        		}
        	}     

        	return indicators;   
        
        }
        
        function indicatorFromCode(dataCode) {
        
        	var current = self.mapping.data;
        	for (var i = 0; i < current.length; i++) {
        		if (current[i].code === dataCode) return current[i];
        	}
        	
        	return null;
        }
        
        
        self.sortIndicators = function(indicator) {
      		
      		var groups = self.dataGroups(indicator.code);
      		var firstGroup = groups.split(',')[0];
      		
      		return firstGroup + indicator.name;
        }
        
        self.isCore = function(code) {
        	
        	var core = self.mapping.coreIndicators;
        	for (var i = 0; i < core.length; i++) {
        		if (core[i] === code) return true;
        	}
        	return false;
        
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
        
        
	    self.saveParameterChanges = function () {
	    	var requestURL = '/api/systemSettings/';	    		    	
	    	requestService.post(requestURL, {'DQAmapping': angular.toJson(self.mapping)});
	    }
	    
	    self.groupFilter = function (currentMembers) {
	    	return function(item) {
	    		
	    		for (var i = 0; i < currentMembers.length; i++) {
	    			if (currentMembers[i] === item.code) return false;
	    		}
	    		return true;
	    	}
	    }
	    
	    self.addIndicator = function () {

	    	var modalInstance = $modal.open({
	            templateUrl: "scripts/modals/modalAddIndicator.html",
	            controller: "ModalAddIndicatorController",
	            controllerAs: 'addCtrl',
	            resolve: {
	                groups: function () {
	                	return self.mapping.groups;
	                }
	            }
	        });
	
	        modalInstance.result.then(function (result) {
	        	if (result) {
	        		console.log(result);
	        	}
	        });
	    }
	    
	    
	    self.groupIndicator = function(group) {
	    	
	    	var current = self.mapping.groups;
	    	for (var i = 0; i < current.length; i++) {
	    		if (current[i].code === group.code) {
	    			current[i].members.push(self.groupSelect[group.code].code);
	    			self.mapping.groups = current;
	    			break;
	    		}
	    	}
	    	
	    	self.groupSelect[group.code] = null;
	    	
	    	
	    	saveMapping();
	    
	    }
	    
	    self.ungroupIndicator = function(group, dataCode) {
	    	
	    	for (var i = 0; i < self.mapping.groups.length; i++) {
	    		if (self.mapping.groups[i].code === group.code) {
	    			
	    			var index = self.mapping.groups[i].members.indexOf(dataCode);
	    			self.mapping.groups[i].members.splice(index, 1);
	    			
	    			break;
	    		}
	    	}
	    		    	
	    	saveMapping();
	    
	    }
	    
	    
	    function saveMapping() {
	    	
	    	var requestURL = '/api/systemSettings/';
	    	requestService.post(requestURL, {'DQAmapping': angular.toJson(self.mapping)});
	    
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

