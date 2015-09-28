(function(){

	angular.module('d2').factory('d2Meta',
		['requestService', 'd2Utils', '$q',
			function (requestService, d2Utils, $q) {

				//Define factory API
				var service = {
					orgunitIDs: orgunitIDs,
					userOrgunit: userOrgunit,
					userOrgunits: userOrgunits,
					userOrgunitsHierarchy: userOrgunitsHierarchy,
					userAnalysisOrgunits: userAnalysisOrgunits,
					datasets: datasets,
					datasetDataElements: datasetDataElements,
					dataElement: dataElement,
					dataElementGroups: dataElementGroups,
					dataElementGroupDataElements: dataElementGroupDataElements,
					indicator: indicator,
					indicatorDataElements: indicatorDataElements,
					indicatorDatasets: indicatorDatasets,
					indicatorFormulaText: indicatorFormulaText,
					indicatorGroups: indicatorGroups,
					indicatorGroupIndicators: indicatorGroupIndicators
				};


				/** ===== GENERAL ===== */







				/** ===== ORGUNITS ===== */

				/**
				 * Returns and array of orgunit IDs based on orgunit boundary and level and/or group. If both level
				 * and group is specified, level will be used.
				 *
				 * @param ouBoundary
				 * @param ouLevel
				 * @param ouGroup
				 */
				function orgunitIDs(ouBoundary, ouLevel, ouGroup) {
					var deferred = $q.defer();

					//Find orgunit disaggregation
					var ouDisaggregation = '';
					if (ouLevel) ouDisaggregation += ';LEVEL-' + ouLevel;
					else if (ouGroup) ouDisaggregation += ';OU_GROUP-' + ouGroup;

					var requestURL = '/api/analytics.json?dimension=pe:2000W01'; //Period is not important
					requestURL += '&filter=ou:' + d2Utils.toArray(ouBoundary).join(';');
					requestURL += ouDisaggregation;
					requestURL += '&displayProperty=NAME&skipData=true';

					requestService.getSingleData(requestURL).then(function(data) {

						var orgunits = data.metaData.ou;
						var boundary = [];
						var subunits = [];

						var ou, boundary;
						for (var i = 0; i < orgunits.length; i++) {
							ou = orgunits[i];
							boundary = false;
							for (var j = 0; !boundary && j < ouBoundary.length; j++) {

								if (ou == ouBoundary[j]) boundary = true;

							}

							boundary ? boundary.push(ou) : subunits.push(ou);
						}

						deferred.resolve({
							'orgunits': orgunits,
							'boundary': boundary,
							'subunits': subunits
						});
					});

					return deferred.promise;
				}


				/**
				 * Returns user orgunit. If user has multiple orgunits, the one at the lowest level is
				 * returned. If there are multiple orgunits at the same level, the first returned from the
				 * server is return.
				 *
				 * @returns {*}		User orgunit object
				 */
				function userOrgunit() {
					var deferred = $q.defer();

					var requestURL = '/api/organisationUnits.json?';
					requestURL += 'userOnly=true&fields=id,name,level&paging=false';

					requestService.getSingleData(requestURL).then(
						function(data) { //success
							var data = data.organisationUnits;

							var minLevel = 100;
							var lowestOrgunit = null;
							for (var i = (data.length - 1); i >= 0; i--) {
								if (data[i].level < minLevel) {
									minLevel = data[i].level;
									lowestOrgunit = data[i];
								}
							}
							deferred.resolve(lowestOrgunit);
						},
						function(response) { //error
							deferred.reject("Error in userOrgunit()");
							console.log(response);
						}
					);

					return deferred.promise;
				}


				/**
				 * Returns user orgunits, i.e. an array of all user orgunits.
				 *
				 * @returns {*}		Array of user orgunit objects
				 */
				function userOrgunits() {
					var deferred = $q.defer();

					var requestURL = '/api/organisationUnits.json?';
					requestURL += 'userOnly=true&fields=id,name,level&paging=false';

					requestService.getSingleData(requestURL).then(
						function(data) { //success
							var data = data.organisationUnits;
							deferred.resolve(data);
						},
						function(error) { //error
							deferred.reject("Error in userOrgunits()");
							console.log(error);
						}
					);

					return deferred.promise;
				};


				/**
				 * Returns user orgunits, i.e. an array of all user orgunits, including their childrena and
				 * grandchildren. TODO: merge with userOrgunits, and have children as parameter
				 *
				 * @returns {*}
				 */
				function userOrgunitsHierarchy() {
					var deferred = $q.defer();

					var requestURL = '/api/organisationUnits.json?';
					requestURL += 'userOnly=true&fields=id,name,level,children[name,level,id,children[name,level,id]]&paging=false';

					requestService.getSingleData(requestURL).then(
						function(data) { //success

							var data = data.organisationUnits;
							deferred.resolve(data);

						},
						function(error) { //error
							deferred.reject("Error in userOrgunitsHierarchy()");
							console.log(error);
						}
					);

					return deferred.promise;
				};


				/**
				 * Returns user view orgunits. Includes children, and a bool to indicate whether grandchildren
				 * exists for each child.
				 *
				 * @returns {*}
				 */
				function userAnalysisOrgunits() {
					var deferred = $q.defer();

					var requestURL = '/api/organisationUnits.json?';
					requestURL += 'userDataViewFallback=true&fields=id,name,level,children[name,level,id,children::isNotEmpty]&paging=false';

					requestService.getSingleData(requestURL).then(
						function(data) { //success
							var data = data.organisationUnits;
							deferred.resolve(data);
						},
						function(error) { //error
							deferred.reject("Error in userAnalysisOrgunits()");
							console.log(error);
						}
					);

					return deferred.promise;
				};



				/** ===== DATASETS ===== */
				function datasets() {
					var deferred = $q.defer();

					var requestURL = '/api/dataSets.json?fields=name,id';
					requestURL += '&paging=false';

					requestService.getSingleData(requestURL).then(
						function(data) {
							d2Utils.arraySortByProperty(data.dataSets, 'name', false);
							deferred.resolve(data.dataSets);
						},
						function(error){
							console.log("d2meta error: datasets()");
							console.log(error);
						}
					);

					return deferred.promise;
				}



				function datasetDataElements(id) {
					var deferred = $q.defer();

					var requestURL = '/api/dataSets/' + id + '.json?';
					requestURL += 'fields=dataElements[name,id]';
					requestURL += '&paging=false';

					requestService.getSingleData(requestURL).then(
						function(data) {
							d2Utils.arraySortByProperty(data.dataElements, 'name', false);
							deferred.resolve(data.dataElements);
						},
						function(error){
							console.log("d2meta error: datasetDataElements()");
							console.log(error);
						}
					);

					return deferred.promise;
				}



				/** ===== DATA ELEMENTS ===== */
				function dataElement(id, fieldString) {
					var deferred = $q.defer();

					var requestURL = '/api/dataElements/' + id + '.json?';
					if (fieldString) requestURL += '&fields=' + fieldString;
					else requestURL += '&fields=name,id';

					requestService.getSingleData(requestURL).then(
						function(data) {
							deferred.resolve(data);
						},
						function(error){
							console.log("d2meta error: dataElement(id, fieldString)");
							console.log(error);
						}
					);

					return deferred.promise;
				}



				function dataElementsFromIDs(ids) {
					var deferred = $q.defer();


					var requestURL = '/api/dataElements.json?';
					requestURL += 'fields=name,id';
					requestURL += '&filter=id:in:[' + ids.join(',') + ']';
					requestURL += '&paging=false';

					requestService.getSingleData(requestURL).then(
						function (data) {
							deferred.resolve(data.dataElements);
						},
						function(error){
							console.log("d2meta error: dataElementsFromIDs(ids)");
							console.log(error);
						});

					return deferred.promise;
				}



				function dataElementOperandsFromIDs(ids) {
					var deferred = $q.defer();

					var categoryOptionCombos = [];
					var dataElements = [];
					for (var i = 0; i < ids.length; i++) {
						var parts = ids[i].split('.');
						dataElements.push(parts[0]);
						categoryOptionCombos.push(parts[1]);
					}

					var promises = [];
					promises.push(dataElementsFromIDs(dataElements));
					promises.push(categoryOptionCombosFromIDs(categoryOptionCombos));
					$q.all(promises).then(
						function(datas) {
							var operands = [];
							for (var i = 0; i < ids.length; i++) {
								var parts = ids[i].split('.');
								var deName;
								for (var j = 0; j < datas[0].length; j++) {
									if (parts[0] === datas[0][j].id) {
										deName = datas[0][j].name;
										j = datas[0].length
									}
								}
								var comboName;
								for (var j = 0; j < datas[1].length; j++) {
									if (parts[1] === datas[1][j].id) {
										comboName = datas[1][j].name;
										j = datas[1].length
									}
								}

								operands.push({
									id: ids[i],
									name: deName + ' ' + comboName
								});
							}

							deferred.resolve(operands);

						},
						function(errors) {
							console.log("d2meta error: dataElementOperandsFromIDs(ids)");
							console.log(errors);
						}
					);

					return deferred.promise;
				}



				function dataElementDatasets(ids) {
					var deferred = $q.defer();

					var requestURL = '/api/dataElements.json?';
					requestURL += 'fields=:name,id,dataSets[name,id,periodType,organisationUnits::size]';
					requestURL += '&filter=id:in:[' + ids.join(',') + ']';
					requestURL += '&paging=false';

					requestService.getSingleData(requestURL).then(
						function(data) {

							var datasets = [];
							var dataElements = data.dataElements;
							for (var i = 0; i < dataElements.length; i++) {
								var de = dataElements[i];
								for (var j = 0; j < de.dataSets.length; j++) {
									datasets.push(de.dataSets[j]);
								}
							}
							d2Utils.arraySortByProperty(datasets, 'name', false);
							deferred.resolve(datasets);
						},
						function(error){
							console.log("d2meta error: dataElementDatasets(ids)");
							console.log(error);
						}
					);

					return deferred.promise;
				}


				function dataElementGroups() {
					var deferred = $q.defer();

					var requestURL = '/api/dataElementGroups.json?fields=name,id';
					requestURL += '&paging=false';

					requestService.getSingleData(requestURL).then(
						function(data) {
							d2Utils.arraySortByProperty(data.dataElementGroups, 'name', false);
							deferred.resolve(data.dataElementGroups);
						},
						function(error){
							console.log("d2meta error: dataElementGroups()");
							console.log(error);
						}
					);

					return deferred.promise;
				}

				function dataElementGroupDataElements(id) {
					var deferred = $q.defer();

					var requestURL = '/api/dataElementGroups/' + id + '.json?';
					requestURL += 'fields=dataElements[name,id]';
					requestURL += '&paging=false';

					requestService.getSingleData(requestURL).then(
						function(data) {
							d2Utils.arraySortByProperty(data.dataElements, 'name', false);
							deferred.resolve(data.dataElements);
						},
						function(error){
							console.log("d2meta error: dataElementGroupDataElements()");
							console.log(error);
						}
					);

					return deferred.promise;
				}




				/** ===== INDICATORS ===== */
				function indicator(id, fieldString) {
					var deferred = $q.defer();

					var requestURL = '/api/indicators/' + id + '.json?';
					if (fieldString) requestURL += '&fields=' + fieldString;
					else requestURL += '&fields=name,id';

					requestService.getSingleData(requestURL).then(
						function(data) {
							deferred.resolve(data);
						},
						function(error){
							console.log("d2meta error: indicator(id, fieldString)");
							console.log(error);
						}
					);

					return deferred.promise;
				}



				function indicatorDataElements(id) {
					var deferred = $q.defer();

					var requestURL = '/api/indicators/' + id + '.json?';
					requestURL += '&fields=name,id,numerator,denominator';

					requestService.getSingleData(requestURL).then(
						function(data) {
							var indicator = data;
							var dataElementIDs = d2Utils.idsFromIndicatorFormula(indicator.numerator, indicator.denominator, true);

							dataElementsFromIDs(dataElementIDs).then(function (data) {

								deferred.resolve(data);

							});

						},
						function(error){
							console.log("d2meta error: indicatorDataElements(id)");
							console.log(error);
						}
					);

					return deferred.promise;
				}



				function indicatorDatasets(id) {
					var deferred = $q.defer();

					indicatorDataElements(id).then(
						function (data) {

							var ids = [];
							for (var i = 0; i < data.length; i++) {
								ids.push(data[i].id);
							}

							dataElementDatasets(ids).then(
								function(data) {
									deferred.resolve(data);
								},
								function(error) {
									console.log("d2meta error: indicatorDatasets(id)");
									console.log(error);
								}
							);

						},
						function (error) {
							console.log("d2meta error: indicatorDatasets(id)");
							console.log(error);
						}

					);

					return deferred.promise;
				}


				function indicatorFormulaText(formula) {
					var deferred = $q.defer();

					//GET DEFAULT
					defaultCategoryOptionCombo().then(
						function(data) {
							var df = data.id;

							var components = {};
							var dataElements = [];
							var dataElementOperands = [];
							var constants = [];

							//Data
							var matches = formula.match(/#{(.*?)}/g);
							for (var i = 0; matches && i < matches.length; i++) {
								var match = matches[i];
								var id = match.slice(2,-1);

								var type;
								if (id.length === 11) {
									type = 'total';
									dataElements.push(id.slice(0,11));
								}
								else if (id.indexOf(df) > 0) {
									type = 'default';
									dataElements.push(id.slice(0,11));
								}
								else {
									type = 'operand'
									dataElementOperands.push(id);
								}
								components[id] = type;
							}

							//Constants
							matches = formula.match(/C{(.*?)}/g);
							for (var i = 0; matches && i < matches.length; i++) {
								var match = matches[i];
								var id = match.slice(2,-1);

								components[id] = 'constant';
								constants.push(id);
							}


							//GET DATA
							var promises = [];
							promises.push(dataElementsFromIDs(dataElements));
							promises.push(dataElementOperandsFromIDs(dataElementOperands));
							promises.push(constantsFromIDs(constants));

							$q.all(promises).then(
								function(datas) {

									var displayDictionary = {};
									for (var i = 0; i < datas[0].length; i++) {
										displayDictionary[datas[0][i].id] = datas[0][i].name;
									}
									for (var i = 0; i < datas[1].length; i++) {
										displayDictionary[datas[1][i].id] = datas[1][i].name;
									}
									for (var i = 0; i < datas[2].length; i++) {
										displayDictionary[datas[2][i].id] = datas[2][i].value;
									}

									for (id in components) {
										var type = components[id];
										switch (components[id]) {
											case 'total':
												formula = formula.replace('#{' + id + '}', displayDictionary[id] + ' (total)');
												break;
											case 'default':
												formula = formula.replace('#{' + id + '}', displayDictionary[id.slice(0,11)] + ' (default)');
												break;
											case 'operand':
												formula = formula.replace('#{' + id + '}', displayDictionary[id]);
												break;
											case 'constant':
												formula = formula.replace('C{' + id + '}', displayDictionary[id]);
												break;
										}
									}

									console.log(formula);
									deferred.resolve(formula);
								}
							)





						}

					);

					return deferred.promise;
				}



				function indicatorGroups() {
					var deferred = $q.defer();

					var requestURL = '/api/indicatorGroups.json?fields=name,id';
					requestURL += '&paging=false';

					requestService.getSingleData(requestURL).then(
						function(data) {
							d2Utils.arraySortByProperty(data.indicatorGroups, 'name', false);
							deferred.resolve(data.indicatorGroups);
						},
						function(error){
							console.log("d2meta error: indicatorGroups()");
							console.log(error);
						}
					);

					return deferred.promise;

				}

				function indicatorGroupIndicators(id) {
					var deferred = $q.defer();

					var requestURL = '/api/indicatorGroups/' + id + '.json?';
					requestURL += 'fields=indicators[name,id]';
					requestURL += '&paging=false';

					requestService.getSingleData(requestURL).then(
						function(data) {
							d2Utils.arraySortByProperty(data.indicators, 'name', false);
							deferred.resolve(data.indicators);
						},
						function(error){
							console.log("d2meta error: indicatorGroupIndicators()");
							console.log(error);
						}
					);

					return deferred.promise;

				}


				/** ===== CATEGORIES ===== */

				function defaultCategoryOptionCombo() {
					var deferred = $q.defer();

					var requestURL = '/api/categoryOptionCombos.json?';
					requestURL += 'filter=name:eq:(default)';
					requestURL  += '&fields=name,id';
					requestURL  += '&paging=false';
					requestService.getSingleData(requestURL).then(
						function(data) {
							deferred.resolve(data.categoryOptionCombos[0]);
						},
						function(error){
							console.log("d2meta error: defaultCategoryOptionCombo()");
							console.log(error);
						}
					);

					return deferred.promise;
				}



				function categoryOptionCombosFromIDs(ids) {
					var deferred = $q.defer();

					var requestURL = '/api/categoryOptionCombos.json?';
					requestURL += 'fields=name,id';
					requestURL += '&filter=id:in:[' + ids.join(',') + ']';
					requestURL += '&paging=false';

					requestService.getSingleData(requestURL).then(
						function (data) {
							deferred.resolve(data.categoryOptionCombos);
						},
						function(error){
							console.log("d2meta error: categoryOptionCombos(ids)");
							console.log(error);
						});

					return deferred.promise;
				}


				/** ===== CONSTANTS ===== */
				function constantsFromIDs(ids) {
					var deferred = $q.defer();

					var requestURL = '/api/constants.json?';
					requestURL += 'fields=name,id,value';
					requestURL += '&filter=id:in:[' + ids.join(',') + ']';
					requestURL += '&paging=false';

					requestService.getSingleData(requestURL).then(
						function (data) {
							deferred.resolve(data.constants);
						},
						function(error){
							console.log("d2meta error: constantsFromIDs(ids)");
							console.log(error);
						});

					return deferred.promise;
				}

				return service;

			}]);

})();
