(function(){  
	/**Controller: Parameters*/
	angular.module('admin').controller("ModalAddIndicatorGroupController",
	['$modalInstance', '$scope',
	function($modalInstance, $scope) {
	    	    
	    var self = this; 
	    
	    self.name = '';
	    	    
	    self.cancel = function () {
	        $modalInstance.close();
	    };
	    
	    self.save = function () {
	    		    	
	        $modalInstance.close({'name': self.name});
	    };
	    
	}]);
})();