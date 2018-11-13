/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */


/**Controller: Parameters*/
angular.module("admin").controller("ModalAddEditRelationController",
	["$uibModalInstance", "indicators", "relation", "d2Map", "d2Utils",
		function($uibModalInstance, indicators, relation, d2Map, d2Utils) {

			var self = this;
			self.aSelected = null;
			self.bSelected = null;

			self.types = d2Map.dataRelationTypes();
			self.typeSelected = null;

			//Make a uib-dropdown list with numerator codes and DHIS names
			self.numeratorList = [];
			for (let i = 0; i < indicators.length; i++) {
				if (indicators[i].dataID) {
					self.numeratorList.push(
						{
							"displayName": d2Map.d2NameFromID(indicators[i].dataID),
							"id": indicators[i].dataID,
							"code": indicators[i].code
						}
					);
				}
			}
			d2Utils.arraySortByProperty(self.numeratorList, "displayName", false);


			//Add
			if (relation === null) {
				self.title = "Add relation";
				self.relation = {
					"A": null,
					"B": null,
					"type": null,
					"criteria": 10,
					"name": null,
					"code": null
				};
			}

			//Edit
			else {
				self.title = "Edit relation";
				self.relation = {
					"A": relation.A,
					"B": relation.B,
					"type": relation.type,
					"criteria": relation.criteria,
					"name": relation.name,
					"code": relation.code
				};

				self.aSelected = getData(self.relation.A);
				self.bSelected = getData(self.relation.B);
				self.typeSelected = getType(self.relation.type);
			}

			function getData(dataCode) {
				for (let i = 0; i < self.numeratorList.length; i++) {
					if (self.numeratorList[i].code === dataCode) return self.numeratorList[i];
				}
			}

			function getType(typeCode) {
				return d2Map.dataRelationType(typeCode);
			}


			self.cancel = function () {
				$uibModalInstance.close();
			};

			self.save = function () {

				self.relation.A = self.aSelected.code;
				self.relation.B = self.bSelected.code;
				self.relation.type = self.typeSelected.code;

				if (self.relation.type === "do") self.relation.criteria = null;


				$uibModalInstance.close({"relation": self.relation});
			};

		}]);
