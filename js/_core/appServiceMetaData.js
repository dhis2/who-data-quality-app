(function(){  
	angular.module('dataQualityApp').service('metaDataService', ['$q', 'requestService', 'periodService', function ($q, requestService, periodService) {
	  	
	  	var self = this;
	  	
	  	var mapping = undefined;
	  	
	  	var dataElements = {
	  		'available': false,
	  		'promise': null,
	  		'data': []
	  	};
	  	var dataElementGroups = {
  			'available': false,
  			'promise': null,
  			'data': []
  		};
	  	var dataSets = {
	  		'available': false,
	  		'promise': null,
	  		'data': []
	  	};
	  	var indicators = {
  			'available': false,
  			'promise': null,
  			'data': []
	  	};
	  	var indicatorGroups = {
	  		'available': false,
	  		'promise': null,
	  		'data': []
	  	};
		var orgunits = {
			'available': false,
			'promise': null,
			'data': []
		};
		var userOrgunits = {
			'available': false,
			'promise': null,
			'data': []
		};
		var rootOrgunits = {
			'available': false,
			'promise': null,
			'data': []
		};
		var orgunitLevels = {
			'available': false,
			'promise': null,
			'data': []
		};
	  	var orgunitGroups = {
	  		'available': false,
	  		'promise': null,
	  		'data': []
	  	};
	  		  	
	  	
	  	self.metaDataReady = function () {
	  		return (dataSets.available && dataElements.available && indicators.available && orgunits.available && userOrgunits.available && rootOrgunits.available);
	  	};
	  	  	
	  	
	  	self.removeDuplicateObjects = function(objects) {
	  	
	  		var uniqueObjects = [];
	  		var existingIDs = {};	
	  	
	  		for (var i = 0; i < objects.length; i++) {
	  			if (!existingIDs[objects[i].id]) {
	  				uniqueObjects.push(objects[i]);
	  				existingIDs[objects[i].id] = true;
	  			}
	  		}
	  		
	  		return uniqueObjects;  	
	  	};
	  	
	  	
	  	self.removeDuplicateIDs = function(stringArray) {
	  		
			var uniqueObjects = [];
			var existingIDs = {};	
		
			for (var i = 0; i < stringArray.length; i++) {
				if (!existingIDs[stringArray[i]]) {
					uniqueObjects.push(stringArray[i]);
					existingIDs[stringArray[i]] = true;
				}
			}
			
			return uniqueObjects;  	
		};
	  		
	  		
	  	self.getNameFromID = function(objectID) {
	  		
	  		var objects = [];
	  		if (orgunits.available) objects.push.apply(objects, orgunits.data);	
	  		if (dataElements.available) objects.push.apply(objects, dataElements.data);	
	  		if (dataSets.available) objects.push.apply(objects, dataSets.data);
	  		if (indicators.available) objects.push.apply(objects, indicators.data);

	  		for (var i = 0; i < objects.length; i++) {
	  			if (objectID === objects[i].id) return objects[i].name;
	  		}
	  		
	  		return "Unknown: " + objectID;
	  	};
	  	
		
	  	
	  	/**Data sets*/
	  	self.getDataSets = function() { 
	  	
	  		var deferred = $q.defer();
	  		
	  		//available locally
	  		if (dataSets.available) {
	  			deferred.resolve(dataSets.data);
	  		}
	  		//waiting for server
	  		else if (!dataSets.available && dataSets.promise) {
	  			return dataSets.promise;
	  		}
	  		//need to be fetched
			else {
	  			var requestURL = '/api/dataSets.json?'; 
	  			requestURL += 'fields=id,name,periodType&paging=false';
	  			  
	  			requestService.getSingle(requestURL).then(
	  				function(response) { //success
	  			    	var data = response.data;
	  			    	dataSets.data = data.dataSets;
	  			    	deferred.resolve(dataSets.data);
	  			    	dataSets.available = true;
	  				}, 
	  				function(response) { //error
	  			    	deferred.reject("Error fetching datasets");
	  			    	console.log(msg, code);
	  			    }
	  			);
	  		}
	  		dataSets.promise = deferred.promise;
	  		return deferred.promise; 
	  	};
	  	
	  	
	  	/**Data sets*/
	  		self.getDataSetsFromIDs = function(dataSetIDs) { 
	  		
	  			var deferred = $q.defer();
	  			
	  			var requestURL = '/api/dataSets.json?paging=false&fields=name,id,periodType';
	  			for (var i = 0; i < dataSetIDs.length; i++) {
	  				requestURL += '&filter=id:eq:' + dataSetIDs[i];
	  			}
	  			
	  			requestService.getSingle(requestURL).then( function (response) {
	  				deferred.resolve(response.data);
	  			});
	  			
	  			return deferred.promise; 
	  		};
	  	
	  	
	  	
	  		  	
	  	self.dataSetFromID = function(dataSetID) {
	  		for (var j = 0; j < dataSets.data.length; j++) {
	  			if (dataSetID === dataSets.data[j].id) {
	  				return dataSets.data[j];
	  			}			
	  		}
	  	};
	  	
	  	
	  	/**Indicators*/
	  	self.getIndicatorGroups = function() { 
	  		
	  		var deferred = $q.defer();
	  			
  			//available locally
  			if (indicatorGroups.available) {
  				deferred.resolve(indicatorGroups.data);
  			}
  			//waiting for server
  			else if (!indicatorGroups.available && indicatorGroups.promise) {
  				return indicatorGroups.promise;
  			}
  			//need to be fetched
	  		else {
	  			var requestURL = '/api/indicatorGroups.json?'; 
	  			requestURL += 'fields=id,name&paging=false';
	  			
	  			requestService.getSingle(requestURL).then(
	  				function(response) { //success
	  			    	var data = response.data;
	  			    	indicatorGroups.data = data.indicatorGroups;
	  			    	deferred.resolve(indicatorGroups.data);
	  			    	indicatorGroups.available = true;
	  				}, 
	  				function(response) { //error
	  			    	var data = response.data;
	  			    	deferred.reject("Error fetching indicators");
	  			    	console.log(msg, code);
	  			    }
	  			);
	  		}
  			indicatorGroups.promise = deferred.promise;
  			return deferred.promise; 
	  	};
	  	
	  	
	  	self.getIndicatorGroupMembers = function(indicatorGroupID) { 
	  		
	  		var deferred = $q.defer();
	  			  		
	  		var requestURL = '/api/indicators.json?'; 
	  		requestURL += 'fields=name,id&paging=false&filter=indicatorGroups.id:eq:' + indicatorGroupID;
	  			  
	  		requestService.getSingle(requestURL).then(
	  			function(response) { //success
	  		    	deferred.resolve(response.data.indicators);
	  			}, 
	  			function(response) { //error
	  		    	deferred.reject("Error fetching indicator group members");
	  		    	console.log(msg, code);
	  		    }
	  		);
	  			
	  		return deferred.promise; 
	  	};
	  	
	  	
	  	/**Indicators*/
		self.getIndicators = function() { 
			
				var deferred = $q.defer();
				
				//available locally
				if (indicators.available) {
					deferred.resolve(indicators.data);
				}
				//waiting for server
				else if (!indicators.available && indicators.promise) {
					return indicators.promise;
				}
				//need to be fetched
			else {
				var requestURL = '/api/indicators.json?'; 
				requestURL += 'fields=id,name,numerator,denominator&paging=false';
				
				requestService.getSingle(requestURL).then(
					function(response) { //success
				    	var data = response.data;
				    	indicators.data = data.indicators;
				    	deferred.resolve(indicators.data);
				    	indicators.available = true;
					}, 
					function(response) { //error
				    	var data = response.data;
				    	deferred.reject("Error fetching indicators");
				    	console.log(msg, code);
				    }
				);
			}
				indicators.promise = deferred.promise;
				return deferred.promise; 
		};
		
		
		self.getIndicatorDataElements = function (indicatorIDs) {

			var deferred = $q.defer();

			var requestURL = '/api/indicators.json?paging=false&fields=name,id,numerator,denominator';
			for (var i = 0; i < indicatorIDs.length; i++) {
				requestURL += '&filter=id:eq:' + indicatorIDs[i];
			}
			
			requestService.getSingle(requestURL).then(function (response) {
				
				var indicators = response.data.indicators;
				
				var dataElementIDs = [], indicator;
				for (var i = 0; i < indicators.length; i++) {
					indicator = indicators[i];
					dataElementIDs.push.apply(dataElementIDs, indicatorFormulaToDataElementIDs(indicator.numerator));
					dataElementIDs.push.apply(dataElementIDs, indicatorFormulaToDataElementIDs(indicator.denominator));	
				}
				
				
				dataElementIDs = self.removeDuplicateIDs(dataElementIDs);
				
				self.getDataElementsFromIDs(dataElementIDs).then(function (data) {
				
					deferred.resolve(data.dataElements);
					
				});
						
			
			});
			
			return deferred.promise;
		
		}
		
		self.getIndicatorPeriodTypes = function (indicatorID) {
			var deferred = $q.defer();
			if (!self.indicatorPeriodTypes) {
				self.indicatorPeriodTypes = {};
				self.indicatorPeriodTypes[indicatorID] = {
					'all': [],
					'remaining': 0,
					'shortest': null,
					'longest': null
				};				
			}
			else if (!self.indicatorPeriodTypes[indicatorID]) {
				self.indicatorPeriodTypes[indicatorID] = {
					'all': [],
					'remaining': 0,
					'shortest': null,
					'longest': null
				};
			}
			else {
				deferred.resolve(self.indicatorPeriodTypes[indicatorID]);
				return deferred.promise;
			}
			
			self.getIndicatorDataElements([indicatorID]).then(function (dataElements) {
				for (var i = 0; i < dataElements.length; i++) {
					self.indicatorPeriodTypes[indicatorID].remaining++;
					
					self.getDataElementPeriodType(dataElements[i].id).then(function (periodType) {
						self.indicatorPeriodTypes[indicatorID].all.push(periodType);
						self.indicatorPeriodTypes[indicatorID].remaining--;	
						
						//Do we have all?
						if (self.indicatorPeriodTypes[indicatorID].remaining === 0) {
						
							var pType = self.indicatorPeriodTypes[indicatorID];
							
							//TODO: get shortest
							pType.all = self.removeDuplicateIDs(pType.all);
							if (pType.all.length === 1) {
								pType.shortest = pType.all[0];
								pType.longest = pType.all[0];
							}
							else {
								pType.shortest = periodService.shortestPeriod(pType.all);
								pType.longest = periodService.longestPeriod(pType.all);
							}
							deferred.resolve(pType);
						}
					});
				}
			});
			
			return deferred.promise;
			
		}
		
		
		self.getDataElementsFromIDs = function (dataElementIDs) {
			
			var deferred = $q.defer();
			
			
			var requestURL = '/api/dataElements.json?paging=false&fields=name,id';
			for (var i = 0; i < dataElementIDs.length; i++) {
				requestURL += '&filter=id:eq:' + dataElementIDs[i];
			}
			
			requestService.getSingle(requestURL).then( function (response) {
				deferred.resolve(response.data);
			});
			
			return deferred.promise;
		}
		
		
		
		function indicatorFormulaToDataElementIDs(indicatorFormula) {
		
			var IDs = [];
			var matches = indicatorFormula.match(/#{(.*?)}/g);
			
			if (!matches) return null;
			
			for (var i = 0; i < matches.length; i++) {
				IDs.push(matches[i].slice(2, -1).split('.')[0]);
			}
			
			return self.removeDuplicateIDs(IDs);		
		
		}
		
		/**Data element groups*/
		self.getDataElementGroups = function() { 
			
			var deferred = $q.defer();
			
			//available locally
			if (dataElementGroups.available) {
				deferred.resolve(dataElementGroups.data);
			}
			//waiting for server
			else if (!dataElementGroups.available && dataElementGroups.promise) {
				return dataElementGroups.promise;
			}
			//need to be fetched
			else {
				var requestURL = '/api/dataElementGroups.json?'; 
				requestURL += 'fields=name,id&paging=false';
					  
				requestService.getSingle(requestURL).then(
					function(response) { //success
				    	var data = response.data;
				    	dataElementGroups.data = data.dataElementGroups;
				    	deferred.resolve(dataElementGroups.data);
				    	dataElementGroups.available = true;
					}, 
					function(response) { //error
				    	var data = response.data;
				    	deferred.reject("Error fetching data element groups");
				    	console.log(msg, code);
				    }
				);
			}
				dataElementGroups.promise = deferred.promise;
				return deferred.promise; 
		};
		
		
		
		/**Data element group members*/
		self.getDataElementGroupMemberOperands = function(dataElementGroupID) { 
			
			var deferred = $q.defer();
						
			var requestURL = '/api/dataElementOperands.json?'; 
			requestURL += 'fields=name,id,dataElementId,optionComboId&paging=false&filter=dataElement.dataElementGroups.id:eq:' + dataElementGroupID;
				  
			requestService.getSingle(requestURL).then(
				function(response) { //success
			    	deferred.resolve(response.data.dataElementOperands);
				}, 
				function(response) { //error
			    	deferred.reject("Error fetching data element group member operands");
			    	console.log(msg, code);
			    }
			);
				
			return deferred.promise; 
		};
		
		/**Data element group members*/
		self.getDataElementGroupMembers = function(dataElementGroupID) { 
			
			var deferred = $q.defer();
			
			var requestURL = '/api/dataElements.json?'; 
			requestURL += 'fields=name,id&paging=false&filter=dataElementGroups.id:eq:' + dataElementGroupID;
				  
			requestService.getSingle(requestURL).then(
				function(response) { //success
			    	deferred.resolve(response.data.dataElements);
				}, 
				function(response) { //error
			    	deferred.reject("Error fetching data element group members");
			    	console.log(msg, code);
			    }
			);
				
			return deferred.promise; 
		};
		
	
		
		self.getDataElementDataSets = function (dataElementIDs) {
			var deferred = $q.defer();
			
			var requestURL = '/api/dataSets.json?paging=false&fields=name,id';
			for (var i = 0; i < dataElementIDs.length; i++) {
				requestURL += '&filter=dataElements.id:eq:' + dataElementIDs[i];
			}
			
			requestService.getSingle(requestURL).then(function (response) {
			
				deferred.resolve(response.data);
			
			});
						 
			return deferred.promise; 

		}
		
		
		
		/**Data elements*/
		self.getDataElements = function() { 
			
			var deferred = $q.defer();
			
			//available locally
			if (dataElements.available) {
				deferred.resolve(dataElements.data);
			}
			//waiting for server
			else if (!dataElements.available && dataElements.promise) {
				return dataElements.promise;
			}
			//need to be fetched
			else {
				var requestURL = '/api/dataElements.json?'; 
				requestURL += 'fields=id,name&paging=false';
					  
				requestService.getSingle(requestURL).then(
					function(response) { //success
				    	var data = response.data;
				    	dataElements.data = data.dataElements;
				    	deferred.resolve(dataElements.data);
				    	dataElements.available = true;
					}, 
					function(response) { //error
				    	var data = response.data;
				    	deferred.reject("Error fetching data elements");
				    	console.log(msg, code);
				    }
				);
			}
			dataElements.promise = deferred.promise;
			return deferred.promise; 
		};
		
		self.getDataElementPeriodType = function (deID) {
			var deferred = $q.defer();
			var requestURL = '/api/dataElements/' + deID + '.json?fields=id,dataSets[periodType]';		
			 
			requestService.getSingle(requestURL).then(
				function(response) { //success
			    	var data = response.data.dataSets[0].periodType;
			    	deferred.resolve(data);
				}, 
				function(response) { //error
			    	deferred.reject("Error fetching data elements");
			    	console.log(msg, code);
			    }
			);
			return deferred.promise; 
		}
		
		
		self.getDataElementsFromIndicator = function(indicator) {
						
			var dataElementIDs = [];			
			dataElementIDs.push.apply(dataElementIDs, indicatorFormulaToDataElementIDs(indicator.numerator));
			dataElementIDs.push.apply(dataElementIDs, indicatorFormulaToDataElementIDs(indicator.denominator));				
			
			
			var dataElementsFound = [];
			for (var i = 0; i < dataElementIDs.length; i++) {
				dataElementsFound.push(dataElementFromID(dataElementIDs[i]));
			}
							
			return self.removeDuplicateObjects(dataElementsFound);
		};
		
		
		self.dataElementFromID = function(dataSetID) {
			for (var j = 0; j < dataElements.data.length; j++) {
				if (dataSetID === dataElements.data[j].id) {
					return dataElements.data[j];
				}			
			}
		};
		
		
		/**Orgunits*/
		self.getOrgunits = function() { 
			
			var deferred = $q.defer();
			
			//available locally
			if (orgunits.available) {
				deferred.resolve(orgunits.data);
			}
			//waiting for server
			else if (!orgunits.available && orgunits.promise) {
				return orgunits.promise;
			}
			//need to be fetched
			else {
					var requestURL = '/api/organisationUnits.json?'; 
					  requestURL += 'fields=id,name,children[id]&filter=level:lte:3&paging=false';
					  
				requestService.getSingle(requestURL).then(
					function(response) { //success
				    	var data = response.data;
				    	orgunits.data = data.organisationUnits;
				    	deferred.resolve(orgunits.data);
				    	orgunits.available = true;
					}, 
					function(response) { //error
				    	var data = response.data;
				    	deferred.reject("Error fetching orgunits");
				    	console.log(msg, code);
				    }
				);
			}
			orgunits.promise = deferred.promise;
			return deferred.promise; 
		};
		
		
		self.getOrgunitLevels = function() { 
			
			var deferred = $q.defer();
			
			//available locally
			if (orgunitLevels.available) {
	
				deferred.resolve(orgunitLevels.data);
			}
			//waiting for server
			else if (!orgunitLevels.available && orgunitLevels.promise) {
				return orgunitLevels.promise;
			}
			//need to be fetched
			else {
			
				var requestURL = '/api/organisationUnitLevels.json?'; 
				requestURL += 'fields=name,id,level&paging=false';
					  
				requestService.getSingle(requestURL).then(
					function(response) { //success
				    	var data = response.data;
				    				    	
				    	var sortedData = data.organisationUnitLevels.sort(sortLevels);			    	
				    	orgunitLevels.data = sortedData;
				    	
				    	deferred.resolve(sortedData);
				    	orgunitLevels.available = true;
					}, 
					function(response) { //error
				    	var data = response.data;
				    	deferred.reject("Error fetching orgunits");
				    	console.log(msg, code);
				    }
				);
			}
			orgunitLevels.promise = deferred.promise;
			return deferred.promise; 
		};
			
		
		
		function sortLevels(a, b) {
			var aLevel = a.level;
			var bLevel = b.level; 
			return ((aLevel < bLevel) ? -1 : ((aLevel > bLevel) ? 1 : 0));
		}
		
		
		self.getOrgunitGroups = function() { 
				
				var deferred = $q.defer();
				
				//available locally
				if (orgunitGroups.available) {
		
					deferred.resolve(orgunitGroups.data);
				}
				//waiting for server
				else if (!orgunitGroups.available && orgunitGroups.promise) {
					return orgunitGroups.promise;
				}
				//need to be fetched
				else {
						var requestURL = '/api/organisationUnitGroups.json?'; 
						  requestURL += 'fields=name,id&paging=false';
						  
					requestService.getSingle(requestURL).then(
						function(response) { //success
					    	var data = response.data;
					    	orgunitGroups.data = data.organisationUnitGroups;
					    	deferred.resolve(orgunitGroups.data);
					    	orgunitGroups.available = true;
						}, 
						function(response) { //error
					    	deferred.reject("Error fetching orgunits");
					    	console.log(msg, code);
					    }
					);
				}
				orgunitGroups.promise = deferred.promise;
				return deferred.promise; 
			};
		
		
		self.getUserOrgunits = function() {
		
			var deferred = $q.defer();
			
			//available locally
			if (userOrgunits.available) {
				deferred.resolve(userOrgunits.data);
			}
			//waiting for server
			else if (!userOrgunits.available && userOrgunits.promise) {
				return userOrgunits.promise;
			}
			//need to be fetched
			else {
				var requestURL = '/api/organisationUnits.json?'; 
				requestURL += 'userOnly=true&fields=id,name,level&paging=false';
				  
				requestService.getSingle(requestURL).then(
					function(response) { //success
				    	var data = response.data;
				    	userOrgunits.data = data.organisationUnits;
				    	deferred.resolve(userOrgunits.data);
				    	userOrgunits.available = true;
					}, 
					function(response) { //error
				    	var data = response.data;
				    	deferred.reject("Error fetching orgunits");
				    	console.log(msg, code);
				    }
				);
			}
			userOrgunits.promise = deferred.promise;
			return deferred.promise;
		};
		
		
		self.getAnalysisOrgunits = function() {
		
			var deferred = $q.defer();
			
			//available locally
			if (rootOrgunits.available) {
				deferred.resolve(rootOrgunits.data);
			}
			//waiting for server
			else if (!rootOrgunits.available && rootOrgunits.promise) {
				return rootOrgunits.promise;
			}
			//need to be fetched
			else {
					var requestURL = '/api/organisationUnits.json?'; 
					  requestURL += 'userDataViewFallback=true&fields=id,name,level,children[name,level,id]&paging=false';
					  
				requestService.getSingle(requestURL).then(
					function(response) { //success
				    	var data = response.data;
				    	rootOrgunits.data = data.organisationUnits;
				    	deferred.resolve(rootOrgunits.data);
				    	rootOrgunits.available = true;
					}, 
					function(response) { //error
				    	var data = response.data;
				    	deferred.reject("Error fetching orgunits");
				    	console.log(msg, code);
				    }
				);
			}
			rootOrgunits.promise = deferred.promise;
			return deferred.promise;
		};
		
		
		
		//Returns array of orgunit child objects based on parent ID
		self.orgunitChildrenFromParentID = function(parentID) {
			
			var children = [];
			for (var i = 0; i < orgunits.data.length ; i++) {
				if (orgunits.data[i].id === parentID) {
					children = orgunits.data[i].children;
					break;
				}
			}
							
			var childrenOrgunits = [];
			for (var i = 0; i < children.length; i++) {
				childrenOrgunits.push(self.orgunitFromID(children[i].id));
			}
			return childrenOrgunits;
		
		};
		
		
		self.orgunitFromID = function(orgunitID) {
			for (var j = 0; j < orgunits.data.length; j++) {
				if (orgunitID === orgunits.data[j].id) {
					return orgunits.data[j];
				}			
			}
		};
		
		
		
		/** -- MAPPING -- 
		
		
		*/
		self.hasMapping = function() {
			
			if (mapping) {
				return true;
			}
			else {
				return false;
			}
		
		}
		
		self.getMapping = function(update) {
			var deferred = $q.defer();
			
			if (!update && mapping) {
				deferred.resolve(mapping);
			}			
			else {
				requestService.getSingle('/api/systemSettings/DQAmapping').then(function(response) {
					mapping = response.data;
					deferred.resolve(mapping);
				});	
			}
			return deferred.promise;
		}
		
		self.getGroups = function() {
			if (!self.hasMapping()) return null;
			
			return mapping.groups
		}
		
		self.getCoreData = function() {
			if (!self.hasMapping()) return null;
			
			return mapping.coreIndicators;
		}
		
		
		self.getData = function() {
			if (!self.hasMapping()) return null;
			
			return mapping.data;
		
		}
		
		
		self.getDataWithCode = function(dataCode) {
			if (!self.hasMapping()) return null;
			
			var data = self.getData();
			for (var i = 0; i < data.length; i++) {
				if (data[i].code === dataCode) return data[i];
			}
			
			return null;
		}
		
		
		self.getDataID = function (dataCode) {
			if (!self.hasMapping()) return null;
			
			var data = self.getData();
			for (var i = 0; i < data.length; i++) {
				if (data[i].code === dataCode) return data[i].localData.id;
			}
			
			return null;
		}
		
		self.getDataPeriodType = function(dataCode) {
			if (!self.hasMapping()) return null;
			
			var data = self.getData();
			for (var i = 0; i < data.length; i++) {
				if (data[i].code === dataCode) {
					return self.getDataSetPeriodType(data[i].dataSetID);
				}
			}
			
			return null;
		}
		
		
		self.getDataInGroup = function(groupCode) {
			if (!self.hasMapping()) return null;
			
			var dataCodes, groups;
			if (groupCode != 'core') {
				groups = self.getGroups();
				for (var i = 0; i < groups.length; i++) {
					if (groups[i].code === groupCode) {
						dataCodes = groups[i].members;
						break;
					}
				}
			}
			else {
				dataCodes = self.getCoreData();
			}
			
			var dataInGroup = [], data = self.getData();
			for (var i = 0; i < dataCodes.length; i++) {
				for (var j = 0; j < data.length; j++) {
					if (dataCodes[i] === data[j].code) dataInGroup.push(data[j]);
				}
			}
			
			return dataInGroup;
		}
		
		
		self.getDatasets = function() {
			if (!self.hasMapping()) return null;
			
			return mapping.dataSets;
		}
		
		self.getDatasetFromID = function(id) {
			if (!self.hasMapping()) return null;
			
			var datasets = self.getDatasets();
			for (var i = 0; i < datasets.length; i++) {
				if (datasets[i].id === id) {
					return datasets[i];
				}
			}
		}
		
		self.getDataSetPeriodType = function(id) {
			if (!self.hasMapping()) return null;
			
			return self.getDatasetFromID(id).periodType;		
		}
		
		
		self.getDatasetsInGroup = function(groupCode) {
			if (!self.hasMapping()) return null;
			
			var data = self.getDataInGroup(groupCode);
			var datasets = self.getDatasets();
			var filteredDatasets = {};
			for (var i = 0; i < datasets.length; i++) {
				for (var j = 0; j < data.length; j++) {
					if (datasets[i].id === data[j].dataSetID) {
						filteredDatasets[datasets[i].id] = datasets[i];
					}
				}
			}
			var uniqueFilteredDatasets = [];
			for (key in filteredDatasets) {
				uniqueFilteredDatasets.push(filteredDatasets[key]);
			}

			return uniqueFilteredDatasets;
		}
		
		
		self.getRelations = function(groupCode) {
			if (!self.hasMapping()) return null;
			
			return mapping.relations;
		
		}

		
		
	  	return self;
	  
	  }]);	
	
})();
