(function(){  
	angular.module('dataQualityApp').service('requestService',
	['BASE_URL', '$http', '$q',
	function (BASE_URL, $http, $q) {
	
		var self = this;
		      
		self.getMultiple = function(requestURLs) {
			
			var promises = requestURLs.map(function(request) {
				//Cache analytics requests
				var cache = false;
//				if (request.indexOf("api/analytics") > -1); cache = true;
				var fullURL = BASE_URL + request;
		    	return $http.get(fullURL, {"cache": cache});
		    });
		  	
		  	return $q.all(promises);
		};
		
		self.getSingle = function(requestURL) {
		
		
			//Cache analytics requests
			var cache = false;
//			if (requestURL.indexOf("api/analytics") > -1); cache = true;
		
			var fullURL = BASE_URL + requestURL;	  	
		  	return $http.get(fullURL, {"cache": cache});
		};
		
		self.getSingleLocal = function(requestURL) {  	
		  	return $http.get(requestURL);
		};
		
		
		self.post = function(postURL, data) {
			var fullURL = BASE_URL + postURL;	  	
		  	
		  	return $http.post(fullURL, data);
		};
		
		      
		return self;
	
	}]);
	
})();