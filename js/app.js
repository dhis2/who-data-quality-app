
/**
Start the app
*/
//$(document).ready(function() {
//
//	$.ajax({
//		type: "GET",
//		url: 'manifest.webapp',
//		cache: false,
//		success: function(data){
//		   		     
//			baseURL = data.activities.dhis.href;
//			
//		},
//		error: function (xhr, ajaxOptions, thrownError) {
//			console.log("Error fetching ou levels");	
//		}
//	});
//	
//	
//});


(function(){
  var app = angular.module('dataQualityApp', ['completenessAnalysis', 'ui.select']);
  
  app.config(function(uiSelectConfig) {
  	uiSelectConfig.theme = 'select2';
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


