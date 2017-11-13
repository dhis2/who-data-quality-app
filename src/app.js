/**
© Copyright 2017 the World Health Organization (WHO).

This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
*/

(function(){
	i18next
	  .use(i18nextXHRBackend)
	  .init({
	    returnEmptyString: false,
	    fallbackLng: false,
	    keySeparator: '|',
	    backend: {
	      loadPath: '/api/apps/dataQualityTool/i18n/{{lng}}.json'
	    }
	});

	var app = angular.module('dataQualityApp',
	['ngAnimate', 'ngSanitize', 'ngRoute', 'ui.bootstrap', 'ui.select', 'nvd3', 'angularBootstrapNavTree', 'd2',
		'dqAnalysis', 'dashboard', 'review', 'consistencyAnalysis', 'outlierGapAnalysis', 'about', 'dataExport', 'admin', 'jm.i18next']);

	/**Bootstrap*/
	angular.element(document).ready(
		function() {
			var initInjector = angular.injector(['ng']);
			var $http = initInjector.get('$http');

			$http.get('manifest.webapp').then(
				function(response) {
					app.constant("BASE_URL", response.data.activities.dhis.href);
					app.constant("API_VERSION", "25");
					angular.bootstrap(document, ['dataQualityApp']);
				}
			);
		}
	);

	/**Config*/
	app.config(['uiSelectConfig', function(uiSelectConfig) {
		uiSelectConfig.theme = 'bootstrap';
		uiSelectConfig.resetSearchInput = true;
	}]);

	app.config(['$routeProvider',
		function($routeProvider) {
			$routeProvider.
				when('/dashboard', {
					templateUrl: 'moduleDashboard/dashboard.html',
					controller: 'DashboardController',
					controllerAs: 'dashCtrl'
				}).
				when('/consistency', {
					templateUrl: 'moduleConsistency/consistencyAnalysis.html',
					controller: 'ConsistencyAnalysisController',
					controllerAs: 'aCtrl'
				}).
				when('/outlier_gap', {
					templateUrl: 'moduleOutlierGap/viewOutlierAnalysis.html',
					controller: 'OutlierGapAnalysisController',
					controllerAs: 'aCtrl'
				}).
				when('/review', {
					templateUrl: 'moduleReview/review.html',
					controller: 'ReviewController',
					controllerAs: 'revCtrl'

				}).
				when('/about', {
					templateUrl: 'moduleAbout/about.html',
					controller: 'AboutController',
					controllerAs: 'aCtrl'
				}).
				when('/export', {
					templateUrl: 'moduleExport/export.html',
					controller: 'ExportController',
					controllerAs: 'exportCtrl'
				}).
				when('/admin', {
					templateUrl: 'moduleAdmin/admin.html',
					controller: 'AdminController',
					controllerAs: 'admCtrl'
				}).
				otherwise({
					redirectTo: '/dashboard'
				});
		}]
	);

	/**Controller: Navigation*/
	app.controller("NavigationController",
	['BASE_URL', '$location', '$window', 'notificationService',
	function(BASE_URL, $location, $window, notificationService) {
		var self = this;

		self.validBrowser = (navigator.userAgent.indexOf('MSIE 9') >= 0
			|| navigator.userAgent.indexOf('MSIE 8') >= 0
			|| navigator.userAgent.indexOf('MSIE 7') >= 0) ? false : true;

		if (!self.validBrowser) notificationService.notify("Warning", "This browser is not supported. Please upgrade to a recent version of " +
			"Google Chrome or Mozilla Firefox.");


		self.isCollapsed = true;
		self.navClass = function (page) {
			var currentRoute = $location.path().substring(1) || 'dashboard';
			return page === currentRoute ? 'active' : '';
		};

		self.collapse = function() {
			this.isCollapsed = !this.isCollapsed;
		};

		self.exit = function() {
			$window.open(BASE_URL, '_self');
		};

		return self;
	}]);

	app.run(['BASE_URL', '$http', function(BASE_URL, $http) {
		$http.get( BASE_URL + '/api/me/profile.json').then(function (response) {
			if (response.data && response.data.settings && response.data.settings.keyUiLocale) {
				console.log('UI LOCALE: ' + response.data.settings.keyUiLocale);
				i18next.changeLanguage(response.data.settings.keyUiLocale);
			}
		});
	}]);

})();
