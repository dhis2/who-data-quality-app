(function(){  
	/**Controller: Parameters*/
	angular.module('reportCard').controller("ModalAddEditRelationController", function($modalInstance, $scope, indicators, relation) {
	    	    
	    var self = this; 
	    
	        
	    	    
	    self.cancel = function () {
	        $modalInstance.close();
	    };
	    
	    self.save = function () {
	    		    	
	        $modalInstance.close();
	    };
	    
	});
})();