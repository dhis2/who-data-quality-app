/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */


/**Controller: Parameters*/
angular.module("admin").controller("ModalAddEditDenominatorRelationController",
	["$uibModalInstance", "d2Meta", "d2Map", "requestService", "denominatorRelation",
		function($uibModalInstance, d2Meta, d2Map, requestService, denominatorRelation) {


			var self = this;
			self.aSelected = null;
			self.bSelected = null;

			self.types = d2Map.denominatorTypes();
			self.typeSelected = null;

			var denominators = d2Map.denominatorsConfigured();
			//Add name
			for (let i = 0; i < denominators.length; i++) {
				denominators[i]["name"] = d2Map.d2NameFromID(denominators[i].dataID);
			}
			self.denominatorsFiltered = [];

			//Add
			if (denominatorRelation === null) {
				self.title = "Add denominator relation";
				self.name = "";
				self.criteria = 10;
			}

			//Edit
			else {
				self.title = "Edit denominator relation";
				self.name = denominatorRelation.name;
				self.typeSelected = getType(denominatorRelation.type);
				self.criteria = denominatorRelation.criteria;

				self.aSelected = d2Map.denominators(denominatorRelation.A);
				self.bSelected = d2Map.denominators(denominatorRelation.B);

				self.aSelected["name"] = d2Map.d2NameFromID(self.aSelected.dataID);
				self.bSelected["name"] = d2Map.d2NameFromID(self.bSelected.dataID);



			}


			function getType(typeCode) {
				for (let i = 0; i < self.types.length; i++) {
					if (self.types[i].code === typeCode) return self.types[i];
				}
			}

			self.filterDenominators = function() {
				self.denominatorsFiltered = [];
				for (let i = 0; i < denominators.length; i++) {
					if (self.typeSelected && (denominators[i].type === self.typeSelected.code || self.typeSelected.code === "un")) {
						denominators[i].displayName = denominators[i].name;
						self.denominatorsFiltered.push(denominators[i]);
					}
				}
			};


			self.cancel = function () {
				$uibModalInstance.close();
			};

			self.save = function () {

				var savedDenominator = {
					"A": self.aSelected.code,
					"B": self.bSelected.code,
					"type": self.typeSelected.code,
					"criteria": self.criteria,
					"name": self.name,
					"code": denominatorRelation && denominatorRelation.code ? denominatorRelation.code : null
				};

				$uibModalInstance.close({"denominatorRelation": savedDenominator});
			};

			self.filterDenominators();

		}]);
