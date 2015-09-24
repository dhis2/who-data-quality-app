
(function(){
	var app = angular.module('dataQualityApp',
	['d2',  'dqAnalysis', 'ngRoute', 'dashboard', 'review', 'consistencyAnalysis', 'outlierGapAnalysis', 'dataExport', 'admin', 'ui.select',
		'ngSanitize', 'ui.bootstrap', 'nvd3', 'angularBootstrapNavTree']);
	
	/**Bootstrap*/
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
				when('/about', {
					templateUrl: 'moduleAbout/about.html',
					controller: 'AboutController',
					controllerAs: 'aCtrl'

				}).
				when('/review', {
					templateUrl: 'moduleReview/review.html',
					controller: 'ReviewController',
					controllerAs: 'revCtrl'

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

})();


