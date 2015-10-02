(function() {

	var app = angular.module('dataQualityApp');

	app.directive('d2SelectDataElement', function () {
		return {
			scope: {
				'ngModel': '=',
				'multiple': '=',
				'onSelect': '&'
			},
			bindToController: true,
			controller: "d2SelectDEController",
			controllerAs: 'd2sCtrl',
			templateUrl: 'appCommons/d2SelectDataElement.html'
		};
	});

	app.controller("d2SelectDEController",
		['d2Meta', 'd2Utils', '$scope',
			function(d2Meta, d2Utils, $scope) {
				var self = this;

				self.groups = [];
				self.group;
				self.elements = [];
				self.element;
				self.disaggregation = 0;

				self.placeholder = "Select data element...";

				self.getElements = getElements;
				self.frameWidth = frameWidth;


				function init() {

					//Get groups
					d2Meta.objects('dataElementGroups').then(
						function(data) {
							self.groups = data;
						}
					)

					//Start looking for changes in selected elements
					$scope.$watchCollection(watchElement, function (newVal, oldVal) {
						if (newVal === oldVal) return;

						//Check if "all" is included
						if (self.multiple) {
							var currentModel = [];
							for (var i = 0; i < self.element.length; i++) {
								if (self.element[i].id === 'all') {
									d2Utils.arrayMerge(currentModel, self.element[i].elements);
								}
								else {
									currentModel.push(self.element[i]);
								}
							}
							currentModel = d2Utils.arrayRemoveDuplicates(currentModel, 'id');
							self.ngModel = {
								'object': currentModel
							};
						}
						else {
							self.ngModel = {
								'object': self.element
							};
						}
					});

				}



				function getElements() {
					self.placeholder = "Loading...";
					if (self.disaggregation === 0) {

						d2Meta.object('dataElementGroups', self.group.id, 'dataElements[name,id]').then(

							function (data) {
								data = data.dataElements;
								if (data.length === 0) self.placeholder = "No data elements in " + self.group.name;
								else self.placeholder = "Select data element...";
								self.elements = data;
								self.elements.unshift({
									name: '[All data elements]',
									id: 'all',
									elements: angular.copy(data)
								});
							}

						);

					}
					else {
						var filter = 'dataElement.dataElementGroups.id:eq:' + self.group.id;
						var fields = 'name,id,dataElementId,optionComboId';
						d2Meta.objects('dataElementOperands', null, fields, filter).then(
							function (data) {
								if (data.length === 0) self.placeholder = "No data elements in " + self.group.name;
								else self.placeholder = "Select data element...";
								self.elements = data;
								self.elements.unshift({
									name: '[All data elements]',
									id: 'all',
									elements: angular.copy(data)
								});
							}
						);
					}
				}

				function watchElement() {
					if (self.multiple) {
						if (!self.element) self.element = [];
						return self.element.length;
					}
					else {
						if (!self.element) self.element = {};
						return self.element.id;
					}
				}


				function frameWidth() {
					return angular.element('#frame').width();
				}



				init();


				return self;
			}]);

})();