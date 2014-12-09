(function(){  
	/**Controller: Parameters*/
	angular.module('reportCard').controller("ModalMappingController", function($modalInstance, requestService, orgunitID, orgunitName) {
	    
	    var self = this; 
	    
	    	    
	    self.cancel = function () {
	        $modalInstance.close(self.text);
	    };
	    
	    self.save = function () {
	        $modalInstance.close(self.text);
	    };
	    
	});
})();