
(function(){
	
	var app = angular.module('completenessAnalysis', []);
	
	
	/**Directive: Completeness parameters*/
	app.directive("completenessParameters", function() {
		return {
			restrict: "E",
	        templateUrl: "views/completenessParameters.html"
		};
      
	});
	
	
	/**Directive: Completeness results*/	
	app.directive("completenessResult", function() {
		return {
			restrict: "E",
	        templateUrl: "views/completenessResult.html"
		};
	  
	});
	
})();

