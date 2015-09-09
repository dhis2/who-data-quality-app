(function(){
	/**Controller: Parameters*/
	angular.module('admin').controller("ModalAddEditDenominatorController",
		['$modalInstance', '$scope', 'metaDataService', 'requestService', 'denominator',
			function($modalInstance, $scope, metaDataService, requestService, denominator) {

				var self = this;
				self.aSelected = null;
				self.bSelected = null;

				self.types = [
					{'name': 'UN population consistency', 'code': 'un'},
					{'name': 'Total Population', 'code': 'total'},
					{'name': 'Live births', 'code': 'lb'},
					{'name': 'Children < 1 year', 'code': 'lt1'},
					{'name': 'Expected pregnancies', 'code': 'ep'},
					{'name': 'Other', 'code': 'other'}
				];
				self.typeSelected = null;
				self.dataTypes = [
					{'name': 'Data element (total)', 'code': 'det'},
					{'name': 'Data element (details)', 'code': 'ded'},
					{'name': 'Indicator', 'code': 'in'}
				];
				self.dataTypeA = self.dataTypes[0];
				self.dataTypeB = self.dataTypes[0];

				self.dataA;
				self.dataB;
				self.dataSearchResultA = [];
				self.dataSearchResultB = [];

				self.levels = [];
				self.lowLevel;
				metaDataService.getOrgunitLevels().then(
					function(levels) {
						self.levels = levels;

						if (denominator && denominator.maxLevel) {
							for (var i = 0; i < levels.length; i++) {

								if (denominator.maxLevel === levels[i].level) {
									self.lowLevel = levels[i];
								}

							}
						}

					}
				);

				//Add
				if (denominator === null) {
					self.title = "Add denominator check";
					self.name = '';
				}

				//Edit
				else {
					self.title = "Edit denominator";
					self.name = denominator.name;
					metaDataService.getData(denominator.idA).then(function(data) {
						self.dataA = data;
					});
					metaDataService.getData(denominator.idB).then(function(data) {
						self.dataB = data;
					});
					self.typeSelected = getType(denominator.type);
					self.criteria = denominator.criteria;

				}

				self.dataSearch = function(searchString, indicator) {
					if (searchString.length >= 2) {

						var targetArray, type;
						if (indicator === 'a') {
							type = self.dataTypeA.code;
						}
						else {
							type = self.dataTypeB.code;
						}

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
						var requestURL = "/api/indicators.json?filter=name:like:" + searchString + "&paging=false&fields=name,id";
						requestService.getSingle(requestURL).then(function (response) {

							//will do with API filter once API-filter is stable
							var result = response.data.indicators.sort(function(a,b) {
								return (a.name < b.name) ? -1 : 1;
							});
							if (indicator === 'a') {
								self.dataSearchResultA = result;
							}
							else {
								self.dataSearchResultB = result;
							}

						});
					}
				};

				function dataElementSearch(searchString, indicator){
					if (searchString.length >= 2) {
						var requestURL = "/api/dataElements.json?filter=name:like:" + searchString + "&paging=false&fields=name,id";
						requestService.getSingle(requestURL).then(function (response) {

							//will do with API filter once API-filter is stable
							var result = response.data.dataElements.sort(function(a,b) {
								return (a.name < b.name) ? -1 : 1;
							});
							if (indicator === 'a') {
								self.dataSearchResultA = result;
							}
							else {
								self.dataSearchResultB = result;
							}

						});
					}
				};

				function dataElementOperandSearch(searchString, indicator){
					if (searchString.length >= 2) {
						var requestURL = "/api/dataElementOperands.json?filter=name:like:" + searchString + "&paging=false&fields=name,id";
						requestService.getSingle(requestURL).then(function (response) {

							//will do with API filter once API-filter is stable
							var result = response.data.dataElementOperands.sort(function(a,b) {
								return (a.name < b.name) ? -1 : 1;
							});
							if (indicator === 'a') {
								self.dataSearchResultA = result;
							}
							else {
								self.dataSearchResultB = result;
							}

						});
					}
				};

				function getData(dataCode) {
					for (var i = 0; i < self.indicators.length; i++) {
						if (self.indicators[i].code === dataCode) return self.indicators[i];
					}
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
						"idA": self.dataA.id,
						"idB": self.dataB.id,
						"type": self.typeSelected.code,
						"criteria": self.criteria,
						"name": self.name,
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