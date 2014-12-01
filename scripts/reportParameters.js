(function(){  
	/**Controller: Parameters*/
	angular.module('reportCard').controller("ReportParametersController", function(completenessDataService, metaDataService, periodService, reportService) {
	    
	    
	    var self = this;
	    
	    var boundaryID = "E4h5WBOg71F";
	    var analysisLevel = 3;
	    var year = 2013;
	  	
	  	self.doAnalysis = function() {
	  	
   			reportService.doAnalysis(boundaryID, analysisLevel, year);
   		
   		}
    
		return self;
		
	});
})();