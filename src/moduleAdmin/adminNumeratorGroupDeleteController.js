(function(){  
	/**Controller: Parameters*/
	angular.module('admin').controller("ModalDeleteIndicatorGroupController",
	['$uibModalInstance', 'groups',
	function($uibModalInstance, groups) {
	    	    
	    var self = this; 
	    
	    self.groups = groups;
	    self.groupSelected = null;
	    
	    	    
	    self.cancel = function () {
	        $uibModalInstance.close();
	    };
	    
	    self.save = function () {
	    		    	
	        $uibModalInstance.close({'group': self.groupSelected.code});
	    };
	    
	}]);
})();
