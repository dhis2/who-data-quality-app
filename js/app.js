
(function(){
  var app = angular.module('dataQualityApp', ['completenessAnalysis', 'ui.select', 'ngSanitize']);
  
  app.config(function(uiSelectConfig) {
  	uiSelectConfig.theme = 'bootstrap';
  });
    
  app.controller("NavigationController", function() {
  	this.current = "completeness";
  	
  	this.menuClicked = function(pageClicked) {	
  		this.current = pageClicked;
  	};
    
  });
  
    
  app.factory('commService', function ($http, $q) {
  	
  	var self = this;
  	
  	//Need to get baseURL before anything else can be done, thus async = false
  	self.baseURL = "";
	$.ajax({
  		url: 'manifest.webapp',
  		type: "GET",
  		dataType: 'json',
  		async: false,
  		success: function(data) {
  			self.baseURL = data.activities.dhis.href;
  	  	}
	});
  	
  	self.getBaseURL = function () {
  		return self.baseURL;
  	}
  	
  	
  	
  	return self;
  
  });
  		              
})();


