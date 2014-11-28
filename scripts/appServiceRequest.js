(function(){  
	angular.module('dataQualityApp').service('requestService', ['BASE_URL', '$http', '$q', function (BASE_URL, $http, $q) {
	
		var self = this;
		      
		self.getMultiple = function(requestURLs) {
			
			var promises = requestURLs.map(function(request) {
				var fullURL = BASE_URL + request;
		    	return $http.get(fullURL);
		    });
		  	
		  	return $q.all(promises);
		};
		
		self.getSingle = function(requestURL) {
			var fullURL = BASE_URL + requestURL;	  	
		  	return $http.get(fullURL);
		};
		
		
		self.post = function(postURL, data) {
			var fullURL = BASE_URL + postURL;	  	
		  	
		  	
		  	return $http.post(fullURL, data);
		};
		
		      
		return self;
	
	}]);
	
})();