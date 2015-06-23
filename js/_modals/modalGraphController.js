(function(){  
	/**Controller: Parameters*/
	angular.module('outlierGapAnalysis').controller("ModalGraphController", function($modalInstance, requestService, ouName, dxName, chartOptions, chartData) {
	    
	    var self = this; 
	    
	    self.dxName = dxName;
	    self.ouName = ouName;
	    self.chartOptions = chartOptions;
	    self.chartData = chartData;
	  	
	  		    
	    
	    self.close = function () {
	        $modalInstance.close(self.text);
	    };
	    
	});
})();