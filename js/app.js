
(function(){
  var app = angular.module('dataQualityApp', ['completenessAnalysis', 'ui.select', 'ngSanitize', 'ui.bootstrap']);
    
    //Load base URL
	angular.element(document).ready( 
	  function() {
	      var initInjector = angular.injector(['ng']);
	      var $http = initInjector.get('$http');
       	console.log("Ready");
	      $http.get('manifest.webapp').then(
	        function(data) {
	          	console.log("Done");
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
  	
  	console.log(BASE_URL);
  	
  	this.menuClicked = function(pageClicked) {	
  		this.current = pageClicked;
  	};
  	
  	this.collapse = function() {
  		if (this.isCollapsed) this.isCollapsed = false;
  		else this.isCollapsed = true;
  	}
  });
      
      
  app.service('metaDataService', ['BASE_URL', '$http', '$q', function (BASE_URL, $http, $q) {
  	
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
  	
  	//Triggered initially to start the download
  	self.fetchMetaData = function () {
  		getDataSets();
  		getDataElements();
  		getIndicators();
  	}
  	
  	
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
  			var requestURL = BASE_URL + '/api/dataSets.json?'; 
  			requestURL += 'fields=id,name&paging=false';
  			  
  			$http.get(requestURL)
		       .success(function(data) { 
		       	  dataSets.data = data.dataSets;
		       	 
		          deferred.resolve(dataSets.data);
		          dataSets.available = true;
		       })
		       .error(function(msg, code) {
		          deferred.reject("Error fetching datasets");
		          console.log(msg, code);
		       });
		}
  		dataSets.promise = deferred.promise;
  		return deferred.promise; 
  	}
  	

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
				var requestURL = BASE_URL + '/api/indicators.json?'; 
				requestURL += 'fields=id,name,numerator,denominator&paging=false';
				  
				$http.get(requestURL)
		       .success(function(data) { 
		       	  indicators.data = data.indicators;
		       	 
		          deferred.resolve(indicators.data);
		          indicators.available = true;
		       })
		       .error(function(msg, code) {
		          deferred.reject("Error fetching indicators");
		          console.log(msg, code);
		       });
		}
			indicators.promise = deferred.promise;
			return deferred.promise; 
	}
	
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
				var requestURL = BASE_URL + '/api/dataElements.json?'; 
				  requestURL += 'fields=id,name,dataSets[name,id]&paging=false';
				  
			$http.get(requestURL)
		       .success(function(data) { 
		       	  dataElements.data = data.dataElements;
		       	 
		          deferred.resolve(dataElements.data);
		          dataElements.available = true;
		       })
		       .error(function(msg, code) {
		          deferred.reject("Error fetching datasets");
		          console.log(msg, code);
		       });
		}
			dataElements.promise = deferred.promise;
			return deferred.promise; 
	}
	    	  	
  	return self;
  
  }]);
      
  		              
})();


