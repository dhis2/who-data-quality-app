(function(){
	/**Controller: Parameters*/
	angular.module('admin').controller("ModalAddEditDenominatorController",
		['$modalInstance', 'd2Meta', 'd2Map', 'requestService', 'denominator',
			function($modalInstance, d2Meta, d2Map, requestService, denominator) {

				var self = this;
				self.aSelected = null;

				self.types = d2Map.denominatorTypes();
				self.typeSelected = null;

				self.dataTypes = [
					{'name': 'Data element (total)', 'code': 'det'},
					{'name': 'Data element (details)', 'code': 'ded'},
					{'name': 'Indicator', 'code': 'in'}
				];
				self.dataTypeA = self.dataTypes[0];

				self.dataA;

				self.dataSearchResultA = [];

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

				self.dataSearch = function(searchString, indicator) {
					if (searchString.length >= 2) {

						var targetArray;
						var type = self.dataTypeA.code;

						if (type === 'det') {
							dataElementSearch(searchString, indicator);
						}
						else if (type === 'ded') {
							dataElementOperandSearch(searchString, indicator);
						}
						else {
							indicatorSearch(searchString, indicator);
						}
					}

				}


				function indicatorSearch(searchString, indicator){
					if (searchString.length >= 2) {
						var requestURL = "/api/indicators.json?filter=displayName:like:" + searchString + "&paging=false&fields=displayName,id";
						requestService.getSingle(requestURL).then(function (response) {

							//will do with API filter once API-filter is stable
							var result = response.data.indicators.sort(function(a,b) {
								return (a.name < b.name) ? -1 : 1;
							});

							self.dataSearchResultA = result;
						});
					}
				};

				function dataElementSearch(searchString, indicator){
					if (searchString.length >= 2) {
						var requestURL = "/api/dataElements.json?filter=displayName:like:" + searchString + "&paging=false&fields=displayName,id";
						requestService.getSingle(requestURL).then(function (response) {

							//will do with API filter once API-filter is stable
							var result = response.data.dataElements.sort(function(a,b) {
								return (a.name < b.name) ? -1 : 1;
							});
							self.dataSearchResultA = result;

						});
					}
				};

				function dataElementOperandSearch(searchString, indicator){
					if (searchString.length >= 2) {
						var requestURL = "/api/dataElementOperands.json?filter=displayName:like:" + searchString + "&paging=false&fields=displayName,id";
						requestService.getSingle(requestURL).then(function (response) {

							//will do with API filter once API-filter is stable
							var result = response.data.dataElementOperands.sort(function(a,b) {
								return (a.name < b.name) ? -1 : 1;
							});

							self.dataSearchResultA = result;


						});
					}
				};


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
						"dataID": self.dataA.id,
						"type": self.typeSelected.code,
						"lowLevel": self.lowLevel.level,
						"code": denominator && denominator.code ? denominator.code : null
					};

					if (denominator && denominator.custom === false) {
						savedDenominator.custom = false;
					}
					else {
						savedDenominator.custom = true;
					}

					$modalInstance.close({'denominator': savedDenominator});
				};

			}]);
})();