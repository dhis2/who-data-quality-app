
(function(){
  var app = angular.module('dataQualityApp', ['reportCard', 'completenessAnalysis', 'dataExport', 'appAdmin', 'ui.select', 'ngSanitize', 'ui.bootstrap']);
    
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
	app.config(function(uiSelectConfig) {
		uiSelectConfig.theme = 'bootstrap';
	});
	
	
	/**Controller: Navigation*/
	app.controller("NavigationController", function() {
		this.current = "admin";
		this.isCollapsed = true;
	
		
		this.menuClicked = function(pageClicked) {	
			this.current = pageClicked;
		};
		
		this.collapse = function() {
			if (this.isCollapsed) this.isCollapsed = false;
			else this.isCollapsed = true;
		};
	});

  		              
})();


