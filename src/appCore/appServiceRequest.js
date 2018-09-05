/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

export default function (BASE_URL, API_VERSION, $http, $q, notificationService) {

	var self = this;

	self.getMultiple = function(requestURLs) {

		var promises = requestURLs.map(function(request) {

			//Cache analytics requests
			var cache = false;
			//				if (request.indexOf("api/analytics") > -1); cache = true;

			var fullURL = BASE_URL + "/api/" + API_VERSION + request;
			return $http.get(fullURL, {"cache": cache});
		});

		return $q.all(promises);
	};

	self.getSingle = function(requestURL) {


		//Cache analytics requests
		var cache = false;
		//			if (requestURL.indexOf("api/analytics") > -1); cache = true;

		var fullURL = BASE_URL + "/api/" + API_VERSION + requestURL;
		return $http.get(fullURL, {"cache": cache});
	};


	self.getSingleData = function(requestURL) {
		var deferred = $q.defer();

		//Cache analytics requests
		var cache = false;
		//if (requestURL.indexOf("api/analytics") > -1); cache = true;

		var fullURL = BASE_URL + "/api/" + API_VERSION + requestURL;
		$http.get(fullURL, {"cache": cache}).then(function(response) {
			if (self.validResponse(response)) {
				deferred.resolve(response.data);
			}
			else {
				deferred.resolve(null);
			}
		},
		function(error) {
			deferred.reject(error);
		});

		return deferred.promise;
	};



	self.getSingleLocal = function(requestURL) {
		return $http.get(requestURL);
	};


	self.post = function(postURL, data) {
		var fullURL = BASE_URL + "/api/" + API_VERSION + postURL;

		return $http.post(fullURL, data);
	};

	self.put = function(postURL, data) {
		var fullURL = BASE_URL + "/api/" + API_VERSION + postURL;

		return $http.put(fullURL, data);
	};

	self.validResponse = function(response) {
		//TODO - need to decide how to handle this better in general
		if (Object.prototype.toString.call(response) === "[object Array]") return true;


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

			else if (status === 302 && typeof(response.data) === "string" && response.data.indexOf("class=\"loginPage\"") >= 0) {
				console.log("User has been logged out");
				notificationService.notify("test", "test").then(function() {
					window.location = BASE_URL + "/dhis-web-dashboard-integration/index.action";
				});
			}

			//Unknown error
			else {
				console.log("Unknown error while fetching data: " + response.statusText);
			}
			return false;
		}
		else if (typeof(response.data) === "string" && response.data.indexOf("class=\"loginPage\"") >= 0) {
			console.log("User has been logged out");
			notificationService.notify($i18next.t("Logged out"), $i18next.t("You are logged out, and will be redirected to the login page.")).then(function() {
				window.location = BASE_URL + "/dhis-web-dashboard-integration/index.action";
			});
			return false;
		}
		return true;
	};


	return self;

}