(function(){  
	angular.module('dataQualityApp').service('requestService',
	['BASE_URL', '$http', '$q', 'notificationService',
	function (BASE_URL, $http, $q, notificationService) {
	
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

		self.validResponse = function(response) {
			//TODO - need to decide how to handle this better in general
			if (Object.prototype.toString.call(response) === '[object Array]') return true;


			var data = response.data;
			var status = response.status;
			if (status != 200) {
				//TODO: Should split it instead
				if (status === 409 && (data.indexOf("Table exceeds") > -1)) {
					console.log("Query result too big");
				}

				//No children for this boundary ou - no worries..
				else if (status === 409 && (data.indexOf("Dimension ou is present") > -1)) {
					console.log("Requested child data for a unit without children");
				}

				//Probably time out - try again
				else if (status === 0) {
					console.log("Timout - retrying");
				}

				else if (status === 302 && typeof(response.data) === 'string' && response.data.indexOf('class="loginPage"') >= 0) {
					console.log("User has been logged out");
					notificationService.notify("test", "test").then(function() {
						window.location = BASE_URL + '/dhis-web-dashboard-integration/index.action'
					});
				}

				//Unknown error
				else {
					console.log("Unknown error while fetching data: " + response.statusText);
				}
				return false;
			}
			else if (typeof(response.data) === 'string' && response.data.indexOf('class="loginPage"') >= 0) {
				console.log("User has been logged out");
				notificationService.notify("Logged out", "You are logged out, and will be redirected to the login page.").then(function() {
					window.location = BASE_URL + '/dhis-web-dashboard-integration/index.action'
				});
				return false;
			}
			return true
		}
		
		      
		return self;
	
	}]);
	
})();