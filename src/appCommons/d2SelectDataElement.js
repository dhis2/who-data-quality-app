/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

(function() {

	var app = angular.module("appCommons");

	app.directive("d2SelectDataElement", function () {
		return {
			scope: {
				"ngModel": "=",
				"dataset": "=",
				"multiple": "=",
				"onSelect": "&"
			},
			bindToController: true,
			controller: "d2SelectDEController",
			controllerAs: "d2sCtrl",
			template: require("./d2SelectDataElement.html")
		};
	});

	app.controller("d2SelectDEController",
		["d2Meta", "d2Map", "d2Utils", "$i18next", "$scope",
			function(d2Meta, d2Map, d2Utils, $i18next, $scope) {
				var self = this;

				self.groups = [];
				self.group;
				self.elements = [];
				self.element;
				self.disaggregation = 0;

				self.placeholder = $i18next.t("Select data element...");

				self.getElements = getElements;
				self.frameWidth = frameWidth;


				function init() {

					//Get groups
					var object = self.dataset ? "dataSets" : "dataElementGroups";
					d2Meta.objects(object).then(
						function(data) {
							self.groups = data;
						}
					);


					//Start looking for changes in selected elements
					$scope.$watchCollection(watchElement, function (newVal, oldVal) {
						if (newVal === oldVal) return;

						//Check if "all" is included
						if (self.multiple) {
							var currentModel = [];
							for (let i = 0; i < self.element.length; i++) {
								if (self.element[i].id === "all") {
									d2Utils.arrayMerge(currentModel, self.element[i].elements);
								}
								else {
									currentModel.push(self.element[i]);
								}
							}
							currentModel = d2Utils.arrayRemoveDuplicates(currentModel, "id");
							self.ngModel = currentModel;
						}
						else {
							self.ngModel = self.element;
						}

						self.onSelect({"object": self.ngModel});

					});
				}


				function getElements() {
					if (!self.group) return;

					self.placeholder = $i18next.t("Loading...");

					var fields;

					if (self.disaggregation === 0) {
						if (self.dataset) {
							fields = "dataSetElements[dataElement[displayName,id]]";
						}
						else {
							fields = "dataElements[displayName,id]";
						}
						var object = self.dataset ? "dataSets" : "dataElementGroups";
						d2Meta.object(object, self.group.id, fields).then(function(data) {
							if (self.dataset) {
								var elements = [];
								for (let i = 0; i < data.dataSetElements.length; i++) {
									elements.push(data.dataSetElements[i].dataElement);
								}
								saveElements(elements);
							}
							else {
								saveElements(data.dataElements);
							}
						});

					}
					else {
						var filter;
						if (self.dataset) {
							filter = "dataElement.dataSetElements.dataSet.id:eq:" + self.group.id;
						}
						else {
							filter = "dataElement.dataElementGroups.id:eq:" + self.group.id;
						}
						fields = "displayName,id,dataElementId,optionComboId";
						d2Meta.objects("dataElementOperands", null, fields, filter).then(function(data) {saveElements(data);});
					}
				}


				function saveElements(data) {
					if (data.length === 0) self.placeholder = $i18next.t("No data elements in ") + self.group.name;
					else self.placeholder = $i18next.t("Select data element...");


					if (self.multiple) filterElements(data);
					d2Utils.arraySortByProperty(data, "displayName", false);

					if (self.multiple != undefined && self.multiple) {
						data.unshift({
							displayName: $i18next.t("[All data elements]"),
							id: "all",
							group: self.group.id,
							elements: angular.copy(data)
						});
					}

					self.elements = data;
				}


				function filterElements(data) {
					for (let i = 0; i < data.length; i++) {
						for (let j = 0; self.element && j < self.element.length; j++) {

							var remove = false;
							if (data[i].id === self.element[j].id) {
								if (data[i].id === "all") {
									if (data.group === self.element[j].group) {
										remove = true;
									}
								}
								else {
									remove = true;
								}
							}
							if (remove) data.splice(i, 1);
						}

					}
				}


				function watchElement() {
					if (self.multiple) {
						if (!self.element) {
							return null;
						}
						return self.element.length;
					}
					else {
						if (!self.element) {
							return null;
						}
						return self.element.id;
					}
				}


				function frameWidth() {
					return angular.element("#frame").width();
				}


				init();


				return self;
			}]);

})();