(function(){
	/**Controller: Parameters*/
	angular.module('admin').controller("ModalAddEditExternalRelationController",
		['$modalInstance', 'd2Meta', 'd2Map', 'requestService', 'externalRelation',
			function($modalInstance, d2Meta, d2Map, requestService, externalRelation) {


				var self = this;

				self.externalDataSelected = null;
				self.numeratorSelected = null;
				self.denominatorSelected = null;
				self.dataTypeSelected = 'dataElements';


				self.numerators = d2Map.numeratorsConfigured();
				//Add name
				for (var i = 0; i < self.numerators.length; i++) {
					self.numerators[i]['name'] = d2Map.d2NameFromID(self.numerators[i].dataID);
				}


				self.denominators = d2Map.denominatorsConfigured();
				//Add name
				for (var i = 0; i < self.denominators.length; i++) {
					self.denominators[i]['name'] = d2Map.d2NameFromID(self.denominators[i].dataID);
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

					self.dataTypeSelected = externalRelation.dataType;
					self.externalDataSelected = d2Meta.object(externalRelation.dataType, externalRelation.externalData, null);
					self.numeratorSelected = d2Map.numerators(externalRelation.numerator);
					self.denominatorSelected = d2Map.denominators(externalRelation.denominator);


					self.numeratorSelected['name'] = d2Map.d2NameFromID(self.numeratorSelected.dataID);
					self.denominatorSelected['name'] = d2Map.d2NameFromID(self.denominatorSelected.dataID);

				}


				self.cancel = function () {
					$modalInstance.close();
				};

				self.save = function () {

					if (self.dataTypeSelected === 'dataElements') {

						if (self.externalDataSelected.id.length > 11) {
							self.dataTypeSelected = 'dataElementOperands';
						}


					}

					var savedRelation = {
						"externalData": self.externalDataSelected.id,
						"numerator": self.numeratorSelected.code,
						"denominator": self.denominatorSelected.code,
						"dataType": self.dataTypeSelected,
						"criteria": self.criteria,
						"code": externalRelation && externalRelation.code ? externalRelation.code : null
					};

					$modalInstance.close({'externalRelation': savedRelation});
				};

			}]);
})();