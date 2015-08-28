(function(){  
	/**Controller: Parameters*/
	angular.module('dataQualityApp').controller("ModalNotificationController", function($modalInstance, title, message) {
	    
	    var self = this; 
	    
	    self.title = title;
	    self.message = message;
	    
	    self.close = function () {
	        $modalInstance.close(self.text);
	    };

		return self;
	});
})();