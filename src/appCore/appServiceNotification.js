/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

(function(){
	angular.module('dataQualityApp').service('notificationService',
	['$uibModal',
	function ($uibModal) {

		var self = this;
		self.notify = notification;

		function notification(title, message) {
			console.log(title);
			var modalInstance = $uibModal.open({
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