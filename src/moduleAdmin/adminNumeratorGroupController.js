(function(){  
	/**Controller: Parameters*/
	angular.module('admin').controller("ModalAddIndicatorGroupController",
	['$uibModalInstance',
	function($uibModalInstance) {
	    	    
	    var self = this; 
	    
	    self.name = '';
	    	    
	    self.cancel = function () {
	        $uibModalInstance.close();
	    };
	    
	    self.save = function () {
	    		    	
	        $uibModalInstance.close({'name': self.name});
	    };
	    
	}]);
})();