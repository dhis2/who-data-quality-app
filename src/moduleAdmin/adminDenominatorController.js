/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

/**Controller: Parameters*/
angular.module("admin").controller("ModalAddEditDenominatorController",
	["$uibModalInstance", "d2Meta", "d2Map", "requestService", "denominator",
		function($uibModalInstance, d2Meta, d2Map, requestService, denominator) {

			var self = this;
			self.aSelected = null;

			self.types = d2Map.denominatorTypes();
			self.typeSelected = null;

			self.dataTypeSelected = "dataElements";

			self.dataSelected = null;

			self.levels = [];
			self.lowLevel;
			d2Meta.objects("organisationUnitLevels", null, "displayName,id,level").then(
				function(levels) {
					self.levels = levels;

					if (denominator && denominator.lowLevel) {
						for (let i = 0; i < levels.length; i++) {

							if (denominator.lowLevel === levels[i].level) {
								self.lowLevel = levels[i];
							}

						}
					}

				}
			);

			//Add
			if (denominator === null) {
				self.title = "Add denominator";
			}

			//Edit
			else {
				self.title = "Edit denominator";

				d2Meta.dataElementOrIndicator(denominator.dataID).then(function(data) {
					self.dataA = data;
				});
				self.typeSelected = getType(denominator.type);
				self.criteria = denominator.criteria;

			}

			function getType(typeCode) {
				for (let i = 0; i < self.types.length; i++) {
					if (self.types[i].code === typeCode) return self.types[i];
				}
			}



			self.cancel = function () {
				$uibModalInstance.close();
			};

			self.save = function () {

				var savedDenominator = {
					"dataID": self.dataSelected.id,
					"type": self.typeSelected.code,
					"lowLevel": self.lowLevel.level,
					"code": denominator && denominator.code ? denominator.code : null
				};

				$uibModalInstance.close({"denominator": savedDenominator});
			};

		}]);
