(function(){
	/**Controller: Parameters*/
	angular.module('admin').controller("ModalAddEditExternalRelationController",
		['$modalInstance', 'd2Meta', 'd2Map', 'requestService', 'externalRelation',
			function($modalInstance, d2Meta, d2Map, requestService, externalRelation) {


				var self = this;

				return self;
				self.aSelected = null;
				self.bSelected = null;

				self.types = d2Map.denominatorTypes();
				self.typeSelected = null;

				var denominators = d2Map.denominatorsConfigured();
				//Add name
				for (var i = 0; i < denominators.length; i++) {
					denominators[i]['name'] = d2Map.d2NameFromID(denominators[i].dataID);
				}
				self.denominatorsFiltered = [];

				//Add
				if (denominatorRelation === null) {
					self.title = "Add denominator relation";
					self.name = '';
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

					self.aSelected['name'] = d2Map.d2NameFromID(self.aSelected.dataID);
					self.bSelected['name'] = d2Map.d2NameFromID(self.bSelected.dataID);

				}


				function getType(typeCode) {
					for (var i = 0; i < self.types.length; i++) {
						if (self.types[i].code === typeCode) return self.types[i];
					}
				}

				self.filterDenominators = function() {
					self.denominatorsFiltered = [];
					for (var i = 0; i < denominators.length; i++) {
						if (self.typeSelected && denominators[i].type === self.typeSelected.code) {
							self.denominatorsFiltered.push(denominators[i]);
						}
					}
				}


				self.cancel = function () {
					$modalInstance.close();
				};

				self.save = function () {

					var savedRelation = {
						"A": self.aSelected.code,
						"B": self.bSelected.code,
						"type": self.typeSelected.code,
						"criteria": self.criteria,
						"name": self.name,
						"code": externalRelation && externalRelation.code ? externalRelation.code : null
					};

					$modalInstance.close({'externalRelation': savedRelation});
				};

				self.filterDenominators();

			}]);
})();