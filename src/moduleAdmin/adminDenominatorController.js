(function(){
	/**Controller: Parameters*/
	angular.module('admin').controller("ModalAddEditDenominatorController",
		['$modalInstance', 'd2Meta', 'd2Map', 'requestService', 'denominator',
			function($modalInstance, d2Meta, d2Map, requestService, denominator) {

				var self = this;
				self.aSelected = null;

				self.types = d2Map.denominatorTypes();
				self.typeSelected = null;

				self.dataTypeSelected = 'dataElements';

				self.dataSelected = null;

				self.levels = [];
				self.lowLevel;
				d2Meta.objects('organisationUnitLevels', null, 'displayName,id,level').then(
					function(levels) {
						self.levels = levels;

						if (denominator && denominator.lowLevel) {
							for (var i = 0; i < levels.length; i++) {

								if (denominator.lowLevel === levels[i].level) {
									self.lowLevel = levels[i];
								}

							}
						}

					}
				);

				//Add
				if (denominator === null) {
					self.title = "Add denominator check";
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
					for (var i = 0; i < self.types.length; i++) {
						if (self.types[i].code === typeCode) return self.types[i];
					}
				}



				self.cancel = function () {
					$modalInstance.close();
				};

				self.save = function () {

					var savedDenominator = {
						"dataID": self.dataSelected.id,
						"type": self.typeSelected.code,
						"lowLevel": self.lowLevel.level,
						"code": denominator && denominator.code ? denominator.code : null
					};

					$modalInstance.close({'denominator': savedDenominator});
				};

			}]);
})();