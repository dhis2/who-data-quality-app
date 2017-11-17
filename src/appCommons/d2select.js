/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

(function() {

	var app = angular.module("appCommons");

	app.directive("d2Select", function () {
		return {
			scope: {
				"ngModel": "=",
				"options": "=",
				"multiple": "=",
				"ngDisabled": "=",
				"placeholder": "@",
				"onSelect": "&"
			},
			bindToController: true,
			controller: "d2SelectController",
			controllerAs: "d2sCtrl",
			template: require("./d2Select.html")
		};
	});

	app.controller("d2SelectController",
		[
			function() {
				var self = this;

				return self;
			}]);

})();