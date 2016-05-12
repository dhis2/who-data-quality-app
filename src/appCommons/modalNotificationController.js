(function(){  
	/**Controller: Parameters*/
	angular.module('dataQualityApp').controller("ModalNotificationController",
	['$uibModalInstance', 'title', 'message',
	function($uibModalInstance, title, message) {
	    
	    var self = this; 
	    
	    self.title = title;
	    self.message = message;
	    
	    self.close = function () {
	        $uibModalInstance.close(true);
	    };

		return self;
	}]);
})();