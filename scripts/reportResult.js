(function(){  
	/**Controller: Parameters*/
	angular.module('reportCard').controller("ReportResultController", function(metaDataService, periodService, reportService) {
	    
	    var self = this;
	    self.ready = false;
	    self.result = null;
	    
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