
(function(){
	
	var app = angular.module('reportCard', []);
	
	app.controller("ReviewController", function(metaDataService, periodService, reportService, requestService) {
		var self = this;    
		
	    init();
	    
	    function init() {
	    	self.notPossible = false;
	    	self.ready = false;
	    	self.result = null;    
	    	
	    	self.orgunitLevels = [];
	    	self.orgunitLevelSelected = undefined;
	    	
	    	self.userOrgunit = undefined;
	    	
	    	self.years = periodService.getYears();
	    	self.years.shift();
	    	self.yearSelected = self.years[0];
	    	
	    	
	    	self.groups = [];
	    	self.groupSelected = undefined;
	    	
	    	
	    	metaDataService.getUserOrgunits().then(function(data) { 
	    		self.userOrgunit = data[0];
	    		
	    		
	    		metaDataService.getOrgunitLevels().then(function(data) { 
	    			var validLevels = [];
	    			
	    			for (var i = 0; i < data.length; i++) {
	    				if (data[i].level > self.userOrgunit.level && data[i].level <= self.userOrgunit.level+2) {
	    			
	    					validLevels.push(data[i]);
	    				
	    				}
	    			}
	    			
	    			self.orgunitLevels = validLevels;
	    			if (self.orgunitLevels.length === 0) {
	    				self.notPossible = true;
	    			}
	    		});
	    		
	    	});
	    	
	    	//Get mapped data, then do analysis
	    	requestService.getSingle('/api/systemSettings/DQAmapping').then(function(response) {
	    		
	    		var indicators = response.data.data;
	    		var uniqueGroups = {};
	    		for (var i = 0; i < indicators.length; i++) {
	    			if (indicators[i].matched) uniqueGroups[indicators[i].group] = true;
	    		}
	    		self.groups.push({'name': 'Core'});
	    		for (key in uniqueGroups) {
	    			self.groups.push({'name': key});
	    		}
	    	});
	    }
	    
	  	
	  	self.doAnalysis = function() {
	  		
			reportService.doAnalysis(self.userOrgunit.id, self.orgunitLevelSelected.level, self.yearSelected.id, self.groupSelected.name);
			
		}
		
    
	    var resultCallback = function (result) {
    		self.result = result;
    		updateView();
	    }  
	    
	    
	    
	    function updateView() {
	    	if (self.result != null) self.ready = true;
	    }
	    
	    
	    
	    reportService.setCallback(resultCallback);
	
		return self;
	});
		
		
})();

