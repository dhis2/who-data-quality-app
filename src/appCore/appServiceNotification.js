(function(){
	angular.module('dataQualityApp').service('notificationService',
	['$modal',
	function ($modal) {

		var self = this;
		self.notify = notification;

		function notification(title, message) {
			var modalInstance = $modal.open({
				templateUrl: "appCommons/modalNotification.html",
				controller: "ModalNotificationController",
				controllerAs: 'nCtrl',
				resolve: {
					title: function () {
						return title;
					},
					message: function () {
						return message;
					}
				}
			});

			return modalInstance.result;
		}

		return self;

	}]);

})();