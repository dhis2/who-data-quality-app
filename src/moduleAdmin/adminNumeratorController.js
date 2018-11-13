/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */


/**Controller: Parameters*/
angular.module("admin").controller("ModalMappingController",
	["$uibModalInstance", "$scope", "requestService", "d2Meta", "d2Map", "indicator",
		function($uibModalInstance, $scope, requestService, d2Meta, d2Map, indicator) {

			var self = this;

			self.groups = angular.copy(d2Map.groups());

			for (let i = 0; i < self.groups.length; i++) {
				self.groups[i]["displayName"] = self.groups[i]["name"];
			}

			if (!indicator) {
				//Set up new indicator structure
				indicator = {
					"core": false,
					"custom": true,
					"name": "",
					"definition": "",
					"groupsSelected": [],
					"dataTypeSelected": "dataElements",
					"dataSelected": null,
					"dataSetSelected": null
				};
			}

			//TODO: Could just assign self.indicator
			self.core = d2Map.numeratorIsCore(indicator.code);
			self.custom = indicator.custom;
			self.name = indicator.name;
			self.definition = indicator.definition;
			self.groupsSelected = d2Map.numeratorGroups(indicator.code);
			for (let i = 0; i < self.groupsSelected.length; i++) {
				self.groupsSelected[i]["displayName"] = self.groupsSelected[i]["name"];
			}
			self.dataTypeSelected = "dataElements";
			self.dataSelected = null;
			self.dataSetSelected = null;




			self.updateDataSetList = function (data) {
				self.dataSetSelected = undefined;

				if (!data) return;
				else self.dataSelected = data;

				if (self.dataTypeSelected === "dataElements") {

					var id = self.dataSelected.id.substr(0,11);
					d2Meta.object("dataElements", id, "dataSets[displayName,id,periodType],dataSetElements[dataSet[displayName,id,periodType]")
						.then(function(data) {

							if (data.hasOwnProperty("dataSets")) self.dataSets = data.dataSets;
							else {
								var dataset = [];
								for (let i = 0; i < data.dataSetElements.length; i++) {
									dataset.push(data.dataSetElements[i].dataSet);
								}

								self.dataSets = dataset;
							}
						});
				}
				else {
					d2Meta.indicatorDataSets(self.dataSelected.id)
						.then(function(data) {
							self.dataSets = data;
						});
				}
			};

			self.updateDataElementOperandList = function () {
				self.dataCompletenessSelected = undefined;

				//data element
				if (self.dataTypeSelected === "dataElements") {

					//If detail has been selected, variable for completeness is given
					if (self.dataSelected.id.length === 23) {
						self.dataCompleteness = [self.dataSelected];
						self.dataCompletenessSelected = self.dataSelected;
					}

					//Else, get possible variables
					else {
						d2Meta.objects("dataElementOperands", null, "displayName,id", "dataElement.id:eq:" + self.dataSelected.id.substr(0,11), false).then(
							function (data) {
								self.dataCompleteness = data;
							}
						);
					}
				}

				//If indicator, get data elements, then operands
				else {
					d2Meta.indicatorDataElementOperands(self.dataSelected.id).then(
						function (data) {
							self.dataCompleteness = data;
						}
					);
				}
			};

			self.cancel = function () {
				$uibModalInstance.close();
			};

			self.save = function () {
				indicator.name = self.name;
				indicator.core = self.core;
				indicator.definition = self.definition;
				indicator.dataID = self.dataSelected.id;
				indicator.dataSetID = self.dataSetSelected.id;
				indicator.dataElementOperandID = self.dataCompletenessSelected.id;

				delete indicator.groupsSelected;
				delete indicator.dataTypeSelected;
				delete indicator.dataSelected;
				delete indicator.dataSetSelected;
				delete indicator.dataCompletenessSelected;

				$uibModalInstance.close({"indicator": indicator, "groups": self.groupsSelected, "core": self.core});
			};

		}]);
