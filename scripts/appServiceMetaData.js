(function(){  
	angular.module('dataQualityApp').service('metaDataService', ['$q', 'requestService', function ($q, requestService) {
	  	
	  	var self = this;
	  	
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
	  			console.log("Data sets available locally");
	  			deferred.resolve(self.dataSets.data);
	  		}
	  		//waiting for server
	  		else if (!dataSets.available && dataSets.promise) {
	  			console.log("Data sets already requested");
	  			return dataSets.promise;
	  		}
	  		//need to be fetched
			else {
				console.log("Requesting data sets");
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
	  	
	  	
	  		  	
	  	self.dataSetFromID = function(dataSetID) {
	  		for (var j = 0; j < dataSets.data.length; j++) {
	  			if (dataSetID === dataSets.data[j].id) {
	  				return dataSets.data[j];
	  			}			
	  		}
	  	};
	  	
	  	
	  	/**Indicators*/
		self.getIndicators = function() { 
			
				var deferred = $q.defer();
				
				//available locally
				if (indicators.available) {
					console.log("Indicators available locally");
					deferred.resolve(self.dataSets.data);
				}
				//waiting for server
				else if (!indicators.available && indicators.promise) {
					console.log("Indicators already requested");
					return indicators.promise;
				}
				//need to be fetched
			else {
				console.log("Requesting indicators");
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
					console.log("Data element groups available locally");
					deferred.resolve(self.dataElementGroups.data);
				}
				//waiting for server
				else if (!dataElementGroups.available && dataElementGroups.promise) {
					console.log("Data element groups already requested");
					return dataElementGroupss.promise;
				}
				//need to be fetched
			else {
				console.log("Requesting data element groups");
				var requestURL = '/api/dataElementGroups.json?'; 
				requestURL += 'fields=name,id,dataElements[name,id]&paging=false';
					  
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
		
		
		/**Data elements*/
		self.getDataElements = function() { 
			
				var deferred = $q.defer();
				
				//available locally
				if (dataElements.available) {
					console.log("Data elements available locally");
					deferred.resolve(self.dataElements.data);
				}
				//waiting for server
				else if (!dataElements.available && dataElements.promise) {
					console.log("Data elements already requested");
					return dataElements.promise;
				}
				//need to be fetched
			else {
				console.log("Requesting data elements");
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
		
		
		self.getDataElementsFromIndicator = function(indicator) {
						
			var dataElementIDs = [];			
			dataElementIDs.push.apply(dataElementIDs, indicatorFormulaToDataElementIDs(indicator.numerator));
			dataElementIDs.push.apply(dataElementIDs, indicatorFormulaToDataElementIDs(indicator.denominator));				
			
			
			var dataElementsFound = [];
			for (var i = 0; i < dataElementIDs.length; i++) {
				dataElementsFound.push(self.dataElementFromID(dataElementIDs[i]));
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
				console.log("Orgunits available locally");
				deferred.resolve(orgunits.data);
			}
			//waiting for server
			else if (!orgunits.available && orgunits.promise) {
				console.log("Orgunits already requested");
				return orgunits.promise;
			}
			//need to be fetched
			else {
				console.log("Requesting orgunits");
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
				requestURL += 'userOnly=true&fields=id,name,level,children[name,id]&paging=false';
				  
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
				deferred.resolve(self.rootOrgunits.data);
			}
			//waiting for server
			else if (!rootOrgunits.available && rootOrgunits.promise) {
				return rootOrgunits.promise;
			}
			//need to be fetched
			else {
					var requestURL = '/api/organisationUnits.json?'; 
					  requestURL += 'userDataViewFallback=true&fields=id,name,level,children[name,id]&paging=false';
					  
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
		
		
	  	return self;
	  
	  }]);
	
	
})();
