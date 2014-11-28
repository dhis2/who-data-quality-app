
(function(){
	
	var app = angular.module('reportCard', []);
	
	
	/**Directive: Completeness parameters*/
	app.directive("reportParameters", function() {
		return {
			restrict: "E",
	        templateUrl: "views/reportParameters.html"
		};
      
	});
	
	
	/**Directive: Report results*/	
	app.directive("reportResult", function() {
		return {
			restrict: "E",
	        templateUrl: "views/reportResult.html"
		};
	  
	});
		
})();

