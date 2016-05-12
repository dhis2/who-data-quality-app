(function(){  
	/**Controller: Parameters*/
	angular.module('outlierGapAnalysis').controller("ModalGraphController",
	['$uibModalInstance', 'requestService', 'ouName', 'dxName', 'chartOptions', 'chartData',
	function($uibModalInstance, requestService, ouName, dxName, chartOptions, chartData) {
	    
	    var self = this; 
	    
	    self.dxName = dxName;
	    self.ouName = ouName;
	    self.chartOptions = chartOptions;
	    self.chartData = chartData;
	  	
	  		    
	    
	    self.close = function () {
	        $uibModalInstance.close(self.text);
	    };
	    
	}]);
})();