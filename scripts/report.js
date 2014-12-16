
(function(){
	
	var app = angular.module('reportCard', []);
	
	app.controller("ReviewController", function() {
		var self = this;
		
		console.log("Loading");
		
		
		return self;
	});
	
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

