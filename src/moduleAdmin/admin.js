
(function(){
	
	angular.module('admin', []);
	
	/**Controller: Parameters*/
	angular.module('admin').controller("AdminController",
	['metaDataService', 'requestService', '$modal', 'notificationService', '$q',
	function(metaDataService, requestService, $modal, notificationService, $q) {
	    	    
	    var self = this;
	    
	    init();
	    
	    function init() {
   		    self.activeTab = true;
	    	self.dataElements = [];
	    	self.indicators = [];
	    	self.outlierOptions = makeOutlierOptions();
	    	
	    	self.groupSelect = {};

			self.isAdmin = false;
			metaDataService.isDQadmin().then(function(data) {
				self.isAdmin = data;
				if (!data) {
					notificationService.notify('Info', "You do not have the required authorities to change the " +
						"configuration of the Data Quality Tool. However, you can use this module to look at " +
						"the existing data quality parameters.");
				}
			});

	    	var needUpdate = true;
	    	var needReset = false;
	    	    		
    		//TODO: check for updates to metaData
    		requestService.getSingle('/api/systemSettings/DQAmapping').then(function(response) {
    			
    			if (needReset) response.data = ""; 
    			
    			if (response.data != "") {
    				self.mapping = response.data;
    				if (needUpdate) updateMeta();
    			}
    			else {
    			
    				requestService.getSingleLocal('data/metaData.json').then(function(response) {
    					self.mapping = response.data;
    				});
    			}
    		});	
	    }
	    
		function updateMeta() {
			
			needUpdate = false;

			if (!self.mapping.denominators) {
				self.mapping.denominators = [
					{
						"idA": "",
						"idB": "",
						"type": "un",
						"criteria": 10,
						"name": "Consistency with UN projection",
						"code": "P1",
						"maxLevel": 1,
					},
					{
						"idA": "",
						"idB": "",
						"type": "total",
						"criteria": 10,
						"name": "Total population",
						"code": "P2",
						"maxLevel": 2
					},
					{
						"idA": "",
						"idB": "",
						"type": "lb",
						"criteria": 10,
						"name": "Live births",
						"code": "P3",
						"maxLevel": 2
					},
					{
						"idA": "",
						"idB": "",
						"type": "ep",
						"criteria": 10,
						"name": "Expected pregnancies",
						"code": "P4",
						"maxLevel": 2
					},
					{
						"idA": "",
						"idB": "",
						"type": "lt1",
						"criteria": 10,
						"name": "Children < 1 year",
						"code": "P5",
						"maxLevel": 2
					}
				];
			}

			for (var i = 0; i < self.mapping.denominators.length; i++) {
				//delete self.mapping.denominators[i]['custom'];
			}

			saveMapping();

		}
	    
	    	    
	    self.mapIndicator = function(indicator) {
	       	     	
	    	var modalInstance = $modal.open({
	            templateUrl: "moduleAdmin/adminMapping.html",
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
	    };
	    
	    
	    self.deleteMapping = function(indicator) {
        	indicator.localData = {};
        	indicator.matched = false;
        	indicator.dataSetID = undefined;
			updateDataSetListAndSave();
        };
        
        self.deleteIndicator = function(indicator) {
			removeIndicator(indicator.code);
			removeIndicatorFromAllGroups(indicator.code);
			
			saveMapping();
        };
        
        function removeIndicator(dataCode) {
        	for (var i = 0; i < self.mapping.data.length; i++) {
        		if (self.mapping.data[i].code === dataCode) {
        			self.mapping.data.splice(i, 1);
        		}
        	}
        }
        
        function removeRelation(code) {
        	for (var i = 0; i < self.mapping.relations.length; i++) {
        		if (self.mapping.relations[i].code === code) {
        			self.mapping.relations.splice(i, 1);
        		}
        	}
        }
        
        self.dataSetNameFromID = function(dataSetID) {
        	var current = self.mapping.dataSets;
        		
    		//check if there are data sets to remove
    		for (var i = 0; i < current.length; i++) {
    			
    			if (current[i].id === dataSetID) return current[i].name;
    		}
        
        
        };
        
        
        self.dataNameFromCode = function(dataCode) {
        	var current = self.mapping.data;
        		
        	//check if there are data sets to remove
        	for (var i = 0; i < current.length; i++) {
        		
        		if (current[i].code === dataCode) return current[i].name;
        	}
        };
        
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
        };
        
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
        
        };
        
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
        };
        
        self.isCore = function(code) {
        	
        	var core = self.mapping.coreIndicators;
        	for (var i = 0; i < core.length; i++) {
        		if (core[i] === code) return true;
        	}
        	return false;
        
        };
        
        
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
        	
        };
        
        
	    self.saveParameterChanges = function () {
	    	var requestURL = '/api/systemSettings/';	    		    	
	    	requestService.post(requestURL, {'DQAmapping': angular.toJson(self.mapping)});
	    };
	    
	    self.groupFilter = function (currentMembers) {
	    	return function(item) {
	    		
	    		for (var i = 0; i < currentMembers.length; i++) {
	    			if (currentMembers[i] === item.code) return false;
	    		}
	    		return true;
	    	}
	    };
	    
	    self.addIndicator = function () {

	    	var modalInstance = $modal.open({
	            templateUrl: "moduleAdmin/adminIndicator.html",
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
	        		var dataCode = getNewIndicatorCode();
	        		
	        		//Add indicator
	        		self.mapping.data.push({
	        			"name": result.name,
	        			"definition": "Total number of outpatient visits", 
	        			"code": dataCode,
	        			"extremeOutlier": 3,
	        			"localData": {},
	        			"matched": false,
	        			"moderateOutlier": 2, 
	        			"extremeOutlier": 3,
	        			"consistency": 0.33,
       					"custom": true,
	        		});
	        		
	        		//Add to group membership
	        		addIndicatorToGroup(dataCode, result.group);
	        		
	        		//Save
	        		saveMapping();
	        		
	        	}
	        });
	    };
	    
	    self.addIndicatorGroup = function () {

	    	var modalInstance = $modal.open({
	            templateUrl: "moduleAdmin/adminIndicatorGroup.html",
	            controller: "ModalAddIndicatorGroupController",
	            controllerAs: 'addCtrl'
	        });
	
	        modalInstance.result.then(function (result) {
	        	if (result) {
	        		var dataCode = getNewIndicatorGroupCode();
	        		
	        		//Add indicator
	        		self.mapping.groups.push({
	        			"name": result.name,
	        			"code": dataCode,
	        			"members": []
	        		});
	        			        		
	        		//Save
	        		saveMapping();
	        		
	        	}
	        });
	    };
	    
	    self.deleteIndicatorGroup = function () {
	    
	    	var modalInstance = $modal.open({
	            templateUrl: "moduleAdmin/adminIndicatorGroupDelete.html",
	            controller: "ModalDeleteIndicatorGroupController",
	            controllerAs: 'addCtrl',
	            resolve: {
	                groups: function () {
	                	return self.mapping.groups;
	                }
	            }
	        });
	
	        modalInstance.result.then(function (result) {
	        	if (result) {
	        		
	        		//delete group
	        		var groupCode = result.group;
	        		removeIndicatorGroup(groupCode);
	        		      		
	        		//Save
	        		saveMapping();
	        		
	        	}
	        });
	    };
	    
	    function removeIndicatorGroup(groupCode) {
	    	for (var i = 0; i < self.mapping.groups.length; i++) {
	    		if (self.mapping.groups[i].code === groupCode) {
	    			
	    			self.mapping.groups.splice(i, 1);
	    				    			
	    			return;
	    		}
	    	}
	    }
	    		
	    
	    
	    function getNewIndicatorGroupCode() {
	    
	    	//Get and return next possible code
	    	var current, found;
	    	for (var i = 0; i <= self.mapping.groups.length; i++) {
	    		
	    		current = "G" + parseInt(i+1);
	    		existing = false;
	    		
	        	for (var j = 0; j < self.mapping.groups.length; j++) {	    			
	    			if (self.mapping.groups[j].code === current) existing = true;
	    		}
	    		
	    		if (!existing) return current;
	    	} 	
	    	
	    	console.log("Error finding new data group code");
	    }
	        
	    
	    function getNewIndicatorCode() {
	    
	    	//Get and return next possible code
	    	var current, found;
	    	for (var i = 0; i <= self.mapping.data.length; i++) {
	    		
	    		current = "C" + parseInt(i+1);
	    		existing = false;
	    		
		    	for (var j = 0; j < self.mapping.data.length; j++) {	    			
	    			if (self.mapping.data[j].code === current) existing = true;
	    		}
	    		
	    		if (!existing) return current;
	    	} 	
	    	
	    	console.log("Error finding new data code");
	    }
	    
	    function addIndicatorToGroup(dataCode, groupCode) {
	    	var current = self.mapping.groups;
	    	for (var i = 0; i < current.length; i++) {
	    		if (current[i].code === groupCode) {
	    			current[i].members.push(dataCode);
	    			self.mapping.groups = current;
	    			break;
	    		}
	    	}
	    
	    }
	    
	    function removeIndicatorFromGroup(dataCode, groupCode) {
	    	
	    	for (var i = 0; i < self.mapping.groups.length; i++) {
	    		if (self.mapping.groups[i].code === groupCode) {
	    			
	    			var index = self.mapping.groups[i].members.indexOf(dataCode);
	    			if (index >= 0) {	    			
	    				self.mapping.groups[i].members.splice(index, 1);
	    			}
	    			
	    			return;
	    		}
	    	}
	    	
	    
	    }
	    
	    
	    function removeIndicatorFromAllGroups(dataCode) {
	    	
	    	for (var i = 0; i < self.mapping.groups.length; i++) {
	    		removeIndicatorFromGroup(dataCode, self.mapping.groups[i].code);
	    	}
	    
	    }
	    
	    self.groupIndicator = function(group) {
	    	addIndicatorToGroup(self.groupSelect[group.code].code, group.code);
	    	self.groupSelect[group.code] = null;
	    	
	    	saveMapping();
	    
	    };
	    
	    
	    self.ungroupIndicator = function(group, dataCode) {
	    	removeIndicatorFromGroup(dataCode, group.code);
	    	
	    	saveMapping();
	    
	    };
	    
	    
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
	    				
	    				//Add default parameters
	    				for (var i = 0; i < self.mapping.dataSets.length; i++) {
	    					if (!self.mapping.dataSets[i].threshold) {
	    						self.mapping.dataSets[i].threshold = 80;
	    						self.mapping.dataSets[i].consistency = 33;
	    						self.mapping.dataSets[i].trend = 'constant';
	    					}
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
	    
	    
	    self.relationName = function(typeCode) {
	    
	    	if (typeCode === 'eq') return "Equal";
	    	if (typeCode === 'aGTb') return "A > B";
	    	if (typeCode === 'do') return "Dropout";
	    	
	    };
	    
	    self.relationDescription = function(typeCode) {
	    
	    	if (typeCode === 'eq') return "A and B should be roughly equal.";
	    	if (typeCode === 'aGTb') return "Comparison. A should be greater than B.";
	    	if (typeCode === 'do') return "Droupout rate. A should be greater than B.";
	    	
	    };
	    
	    self.relationThresholdDescription = function(typeCode) {
	    
	    	if (typeCode === 'eq' || typeCode === 'aGTb') return "% difference from national figure that is accepted for a sub-national unit.";
	    	if (typeCode === 'do') return "Should not be negative.";
	    	
	    };
	    
	    self.editRelation = function(relation) {
	    
	    	var data = [];
	    	for (var i = 0; i < self.mapping.data.length; i++) {
	    		if (self.mapping.data[i].matched) data.push(self.mapping.data[i]);
	    	}
	    
	    	var modalInstance = $modal.open({
	            templateUrl: "moduleAdmin/adminRelation.html",
	            controller: "ModalAddEditRelationController",
	            controllerAs: 'addCtrl',
	            resolve: {
	    	        indicators: function () {
	    	            return data;
	    	        },
	    	        relation: function () {
	    	        	return relation;
	    	        }
	            }
	        });
	
	        modalInstance.result.then(function (result) {
	        	if (result) {	        		
	        		//check if new or existing (= has code already)
	        		if (result.relation.code != null) {
		        		saveEditedRelation(result.relation);
	        		}
	        		else {
						result.relation.code = getNewRelationCode();
						self.mapping.relations.push(result.relation);
						saveMapping();        			
	        		}
	        	}
	        });
	    
	    };
	    
	    function getNewRelationCode() {
	    
	    	//Get and return next possible code
	    	var current, found;
	    	for (var i = 0; i <= self.mapping.relations.length; i++) {
	    		
	    		current = "R" + parseInt(i+1);
	    		existing = false;
	    		
	        	for (var j = 0; j < self.mapping.relations.length; j++) {	    			
	    			if (self.mapping.relations[j].code === current) existing = true;
	    		}
	    		
	    		if (!existing) return current;
	    	} 	
	    	
	    	console.log("Error finding new relation code");
	    }
	    
	    function saveEditedRelation(relation) {
	    
	    	for (var i = 0; i < self.mapping.relations.length; i++) {
	    		if (self.mapping.relations[i].code === relation.code) {
	    			self.mapping.relations[i] = relation;
	    			break;
	    		}
	    	}
	    	
	    	saveMapping();
	    }

		function saveEditedDenominator(denominator) {

			for (var i = 0; i < self.mapping.denominators.length; i++) {
				if (self.mapping.denominators[i].code === denominator.code) {
					self.mapping.denominators[i] = denominator;
					break;
				}
			}

			saveMapping();
		}

		function getNewDenominatorCode() {

			//Get and return next possible code
			var current, found;
			for (var i = 0; i <= self.mapping.denominators.length; i++) {

				current = "R" + parseInt(i + 1);
				existing = false;

				for (var j = 0; j < self.mapping.denominators.length; j++) {
					if (self.mapping.denominators[j].code === current) existing = true;
				}

				if (!existing) return current;
			}

			console.log("Error finding new denominator code");
		}
	    
	    
	    self.deleteRelation = function(relation) {
	    	removeRelation(relation.code);
	    	
	    	saveMapping();
	    
	    };
	    
	    self.addRelation = function() {
	    
	    	self.editRelation(null);
	    
	    };

		self.getDataName = function(id) {
			return metaDataService.getDataName(id);
		}

		self.addDenominator = function() {
			self.editDenominator(null);
		}

		self.editDenominator = function(denominator) {

			var data = [];
			for (var i = 0; i < self.mapping.data.length; i++) {
				if (self.mapping.data[i].matched) data.push(self.mapping.data[i]);
			}

			var modalInstance = $modal.open({
				templateUrl: "moduleAdmin/adminDenominator.html",
				controller: "ModalAddEditDenominatorController",
				controllerAs: 'addCtrl',
				resolve: {
					denominator: function () {
						return denominator;
					}
				}
			});

			modalInstance.result.then(function (result) {
				if (result) {
					//check if new or existing (= has code already)
					console.log(result);
					if (result.denominator.code != null) {
						saveEditedDenominator(result.denominator);
					}
					else {
						result.denominator.code = getNewRelationCode();
						self.mapping.denominators.push(result.denominator);
						saveMapping();
					}
				}
			});

		};
		self.deleteDenominator = function(code) {
			for (var i = 0; i < self.mapping.denominators.length; i++) {
				if (self.mapping.denominators[i].code === code) {
					self.mapping.denominators.splice(i, 1);
				}
			}

			saveMapping();
		}


		var nameCache = {};
		self.getDataName = function(id) {
			if (!id) return null;

			if (!nameCache[id]) {
				nameCache[id] = true;
				metaDataService.getDataName(id).then(function(name) {
					nameCache[id] = name;
				});
			}

			return nameCache[id];
		};
	        
		return self;
		
	}]);
	
})();

