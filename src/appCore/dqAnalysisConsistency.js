(function(){
	'use strict';

	angular.module('dqAnalysis').factory('dqAnalysisConsistency',
		['d2Data', 'd2Meta', 'd2Utils', 'mathService', '$q',
			function (d2Data, d2Meta, d2Utils, mathService, $q) {

				var service = {
					analyse: analyse
				};

				var _dxA;
				var _dxB;
				var _pe;
				var _peRef;
				var _ouBoundary;
				var _ouLevel;
				var _ouGroup;
				var _consistencyType;
				var _analysisType;
				var _criteria;
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
				 * @param dxA				data a
				 * @param dxB				data b, null when consistencyType is 'time'
				 * @param pe				period
				 * @param peRef				reference periods, nulle when consistencyType is 'data'
				 * @param ouBoundary		boundary orgunit
				 * @param ouLevel			orgunit level
				 * @param ouGroup			orgunit group - level is used if both level and group is specified
				 * @param consistencyType	'time' or 'data' consistency
				 * @param analysisType		specific type of 'time' or 'data' consistency check, i.e. dropout rate
				 * @param criteria			criteria for when subnational units are counted as outlier
				 * @returns {*}
				 */
				function analyse(dxA, dxB, pe, peRef, ouBoundary, ouLevel, ouGroup, consistencyType, analysisType, criteria) {

					//Store a new request object and queue it
					var newRequest = {
						'dxA': dxA,
						'dxB': dxB,
						'pe': pe,
						'peRef': d2Utils.toArray(peRef),
						'ouBoundary': ouBoundary,
						'ouLevel': ouLevel,
						'ouGroup': ouGroup,
						'consistencyType': consistencyType,
						'analysisType': analysisType,
						'criteria': criteria,
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
					_dxA = request.dxA;
					_dxB = request.dxB;
					_pe = request.pe;
					_peRef = request.peRef;
					_ouBoundary = request.ouBoundary;
					_ouLevel = request.ouLevel;
					_ouGroup = request.ouGroup;
					_consistencyType = request.consistencyType;
					_analysisType = request.analysisType;
					_criteria = request.criteria;
					_deferred = request.deferred;

					//Make sure we include all periods in our request
					var pe = d2Utils.arrayMerge(_pe, _peRef);

					//Add request for boundary data
					d2Data.addRequest([_dxA, _dxB], pe, _ouBoundary, null, null);

					//Add request for subunit data
					d2Data.addRequest([_dxA, _dxB], pe, _ouBoundary, _ouLevel, _ouGroup);

					//Request data and orgunit data
					var promises = [];
					promises.push(d2Data.fetch());										//Request data
					promises.push(d2Meta.orgunitIDs(_ouBoundary, _ouLevel, _ouGroup));	//Request list of orgunits
					$q.all(promises).then(function(datas) {

						//Store subunits
						subunits = datas[1].subunits;

						if (_consistencyType === 'data') {
							dataConsistencyAnalysis();
						}
						else {
							timeConsistencyAnalysis();
						}
					});

				}


				/**
				 * Performs data consistency analysis based on the given analysis type and criteria.
				 */
				function dataConsistencyAnalysis() {

					//Data structure to store result of analysis
					var errors = [];					//Errors
					var result = {};					//The actual result

					//Get data for boundary orgunit
					var boundaryValueA = d2Data.value(_dxA, _pe, _ouBoundary, null);
					var boundaryValueB = d2Data.value(_dxB, _pe, _ouBoundary, null);
					var boundaryRatio = getRatioAndPercentage(boundaryValueA, boundaryValueB).ratio;
					var boundaryPercentage = getRatioAndPercentage(boundaryValueA, boundaryValueB).percent;

					//Check if we have data for boundary orgunit for indicator A
					if (!d2Utils.isNumber(boundaryValueA)) {
						errors.push(makeError(_dxA, _pe, _ouBoundary));
					}
					//Check if we have data for boundary orgunit for indicator B
					else if (!d2Utils.isNumber(boundaryValueB)) {
						errors.push(makeError(_dxB, _pe, _ouBoundary));
					}
					//If we have data for both, store the raw data, ratio and percentage
					else {
						result.boundaryValue = boundaryValueA;
						result.boundaryRefValue = boundaryValueB;
						result.boundaryRatio = boundaryRatio;
						result.boundaryPercentage = boundaryPercentage;
					}


					//Get the subunit data and store it
					var subunitData = dataConsistencyAnalysisSubunits(boundaryRatio);
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
					result.dxIDa = _dxA;
					result.dxIDb = _dxB;
					result.dxNameA = d2Data.name(_dxA);
					result.dxNameB = d2Data.name(_dxB);
					result.pe = _pe;
					result.type = _analysisType;
					result.criteria = _criteria;
					//result.relationCode = relationCode;


					//Resolve current promise
					_deferred.resolve({'result': result, 'errors': errors});


					//Get next request
					_pendingRequest = false;
					requestData();
				}


				/**
				 * Performs data consistency analysis on the subunits
				 *
				 * @param boundaryRatio
				 * @returns {{ignored: Array, nonOutlierCount: number, outlierCount: number, outlierNames: Array, datapoints: Array}}
				 */
				function dataConsistencyAnalysisSubunits(boundaryRatio) {

					var subunitData = {
						ignored: [],
						nonOutlierCount: 0,
						outlierCount: 0,
						outlierNames: [],
						datapoints: []
					}

					for (var j = 0; j < subunits.length; j++) {
						var subunit = subunits[j];

						var valueA = d2Data.value(_dxA, _pe, subunit, null);
						var valueB = d2Data.value(_dxB, _pe, subunit, null);

						//If we miss data for one of the two indicators, ignore the orgunit
						if (!d2Utils.isNumber(valueA) || !d2Utils.isNumber(valueB)) {
							subunitData.ignored.push(d2Data.name(subunit));
							continue;
						}


						var data = getRatioAndPercentage(valueA, valueB);
						var outlier = isOutlier(boundaryRatio, data.ratio);
						var weight = 0;

						if (outlier) {
							subunitData.outlierCount++;
							subunitData.outlierNames.push(d2Data.name(subunit));
							weight = outlierWeight(valueA, valueB, boundaryRatio);
						}
						else {
							subunitData.nonOutlierCount++;
						}

						subunitData.datapoints.push({
							'value': valueA,
							'refValue': valueB,
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


				

				/**
				 * Calculates the ratio and percentage based on the given analysis type and criteria
				 * @param valueA
				 * @param valueB
				 * @returns {{percent: (number|*), ratio: (number|*)}}
				 */
				function getRatioAndPercentage(valueA, valueB) {

					var ratio, percentage;
					if (_analysisType === 'do') {
						ratio = mathService.dropOutRate(valueA, valueB);
					}
					else {
						ratio = valueA/valueB;
					}

					return {
						percent: mathService.round(100*ratio, 1),
						ratio: mathService.round(ratio, 3)
					};
				}


				/**
				 * Checks if the ratio for a subunit is and "outlier" based on the given analysis type and criteria
				 * @param boundaryRatio
				 * @param subunitRatio
				 * @returns {boolean}
				 */
				function isOutlier(boundaryRatio, subunitRatio) {

					switch (_analysisType) {
						case 'do':
							return subunitRatio < 0 ? true : false;
						case 'aGTb':
							return subunitRatio < (1.0 - _criteria * 0.01) ? true : false;
						case 'eq':
							return subunitRatio > (1.0 + _criteria * 0.01) || subunitRatio < (1.0 - _criteria * 0.01) ? true : false;
						case 'level':
							var ratioOfRatios = subunitRatio/boundaryRatio;
							return ratioOfRatios > (1.0 + _criteria * 0.01) || ratioOfRatios < (1.0 - _criteria * 0.01) ? true : false;
					}
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
					if (_analysisType === 'level') {
						mathService.round(Math.abs(valueB*boundaryRatio - valueA), 0);
					}
					else {
						weight = Math.abs(valueA - valueB);
					}

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

					if (_consistencyType === 'data') {
						error.type = "Consistency betweeen indicators";
						error.msg = "Missing data: consistency analysis " + d2Data.name(_dxA) + "/" + d2Data.name(_dxB) +
							" in " + pe + " skipped for " + d2Data.name(_ouBoundary) + " due to missing data.";
					}
					else {
						error.type = "Consistency over time";
						error.msg = "to-do";
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
							'type': "Consistency betweeen indicators",
							'item': d2Data.name(_dxA) + " - " + d2Data.name(_dxB),
							'msg': "Skipped for the following units due to missing data: " + orunits.join(', ')
						};
					}

					return error;
				}


				return service;

			}]);

})();