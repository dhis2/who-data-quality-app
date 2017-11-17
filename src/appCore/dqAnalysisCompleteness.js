/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */
 
export default function (d2Data, d2Meta, d2Utils, mathService, requestService, $q) {

	var service = {
		analyse: analyse
	};

	var _dataID;
	var _dataSetID;
	var _pe;
	var _peRef;
	var _ouBoundary;
	var _ouLevel;
	var _ouGroup;
	var _criteria;
	var _type;
	var _deferred;

	var requests = [];
	var request = null;
	var _pendingRequest = false;
	var subunits;


	//Variables for getting facility-level data completeness
	var current;
	var components = 0;
	var completenessIDs;
	var subunitQueue;
	var facilitiesReporting = {};


	/**
				 * === === === === === ===
				 * PUBLIC FUNCTIONS
				 * === === === === === ===
				 */


	/**
				 *
				 */
	function analyse(dataID, dataSetID, pe, peRef, ouBoundary, ouLevel, ouGroup, criteria, type, meta) {

		//Store a new request object and queue it
		var newRequest = {
			"dataID": dataID,
			"dataSetID": dataSetID,
			"pe": pe,
			"peRef": peRef,
			"ouBoundary": ouBoundary,
			"ouLevel": ouLevel,
			"ouGroup": ouGroup,
			"criteria": criteria,
			"type": type,
			"meta": meta,
			"deferred": $q.defer()
		};
		requests.push(newRequest);

		//Request data needed for the analysis
		requestData();

		//Return promise of data
		return newRequest.deferred.promise;
	}



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
		_deferred = request.deferred;
		_type = request.type;


		if (_type === "dataCompleteness") {
			_dataID = request.dataID;
			_dataSetID = request.dataSetID;
			_pe = request.pe;
			_peRef = request.peRef;
			_ouBoundary = request.ouBoundary;
			_ouLevel = request.ouLevel;
			_ouGroup = request.ouGroup;
			_criteria = request.criteria;


			var dxIDs = [_dataSetID + ".EXPECTED_REPORTS"];
			d2Data.addRequest(dxIDs, _pe, _ouBoundary, _ouLevel, _ouGroup);
			d2Data.addRequest(dxIDs, _pe, _ouBoundary, null, null);
			d2Data.addRequest([_dataID], _pe, _ouBoundary, _ouLevel, _ouGroup, "COUNT");
			d2Data.addRequest([_dataID], _pe, _ouBoundary, null, null, "COUNT");

			var promises = [];
			promises.push(d2Data.fetch());										//Request data
			promises.push(d2Meta.orgunitIDs(_ouBoundary, _ouLevel, _ouGroup));	//Request list of orgunits
			promises.push(d2Meta.object("dataElements", _dataID, "displayName,id,categoryCombo[categories[items::size]]"));
			promises.push(d2Meta.object("indicators", _dataID, "displayName,id,numerator"));
			$q.all(promises).then(function(datas) {

				//Store subunits
				subunits = datas[1].subunits;
				subunitQueue = angular.copy(subunits);
				completenessIDs = [_dataID];

				//TODO: move this to d2Meta
				if (datas[2] && datas[2].categoryCombo) {
					for (var i = 0; i < datas[2].categoryCombo.categories.length; i++) {
						components += datas[2].categoryCombo.categories[i].items;
					}

					//Process data
					dataCompletenessAnalysis();
				}
				else if (datas[3] && datas[3].numerator) {

					var parts = d2Utils.idsFromIndicatorFormula(datas[3].numerator, "", false);
					var toCheck = [];
					components = 0;
					for (var i = 0; i < parts.length; i++) {
						if (parts[i].length > 11) {
							components++;
						}
						else {
							toCheck.push(parts[i]);
						}
					}

					if (toCheck.length > 1) {
						d2Meta.objects("dataElements", toCheck, "displayName,id,categoryCombo[categories[items::size]]", null, false).then(
							function(dataElements) {
								for (var i = 0; i < dataElements.length; i++) {
									for (var j = 0; j < dataElements[i].categoryCombo.categories.length; j++) {
										components += dataElements[i].categoryCombo.categories[j].items;
									}

								}

								//Process data
								dataCompletenessAnalysis();
							}
						);
					}
					else {
						//Process data
						dataCompletenessAnalysis();
					}
				}
				else {
					components = 1;

					//Process data
					dataCompletenessAnalysis();
				}






			});

		}
	}


	function dataCompletenessAnalysis() {
		var errors = [];
		var result = {};

		var boundaryValues = d2Data.value(_dataID, _pe, _ouBoundary, null, "COUNT");
		var boundaryExpected = d2Data.value(_dataSetID + ".EXPECTED_REPORTS", _pe, _ouBoundary, null, null)*components;

		var boundaryCompletenessRatio, boundaryCompletenessPercentage;
		if (!d2Utils.isNumber(boundaryExpected) || !d2Utils.isNumber(boundaryValues)) {
			boundaryCompletenessRatio = null;
			boundaryCompletenessPercentage = null;
		}
		else {
			boundaryCompletenessRatio = boundaryValues/boundaryExpected;
			boundaryCompletenessPercentage = 100*boundaryCompletenessRatio;
		}
		result.boundaryValues = boundaryValues;
		result.boundaryValuesExpected = boundaryExpected;
		result.boundaryPercentage = mathService.round(boundaryCompletenessPercentage, 1);


		//Make subunit analysis
		var subunitData = dataCompletenessAnalysisSubunits();
		if (subunitData.error) errors.push(subunitData.error);

		//Store subunit results
		result.subunitsWithinThreshold = subunitData.nonOutlierCount;
		result.subunitsOutsideThreshold = subunitData.outlierCount;
		var percent = 100 * subunitData.outlierCount / (subunitData.outlierCount + subunitData.nonOutlierCount);
		result.subunitViolationPercentage = mathService.round(percent, 1);
		result.subunitViolationNames = subunitData.outlierNames.sort();


		//Include some metadata
		result.dataID = _dataID;
		result.dataName= d2Data.name(_dataID);
		result.dataSetID = _dataSetID;
		result.dataSetName= d2Data.name(_dataSetID  + ".EXPECTED_REPORTS");
		result.pe = _pe;
		result.ouBoundary = _ouBoundary;
		result.ouBoundaryName = d2Data.name(_ouBoundary);
		result.criteria = _criteria;

		//Resolve current promise
		_deferred.resolve({"result": result, "errors": errors});

		//Get next request
		_pendingRequest = false;
		components = 0;
		requestData();
	}


	/**
				 * Performs data consistency analysis on the subunits
				 *
				 * @param boundaryRatio
				 * @returns {{ignored: Array, nonOutlierCount: number, outlierCount: number, outlierNames: Array, datapoints: Array}}
				 */
	function dataCompletenessAnalysisSubunits() {

		var subunitData = {
			ignored: [],
			nonOutlierCount: 0,
			outlierCount: 0,
			outlierNames: [],
			datapoints: [],
			error: []
		};

		for (var j = 0; j < subunits.length; j++) {
			var subunit = subunits[j];

			var values = d2Data.value(_dataID, _pe, subunit, null, "COUNT");
			var expected = d2Data.value(_dataSetID + ".EXPECTED_REPORTS", _pe, subunit, null);

			//If we miss data for one of the two indicators, ignore the orgunit
			if (!d2Utils.isNumber(values) || !d2Utils.isNumber(expected)) {
				subunitData.ignored.push(d2Data.name(subunit));
				continue;
			}


			var completeness = 100*values/expected;
			var outlier = completeness > _criteria ? false : true;

			if (outlier) {
				subunitData.outlierCount++;
				subunitData.outlierNames.push(d2Data.name(subunit));
			}
			else {
				subunitData.nonOutlierCount++;
			}

			subunitData.datapoints.push({
				"values": values,
				"expected": expected,
				"completeness": completeness,
				"id": subunit,
				"name": d2Data.name(subunit),
				"violation": outlier
			});

		}
		//subunitData.error = makeSubunitError(subunitData.ignored);
		return subunitData;
	}


	return service;

}
