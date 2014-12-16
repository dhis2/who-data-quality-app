
(function(){
	
	var app = angular.module('completenessAnalysis', []);
	
	app.controller("AnalysisController", function() {
		var self = this;
		
		console.log("Loading");
		
		
		return self;
	});
	
	
	
	//Directive: Completeness parameters
	app.directive("completenessParameters", function() {
		return {
			restrict: "E",
	        templateUrl: "views/completenessParameters.html"
		};
      
	});
	
	
	//Directive: Completeness results
	app.directive("completenessResult", function() {
		return {
			restrict: "E",
	        templateUrl: "views/completenessResult.html"
		};
	  
	});

	
})();

