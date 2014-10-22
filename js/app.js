
(function(){
  var app = angular.module('dataQualityApp', ['completenessAnalysis', 'ui.select', 'ngSanitize', 'ui.bootstrap']);
    
    //Load base URL and bootstrap
	angular.element(document).ready( 
		function() {
	  		var initInjector = angular.injector(['ng']);
	      	var $http = initInjector.get('$http');
       		
	      	$http.get('manifest.webapp').then(
	        	function(data) {
	          		app.constant("BASE_URL", data.data.activities.dhis.href);
	          		angular.bootstrap(document, ['dataQualityApp']);
	        	}
	      	);
	    }
	);
	
	
  app.config(function(uiSelectConfig) {
  	uiSelectConfig.theme = 'bootstrap';
  });



  app.controller("NavigationController", function(BASE_URL) {
  	this.current = "completeness";
  	this.isCollapsed = true;

  	
  	this.menuClicked = function(pageClicked) {	
  		this.current = pageClicked;
  	};
  	
  	this.collapse = function() {
  		if (this.isCollapsed) this.isCollapsed = false;
  		else this.isCollapsed = true;
  	}
  });
  
  
  
  app.service('requestService', ['BASE_URL', '$http', '$q', function (BASE_URL, $http, $q) {
  
	var self = this;
	      
	self.getMultiple = function(requestURLs) {
		
		var promises = requestURLs.map(function(request) {
			var fullURL = BASE_URL + request;
	    	return $http.get(fullURL);
	    });
	  	
	  	return $q.all(promises);
	}	
	
	self.getSingle = function(requestURL) {
		var fullURL = BASE_URL + requestURL;	  	
	  	return $http.get(fullURL);
	}
	      
	return self;
  
  }]);
  
  
  
  app.service('periodService', [function () {
  	
  	var self = this;
  	self.periodTool = new PeriodType();
  	
  	self.getISOPeriods = function(startDate, endDate, periodType) {
  			
  		var startDate = dateToISOdate(startDate);
  		var endDate = dateToISOdate(endDate);
  			
  		var startDateParts = startDate.split('-');
  		var endDateParts = endDate.split('-');
  		var currentYear = new Date().getFullYear();
  		
  		var periods = [];
  		var periodsInYear;
  		for (var startYear = startDateParts[0]; startYear <= endDateParts[0] && currentYear; startYear++) {
  			
  			periodsInYear = self.periodTool.get(periodType).generatePeriods({'offset': startYear - currentYear, 'filterFuturePeriods': true, 'reversePeriods': false});
  							
  			for (var i = 0; i < periodsInYear.length; i++) {
  				if (periodsInYear[i].endDate >= startDate && periodsInYear[i].endDate <= endDate) {
  					periods.push(periodsInYear[i]);
  				}
  			}
  		}
  		
  		var isoPeriods = [];
  		for (var i = 0; i < periods.length; i++) {
  			isoPeriods.push(periods[i].iso);
  		}
  		
  		//To-do: yearly = duplicates
  		return isoPeriods;
  	}
  	
  	
  	function dateToISOdate(date) {
  		return moment(date).format('YYYY-MM-DD');
  	}
  	
  	
  	return self;
  
  }]);
    
      
      
  app.service('metaDataService', ['$q', 'requestService', function ($q, requestService) {
  	
  	var self = this;
  	
  	var dataElements = {
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
  	
  	/**General*/
  	self.fetchMetaData = function () {
  		self.getDataSets();
  		self.getDataElements();
  		self.getIndicators();
  		self.getOrgunits();
  	}
  	
  	
  	self.metaDataReady = function () {
  		return (dataSets.available && dataElements.available && indicators.available && orgunits.available);
  	}
  	
  	
  	self.allMetaData = function () {
  		return {
  			'dataSets': dataSets.data,
  			'dataElements': dataElements.data,
  			'indicators': indicators.data,
  			'orgunits': orgunits.data
  		};
  	}
  	
  	
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
  	}
  	
  	
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
  		}
  	
  	
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
  			    	var data = response.data;
  			    	deferred.reject("Error fetching datasets");
  			    	console.log(msg, code);
  			    }
  			);
  		}
  		dataSets.promise = deferred.promise;
  		return deferred.promise; 
  	}
  	
  	
  	self.getDataSetsFromDataElement = function(dataElement) {
  		var dataSetsFound = [];
  		if (dataElement.dataSets) {
  			for (var j = 0; j < dataElement.dataSets.length; j++) {
  				dataSetsFound.push(self.dataSetFromID(dataElement.dataSets[j].id));
  			}			
  		}
  		return dataSetsFound;
  	}
  	
  	
  	self.dataSetFromID = function(dataSetID) {
  		for (var j = 0; j < dataSets.data.length; j++) {
  			if (dataSetID === dataSets.data[j].id) {
  				return dataSets.data[j];
  			}			
  		}
  	}
  	
  	
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
			requestURL += 'fields=id,name,dataSets[id]&paging=false';
				  
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
	}
	
	
	self.getDataElementsFromIndicator = function(indicator) {
					
		var dataElementIDs = [];			
		dataElementIDs.push.apply(dataElementIDs, indicatorFormulaToDataElementIDs(indicator.numerator));
		dataElementIDs.push.apply(dataElementIDs, indicatorFormulaToDataElementIDs(indicator.denominator));				
		
		
		var dataElementsFound = [];
		for (var i = 0; i < dataElementIDs.length; i++) {
			dataElementsFound.push(self.dataElementFromID(dataElementIDs[i]));
		}
						
		return self.removeDuplicateObjects(dataElementsFound);
	}
	
	
	self.dataElementFromID = function(dataSetID) {
		for (var j = 0; j < dataElements.data.length; j++) {
			if (dataSetID === dataElements.data[j].id) {
				return dataElements.data[j];
			}			
		}
	}
	
	
	/**Orgunits*/
	self.getOrgunits = function() { 
		
		var deferred = $q.defer();
		
		//available locally
		if (orgunits.available) {
			console.log("Orgunits available locally");
			deferred.resolve(self.orgunits.data);
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
				  requestURL += 'fields=id,name,children[id]&paging=false';
				  
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
	}
	
	
	//Returns array of orgunit child objects based on parent ID
	self.orgunitChildrenFromParentID = function(parentID) {
		
		var children = [];
		for (var i = 0; i < orgunits.data.length ; i++) {
			if (orgunits.data[i].id === parentID) {
				children.push.apply(children, orgunits.data[i].children);
			}
		}
		
		var childrenOrgunits = [];
		for (var i = 0; i < children.length; i++) {
			childrenOrgunits.push(self.orgunitFromID(children[i].id));
		}
		console.log(childrenOrgunits);
		return childrenOrgunits;
	
	}
	
	
	self.orgunitFromID = function(orgunitID) {
		for (var j = 0; j < orgunits.data.length; j++) {
			if (orgunitID === orgunits.data[j].id) {
				return orgunits.data[j];
			}			
		}
	}
	
	
  	return self;
  
  }]);  
  		              
})();


