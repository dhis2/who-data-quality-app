(function(){  
	/**Controller: Parameters*/
	angular.module('reportCard').controller("ModalAddIndicatorGroupController", function($modalInstance, $scope) {
	    	    
	    var self = this; 
	    
	    self.name = '';
	    	    
	    self.cancel = function () {
	        $modalInstance.close();
	    };
	    
	    self.save = function () {
	    		    	
	        $modalInstance.close({'name': self.name});
	    };
	    
	});
})();