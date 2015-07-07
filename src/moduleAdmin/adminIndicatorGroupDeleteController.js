(function(){  
	/**Controller: Parameters*/
	angular.module('admin').controller("ModalDeleteIndicatorGroupController", function($modalInstance, $scope, groups) {
	    	    
	    var self = this; 
	    
	    self.groups = groups;
	    self.groupSelected = null;
	    
	    	    
	    self.cancel = function () {
	        $modalInstance.close();
	    };
	    
	    self.save = function () {
	    		    	
	        $modalInstance.close({'group': self.groupSelected.code});
	    };
	    
	});
})();
