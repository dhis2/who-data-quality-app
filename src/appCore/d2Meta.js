(function(){

	angular.module('d2').factory('d2Meta',
		['requestService', 'periodService', 'd2Utils', '$q',
			function (requestService, periodService, d2Utils, $q) {

				//Define factory API
				var service = {
					object: object,
					objects: objects,
					orgunitIDs: orgunitIDs,
					orgunitCountEstimate: orgunitCountEstimate,
					userOrgunit: userOrgunit,
					userOrgunits: userOrgunits,
					userOrgunitsHierarchy: userOrgunitsHierarchy,
					userAnalysisOrgunits: userAnalysisOrgunits,
					indicatorDataElements: indicatorDataElements,
					indicatorDataElementIDsNumerator: indicatorDataElementIDsNumerator,
					indicatorDataSets: indicatorDataSets,
					indicatorPeriodType: indicatorPeriodType,
					indicatorFormulaText: indicatorFormulaText,
					dataElementOperands: dataElementOperandsFromIDs,
					dataElementOrIndicator: dataElementOrIndicator,
					version: version
				};


				/** ===== GENERAL - ANY OBJECT ===== */
				function object(object, id, fieldString) {
					var deferred = $q.defer();

					var requestURL = '/api/' + object + '/' + id + '.json?';
					if (fieldString) requestURL += 'fields=' + fieldString;

					if (fieldString && fieldString.indexOf("name") > -1) console.log("Used name");

					requestService.getSingleData(requestURL).then(
						function(data) {
							deferred.resolve(data);
						},
						function(error){
							console.log("d2meta error: object(), type:" + object);
							console.log(error);
							deferred.resolve(null);

						}
					);

					return deferred.promise;
				}


				function objects(object, ids, fieldString, filterString, paging) {
					paging = paging === null || paging === undefined ? paging = false : paging;

					var deferred = $q.defer();

					if (fieldString && fieldString.indexOf("name") > -1) {
						console.log("Warning: Used name property");
						fieldString += ';displayName';
					}
					

					var requestURL;
					if (ids) {
						requestURL = '/api/' + object + '.json?';
						requestURL += 'filter=id:in:[' + ids.join(',') + ']&';
					}
					else {
						requestURL = '/api/' + object + '.json?';
					}

					if (fieldString) requestURL += 'fields=' + fieldString;
					if (filterString) requestURL += '&filter=' + filterString;
					requestURL += '&paging=' + paging;

					requestService.getSingleData(requestURL).then(
						function(data) {
							if (paging) deferred.resolve(data);
							else deferred.resolve(data[object]);

						},
						function(error){
							console.log("d2meta error: objects(), type:" + object);
							console.log(error);
						}
					);

					return deferred.promise;
				}



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

					ouBoundary = d2Utils.toArray(ouBoundary);

					//TODO: split if estimate is > ???

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
							isBoundary = false;
							for (var j = 0; !isBoundary && j < ouBoundary.length; j++) {

								if (ou == ouBoundary[j]) isBoundary = true;

							}

							isBoundary ? boundary.push(ou) : subunits.push(ou);
						}

						deferred.resolve({
							'orgunits': orgunits,
							'boundary': boundary,
							'subunits': subunits
						});
					});

					return deferred.promise;
				}



				function orgunitCountEstimate(ouBoundary, ouLevel, ouGroup) {
					var deferred = $q.defer();
					ouBoundary = d2Utils.toArray(ouBoundary);

					if (!ouLevel && !ouGroup) deferred.resolve(ouBoundary.length);
					else {

						//TODO: multiple boundary orgunits = check all? Although this is perhaps enough for an estimate
						var filterString = 'filter=path:like:' + ouBoundary[0];
						if (ouLevel) filterString += '&filter=level:eq:' + ouLevel;
						if (ouGroup) filterString += '&filter=organisationUnitGroups.id:eq:' + ouGroup;

						var requestURL = '/api/organisationUnits.json?';
						requestURL += filterString;

						requestService.getSingleData(requestURL).then(
							function(data) { //success
								var orgunitCount = data.pager.total;
								deferred.resolve(orgunitCount*ouBoundary.length);
							},
							function(response) { //error
								deferred.reject("Error in userOrgunit()");
								console.log(response);
							}
						);
					}

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
					requestURL += 'userOnly=true&fields=id,displayName,level&paging=false';

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
					requestURL += 'userOnly=true&fields=id,displayName,level&paging=false';

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
					requestURL += 'userOnly=true&fields=id,displayName,level,children[displayName,level,id,children[displayName,level,id]]&paging=false';

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
					requestURL += 'userDataViewFallback=true&fields=id,displayName,level,children[displayName,level,id,children::isNotEmpty]&paging=false';

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



				/** ===== DATA ELEMENT OPERANDS ===== */
				function dataElementOperandsFromIDs(ids) {
					var deferred = $q.defer();

					console.log("Use d2Meta.objects instead for 2.22 and newer");

					var operandDictionary = {};
					var categoryOptionCombos = [];
					var dataElements = [];
					for (var i = 0; i < ids.length; i++) {
						operandDictionary[ids[i]] = true;
						var parts = ids[i].split('.');
						dataElements.push(parts[0]);
						if (parts.length > 1) categoryOptionCombos.push(parts[1]);
					}

					var requestURL = '/api/dataElementOperands.json?';
					requestURL += 'filter=dataElementId:in:[' + dataElements.join(',') + ']';
					if (categoryOptionCombos.length > 0) requestURL += '&filter=optionComboId:in:[' + categoryOptionCombos.join(',') + ']';
					requestURL += '&paging=false';
					requestService.getSingleData(requestURL).then(
						function(data) {
							var allOperands = data.dataElementOperands;
							var operands = [];
							for (var i = 0; i < allOperands.length; i++) {
								if (operandDictionary[allOperands[i].id]) operands.push(allOperands[i]);
							}
							deferred.resolve(operands);
						},
						function(error){
							console.log("d2meta error: dataElementOperandsFromIDs()");
							console.log(error);
						}
					);

					return deferred.promise;
				}


				function dataElementDataSets(ids) {
					var deferred = $q.defer();

					var requestURL = '/api/dataElements.json?';
					requestURL += 'fields=displayName,id,dataSets[displayName,id,periodType,organisationUnits::size]';
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
							datasets = d2Utils.arrayRemoveDuplicates(datasets, 'id');
							deferred.resolve(datasets);
						},
						function(error){
							console.log("d2meta error: dataElementDataSets(ids)");
							console.log(error);
						}
					);

					return deferred.promise;
				}


				function dataElementOrIndicator(id) {
					var deferred = $q.defer();

					requestService.getSingleData('/api/dataElements.json?fields=displayName,id&filter=id:eq:' + id).then(
						function(data) { //success
							data = data.dataElements;
							if (data && data.length === 1) {
								deferred.resolve(data[0]);
							}
							else {

								requestService.getSingleData('/api/indicators.json?fields=displayName,id&filter=id:eq:' + id)
									.then(function(data) {
										data = data.indicators;
										if (data && data.length === 1) {
											deferred.resolve(data[0]);
										}
										else {
											return null;
										}
									});

							}
						}
					);

					return deferred.promise;
				}



				/** ===== INDICATORS ===== */
				function indicatorDataElements(id) {
					var deferred = $q.defer();

					var requestURL = '/api/indicators/' + id + '.json?';
					requestURL += 'fields=displayName,id,numerator,denominator';

					requestService.getSingleData(requestURL).then(
						function(data) {
							var indicator = data;
							var dataElementIDs = d2Utils.idsFromIndicatorFormula(indicator.numerator, indicator.denominator, true);

							objects('dataElements', dataElementIDs).then(function (data) {

								deferred.resolve(data);

							});

						},
						function(error){
							console.log("d2meta error: indicatorDataElements(id)");
							console.log(error);
							deferred.resolve([]);
						}
					);

					return deferred.promise;
				}

				function indicatorDataElementIDsNumerator(id) {
					var deferred = $q.defer();

					var requestURL = '/api/indicators/' + id + '.json?';
					requestURL += 'fields=displayName,id,numerator,denominator';

					requestService.getSingleData(requestURL).then(
						function(data) {
							var indicator = data;
							var dataElementIDs = d2Utils.idsFromIndicatorFormula(indicator.numerator, '', true);

							deferred.resolve(dataElementIDs);

						},
						function(error){
							console.log("d2meta error: indicatorDataElements(id)");
							console.log(error);
							deferred.resolve([]);
						}
					);

					return deferred.promise;
				}


				function indicatorDataSets(id) {
					var deferred = $q.defer();

					indicatorDataElements(id).then(
						function (data) {

							var ids = [];
							for (var i = 0; i < data.length; i++) {
								ids.push(data[i].id);
							}

							dataElementDataSets(ids).then(
								function(data) {
									deferred.resolve(data);
								},
								function(error) {
									console.log("d2meta error: indicatorDataSets(id)");
									console.log(error);
								}
							);

						},
						function (error) {
							console.log("d2meta error: indicatorDataSets(id)");
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
							promises.push(objects('dataElements', dataElements));
							promises.push(objects('dataElementOperands', dataElementOperands));
							promises.push(objects('constants', constants, 'displayName,id,value'));

							$q.all(promises).then(
								function(datas) {

									var displayDictionary = {};
									for (var i = 0; i < datas[0].length; i++) {
										displayDictionary[datas[0][i].id] = datas[0][i].displayName;
									}
									for (var i = 0; i < datas[1].length; i++) {
										displayDictionary[datas[1][i].id] = datas[1][i].displayName;
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


				function indicatorPeriodType(id) {
					var deferred = $q.defer();

					indicatorDataSets(id).then(
						function(dataSets) {
							var periodTypes = {};
							for (var i = 0; i < dataSets.length; i++) {
								periodTypes[dataSets[i].periodType] = true;
							}
							periodTypes = d2Utils.arrayFromKeys(periodTypes);

							deferred.resolve(periodService.shortestPeriod(periodTypes));
						}
					)


					return deferred.promise;
				}


				/** ===== CATEGORIES ===== */

				function defaultCategoryOptionCombo() {
					var deferred = $q.defer();

					var requestURL = '/api/categoryOptionCombos.json?';
					requestURL += 'filter=name:in:[default,(default)]';
					requestURL  += '&fields=displayName,id';
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


				/** ===== SYSTEM ===== */
				function version() {
					var deferred = $q.defer();

					var requestURL = '/api/system/info.json';
					requestService.getSingleData(requestURL).then(
						function(data) {
							deferred.resolve(parseInt(data.version.split('.')[1]));
						},
						function(error){
							console.log("d2meta error: version()");
							console.log(error);
						}
					);

					return deferred.promise;
				}




				return service;

			}]);

})();
