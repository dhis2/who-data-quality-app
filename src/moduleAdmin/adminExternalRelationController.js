/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */


/**Controller: Parameters*/
angular.module("admin").controller("ModalAddEditExternalRelationController",
	["$uibModalInstance", "d2Meta", "d2Map", "d2Utils", "requestService", "externalRelation",
		function($uibModalInstance, d2Meta, d2Map, d2Utils, requestService, externalRelation) {


			var self = this;

			self.externalDataSelected = null;
			self.numeratorSelected = null;
			self.denominatorSelected = null;
			self.dataTypeSelected = "dataElements";
			self.levelSelected = null;


			self.numerators = d2Map.numeratorsConfigured();
			//Add name
			for (var i = 0; i < self.numerators.length; i++) {
				self.numerators[i]["name"] = d2Map.d2NameFromID(self.numerators[i].dataID);
			}


			self.denominators = d2Map.denominatorsConfigured();
			//Add name
			for (var i = 0; i < self.denominators.length; i++) {
				self.denominators[i]["name"] = d2Map.d2NameFromID(self.denominators[i].dataID);
			}


			//Add
			if (externalRelation === null) {
				self.title = "Add external data comparison";
				self.criteria = 10;
			}


			//Edit
			else {
				self.title = "Edit external data comparison";
				self.criteria = externalRelation.criteria;
				self.name = externalRelation.name;

				self.dataTypeSelected = externalRelation.dataType;
				self.externalDataSelected = d2Meta.object(externalRelation.dataType, externalRelation.externalData, null);
				self.numeratorSelected = d2Map.numerators(externalRelation.numerator);
				self.denominatorSelected = d2Map.denominators(externalRelation.denominator);


				self.numeratorSelected["name"] = d2Map.d2NameFromID(self.numeratorSelected.dataID);
				self.denominatorSelected["name"] = d2Map.d2NameFromID(self.denominatorSelected.dataID);

			}


			d2Meta.objects("organisationUnitLevels", null, "displayName,level,uid").then(function (levels) {

				d2Utils.arraySortByProperty(levels, "level", true, true);
				self.levels = levels;

				if (externalRelation.level) {
					for (var i = 0; i < self.levels.length; i++) {

						if (self.levels[i].level === externalRelation.level) {
							self.levelSelected = self.levels[i];
							break;
						}
					}
				}
			});


			self.cancel = function () {
				$uibModalInstance.close();
			};

			self.save = function () {

				if (self.dataTypeSelected === "dataElements") {

					if (self.externalDataSelected.id.length > 11) {
						self.dataTypeSelected = "dataElementOperands";
					}


				}

				var savedRelation = {
					"name": self.name,
					"externalData": self.externalDataSelected.id,
					"numerator": self.numeratorSelected.code,
					"denominator": self.denominatorSelected.code,
					"dataType": self.dataTypeSelected,
					"criteria": self.criteria,
					"level": self.levelSelected.level,
					"code": externalRelation && externalRelation.code ? externalRelation.code : null
				};

				$uibModalInstance.close({"externalRelation": savedRelation});
			};

		}]);
