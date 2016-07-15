(function(){
	'use strict';

	angular.module('dqAnalysis').factory('dqAnalysisExternal',
		['d2Data', 'd2Meta', 'd2Utils', 'mathService', '$q',
			function (d2Data, d2Meta, d2Utils, mathService, $q) {

				var service = {
					analyse: analyse
				};

				var _dataIdExternal;
				var _dataIdNumerator;
				var _dataIdDenominator;
				var _pe;
				var _ouBoundary;
				var _ouLimit;
				var _criteria;
				var _meta;
				var _deferred;

				var requests = [];
				var request = null;
				var _pendingRequest = false;
				var subunits;


				/**
				 * === === === === === ===
				 * PUBLIC FUNCTIONS
				 * === === === === === ===
				 */


				/**
				 * Start analysis according to passed parameters
				 *
				 * @param dataIdExternal		survey/external indicator
				 * @param dataIdNumerator		routine data numerator
				 * @param dataIdDenominator		routine data denominator
				 * @param pe					period for analysis
				 * @param ouBoundary			boundary orgunit
				 * @param ouLimit				level external/survey data is available for
				 * @param criteria				criteria for when subnational units are counted as outlier
				 * @param meta					object that is simply passed on in the result, for various metadata
				 * @returns {*}
				 */
				function analyse(dataIdExternal, dataIdNumerator, dataIdDenominator, pe, ouBoundary, ouLimit, criteria, meta) {

					//Store a new request object and queue it
					var newRequest = {
						'dataIdExternal': dataIdExternal,
						'dataIdNumerator': dataIdNumerator,
						'dataIdDenominator': dataIdDenominator,
						'pe': pe,
						'ouBoundary': ouBoundary,
						'ouLimit': ouLimit,
						'criteria': criteria,
						'meta': meta,
						'deferred': $q.defer()
					};
					requests.push(newRequest);

					//Request data needed for the analysis
					requestData();

					//Return promise of data
					return newRequest.deferred.promise;
				};



				/**
				 * === === === === === ===
				 * PRIVATE FUNCTIONS
				 * === === === === === ===
				 */


				/**
				 * Gets the next request from the queue of requests, and requests if from the d2Data factory
				 */
				function requestData() {

					//Check if we already have pending data, in which case we wait
					if (_pendingRequest) return;

					//Load next request from queue
					var request = requests.pop();
					if (!request) return;

					//We are now busy
					_pendingRequest = true;

					//Read parameters for the next request
					_dataIdExternal = request.dataIdExternal;
					_dataIdNumerator = request.dataIdNumerator;
					_dataIdDenominator = request.dataIdDenominator;
					_pe = request.pe;
					_ouBoundary = request.ouBoundary;
					_ouLimit = request.ouLimit;
					_criteria = request.criteria;
					_meta = request.meta;
					_deferred = request.deferred;

					d2Meta.object('organisationUnits', _ouBoundary, 'level,displayName').then(function(data) {

						if (data.level > _ouLimit) {
							var result = {
								"failed": true,
								"pe": _pe,
								"ouLimit": _ouLimit,
								"criteria": _criteria,
								"meta": _meta
							};

							var error = {
								'severity': "error",
								'type': "External consistency",
								'item': _meta.name,
								'msg': "Not available for " + data.displayName
							};

							_deferred.resolve({'result': result, 'errors': [error]});


							//Get next request
							_pendingRequest = false;
							requestData();
						}
						else {
							//Add request for boundary data
							d2Data.addRequest([_dataIdExternal, _dataIdNumerator, _dataIdDenominator], [_pe], _ouBoundary, null, null);
							d2Data.addRequest([_dataIdExternal, _dataIdNumerator, _dataIdDenominator], [_pe], _ouBoundary, _ouLimit, null);

							var promises = [];
							promises.push(d2Data.fetch());									//Request data
							promises.push(d2Meta.orgunitIDs(_ouBoundary, _ouLimit, null));	//Request list of orgunits
							promises.push(d2Meta.objects('organisationUnitLevels', null, 'displayName,id,level', 'level:eq:' + _ouLimit, false));
							$q.all(promises).then(function(datas) {
								subunits = datas[1].subunits;
								_meta.ouLimitName = datas[2][0].displayName;
								externalConsistencyAnalysis();
							});
						}
					});
				}
				


				/**
				 * Performs external data consistency analysis based on the given criteria.
				 */
				function externalConsistencyAnalysis() {

					//Data structure to store result of analysis
					var errors = [];					//Errors
					var result = {};					//The actual result


					//Get data for boundary orgunit - external
					var boundaryExternal = d2Data.value(_dataIdExternal, _pe, _ouBoundary, null);


					//Get data for boundary orgunit - routine
					var boundaryNumerator = d2Data.value(_dataIdNumerator, _pe, _ouBoundary, null);
					var boundaryDenominator = d2Data.value(_dataIdDenominator, _pe, _ouBoundary, null);
					var boundaryRoutine;
					if (d2Utils.isNumber(boundaryDenominator)) {
						boundaryRoutine = 100*boundaryNumerator/boundaryDenominator;
					}
					else {
						boundaryRoutine = null;
						errors.push(makeError(_dataIdDenominator, [_pe], _ouBoundary));
					}


					//Calculate ratio and percentage
					var boundaryRatio = getRatioAndPercentage(boundaryRoutine, boundaryExternal).ratio;
					var boundaryPercentage = getRatioAndPercentage(boundaryRoutine, boundaryExternal).percent;


					//Check if we have data for boundary orgunit for external
					if (!d2Utils.isNumber(boundaryExternal)) {
						errors.push(makeError(_dataIdExternal, [_pe], _ouBoundary));
					}
					//Check if we have data for boundary orgunit for routine
					else if (!d2Utils.isNumber(boundaryRoutine)) {

						//We already checked the denominator, so here we assume numerator is missing if there is a problem
						errors.push(makeError(_dataIdNumerator, [_pe], _ouBoundary));
					}
					//If we have data for both, store the raw data, ratio and percentage
					else {
						result.boundaryValue = boundaryExternal;
						result.boundaryRefValue = mathService.round(boundaryRoutine, 1);
						result.boundaryRatio = mathService.round(boundaryRatio, 3);
						result.boundaryPercentage = mathService.round(boundaryPercentage, 1);
					}



					//Get the subunit data and store it
					var subunitData = externalConsistencyAnalysisSubunits();
					if (subunitData.error) errors.push(subunitData.error);

					result.subunitsWithinThreshold = subunitData.nonOutlierCount;
					result.subunitsOutsideThreshold = subunitData.outlierCount;
					var percent = 100 * subunitData.outlierCount / (subunitData.outlierCount + subunitData.nonOutlierCount);
					result.subunitViolationPercentage = mathService.round(percent, 1);
					result.subunitViolationNames = subunitData.outlierNames.sort();
					result.subunitDatapoints = subunitData.datapoints;


					//Add key metadata to result
					result.boundaryID = _ouBoundary;
					result.boundaryName = d2Data.name(_ouBoundary);

					result.dataIdExternal = _dataIdExternal;
					result.dataIdNumerator = _dataIdNumerator;
					result.dataIdDenominator = _dataIdDenominator;
					result.dataNameExternal = d2Data.name(_dataIdExternal);
					result.dataNameNumerator = d2Data.name(_dataIdNumerator);
					result.dataNameDenominator = d2Data.name(_dataIdDenominator);

					result.pe = _pe;
					result.ouLimit = _ouLimit;
					result.criteria = _criteria;
					result.meta = _meta;

					//Resolve current promise
					_deferred.resolve({'result': result, 'errors': errors});

					//Get next request
					_pendingRequest = false;
					requestData();
				}


				/**
				 * Performs data consistency analysis on the subunits
				 *
				 * @returns {{ignored: Array, nonOutlierCount: number, outlierCount: number, outlierNames: Array, datapoints: Array}}
				 */
				function externalConsistencyAnalysisSubunits() {

					var subunitData = {
						ignored: [],
						nonOutlierCount: 0,
						outlierCount: 0,
						outlierNames: [],
						datapoints: []
					}

					for (var j = 0; j < subunits.length; j++) {
						var subunit = subunits[j];

						var valueA = d2Data.value(_dataIdExternal, _pe, subunit, null);
						var valueB = 100*d2Data.value(_dataIdNumerator, _pe, subunit, null)/d2Data.value(_dataIdDenominator, _pe, subunit, null);

						//If we miss data for one of the two indicators, ignore the orgunit
						if (!d2Utils.isNumber(valueA) || !d2Utils.isNumber(valueB)) {
							subunitData.ignored.push(d2Data.name(subunit));
							continue;
						}

						var data = getRatioAndPercentage(valueB, valueA);
						var outlier = isOutlier(data.ratio);
						var weight = 0;

						if (outlier) {
							subunitData.outlierCount++;
							subunitData.outlierNames.push(d2Data.name(subunit));

							//TODO: Any use for weight here
							//weight = outlierWeight(valueA, valueB, boundaryRatio);
						}
						else {
							subunitData.nonOutlierCount++;
						}

						subunitData.datapoints.push({
							'value': valueA,
							'refValue': mathService.round(valueB, 1),
							'ratio': data.ratio,
							'id': subunit,
							'name': d2Data.name(subunit),
							'violation': outlier,
							'weight': weight
						});

					}
					subunitData.error = makeSubunitError(subunitData.ignored);
					return subunitData;
				}





				/** ===== UTILITIES ===== **/

				/**
				 * Calculates the ratio and percentage based on the given analysis type and criteria
				 * @param valueA
				 * @param valueB
				 * @returns {{percent: (number|*), ratio: (number|*)}}
				 */
				function getRatioAndPercentage(valueA, valueB) {

					var ratio, percentage;
					ratio = valueA/valueB;

					return {
						percent: mathService.round(100*ratio, 1),
						ratio: mathService.round(ratio, 3)
					};
				}



				/**
				 * Checks if the ratio for a subunit is an "outlier" based on the given analysis type and criteria
				 * @param subunitRatio
				 * @returns {boolean}
				 */
				function isOutlier(subunitRatio) {

					return subunitRatio > (1.0 + _criteria * 0.01) || subunitRatio < (1.0 - _criteria * 0.01) ? true : false;

				}


				/**
				 * Calculates the weight of an outlier
				 *
				 * @param valueA
				 * @param valueB
				 * @param boundaryRatio
				 * @returns {number}
				 */
				function outlierWeight(valueA, valueB, boundaryRatio) {

					var weight = 0;

					/*if (_subType === 'level') {

						if (valueA/valueB > boundaryRatio) {
							weight = valueB*boundaryRatio - valueA;
						}
						else {
							weight = valueA*boundaryRatio - valueB;
						}
					}
					else {
						weight = Math.abs(valueA - valueB);
					}
					weight = Math.abs(weight);
					weight = mathService.round(weight, 0);*/

					return weight;
				}


				/**
				 * Makes an "error object" that is returned with the result, highlighting areas with missing data etc
				 * @param dx
				 * @param pe
				 * @param ou
				 * @returns {{}}
				 */
				function makeError(dx, pe, ou) {

					var error = {};

					error.severity = "warning";
					error.item = d2Data.name[dx];

					if (_ouLimit === 'data') {
						error.type = "Consistency betweeen indicators";
						error.msg = "Missing data: consistency analysis " + d2Data.name(_dataIdExternal) + "/" + d2Data.name(_dataIdNumerator) +
							" in " + pe + " skipped for " + d2Data.name(ou) + " due to missing data for " + d2Data.name(dx) + ".";
					}
					else {
						error.type = "Consistency over time";
						error.msg = "Missing data: consistency analysis " + d2Data.name(_dataIdExternal) + " for " + _dataIdDenominator + " vs " +
							pe.join(', ') + " skipped for " + d2Data.name(ou) + " due to missing data.";
					}

					return error;
				}

				/**
				 * Makes an "error object" that is returned with the result, highlighting subunit with missing data
				 * (that are therefore ignored from the analysis)
				 *
				 * @param orunits
				 * @returns {*}
				 */
				function makeSubunitError(orunits) {

					var error;
					if (orunits.length > 0) {

						error = {
							'severity': "warning",
							'type': "External consistency",
							'item': d2Data.name(_dataIdExternal),
							'msg': "Skipped for the following units due to missing data: " + orunits.join(', ')
						};


					}

					return error;
				}


				return service;

			}]);

})();