/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

export default function (d2Data, d2Meta, d2Utils, mathService, $q) {

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
	var _type;
	var _subType;
	var _comparison;
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
				 * @param dxA				data a
				 * @param dxB				data b, null when consistencyType is 'time'
				 * @param pe				period
				 * @param peRef				reference periods, null when consistencyType is 'data'
				 * @param ouBoundary		boundary orgunit
				 * @param ouLevel			orgunit level
				 * @param ouGroup			orgunit group - level is used if both level and group is specified
				 * @param type				'time' or 'data' consistency
				 * @param subType			specific type of 'time' or 'data' consistency check, i.e. dropout rate
				 * @param comparison		for 'time' analysis, whether to compare with expected ratio or national/boundary ratio
				 * @param criteria			criteria for when subnational units are counted as outlier
				 * @param meta				object that is simply passed on in the result, for various metadata
				 * @returns {*}
				 */
	function analyse(dxA, dxB, pe, peRef, ouBoundary, ouLevel, ouGroup, type, subType, comparison, criteria, meta) {

		//Store a new request object and queue it
		var newRequest = {
			"dxA": dxA,
			"dxB": dxB,
			"pe": pe,
			"peRef": peRef ? d2Utils.toArray(peRef) : null,
			"ouBoundary": ouBoundary,
			"ouLevel": ouLevel,
			"ouGroup": ouGroup,
			"type": type,
			"subType": subType,
			"comparison": comparison,
			"criteria": criteria,
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
		request = requests.pop();
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
		_type = request.type;
		_subType = request.subType;
		_comparison = request.comparison;
		_criteria = request.criteria;
		_meta = request.meta;
		_deferred = request.deferred;

		//Make sure we include all periods in our request
		var pe;
		if (_peRef != null) pe = d2Utils.arrayMerge(_pe, _peRef);
		else pe = _pe;

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

			if (_type === "data") {
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
		var boundaryValueA = dataConsistencySumDatavalues(_dxA, _pe, _ouBoundary);
		var boundaryValueB = dataConsistencySumDatavalues(_dxB, _pe, _ouBoundary);
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
			result.boundaryRatio = mathService.round(boundaryRatio, 3);
			result.boundaryPercentage = mathService.round(boundaryPercentage, 1);
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
		result.peRef = null;
		result.type = _type;
		result.subType = _subType;
		result.criteria = _criteria;
		result.meta = _meta;


		//Resolve current promise
		_deferred.resolve({"result": result, "errors": errors});


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
		};

		for (let j = 0; j < subunits.length; j++) {
			var subunit = subunits[j];

			var valueA = dataConsistencySumDatavalues(_dxA, _pe, subunit);
			var valueB = dataConsistencySumDatavalues(_dxB, _pe, subunit);

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
				"value": valueA,
				"refValue": valueB,
				"ratio": data.ratio,
				"id": subunit,
				"name": d2Data.name(subunit),
				"violation": outlier,
				"weight": weight
			});

		}
		subunitData.error = makeSubunitError(subunitData.ignored);
		return subunitData;
	}




	function timeConsistencyAnalysis() {
		//Data structure to store result of analysis
		var errors = [];					//Errors
		var result = {};					//The actual result

		//Get data for boundary orgunit
		var boundaryValueA = d2Data.value(_dxA, _pe, _ouBoundary, null);
		var boundaryValueB = referenceValue(d2Data.values(_dxA, _peRef, _ouBoundary, null), _subType, null);
		var boundaryRatio = getRatioAndPercentage(boundaryValueA, boundaryValueB).ratio;
		var boundaryPercentage = getRatioAndPercentage(boundaryValueA, boundaryValueB).percent;

		//Check if we have data for boundary orgunit for current period
		if (!d2Utils.isNumber(boundaryValueA)) {
			errors.push(makeError(_dxA, _pe, _ouBoundary));
		}
		//Check if we have data for boundary orgunit for reference periods
		else if (!d2Utils.isNumber(boundaryValueB)) {
			errors.push(makeError(_dxA, _peRef, _ouBoundary));
		}
		//If we have data for both, store the raw data, ratio and percentage
		else {
			result.boundaryValue = mathService.round(boundaryValueA, 1);
			result.boundaryRefValue = mathService.round(boundaryValueB, 1);
			result.boundaryRatio = mathService.round(boundaryRatio, 3);
			result.boundaryPercentage = mathService.round(boundaryPercentage, 1);
		}


		//Get the subunit data and store it
		var subunitData = timeConsistencyAnalysisSubunits(boundaryRatio);
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
		result.dxIDb = null;
		result.dxNameA = d2Data.name(_dxA);
		result.dxNameB = null;
		result.pe = _pe;
		result.peRef = _peRef;
		result.type = _type;
		result.subType = _subType;
		result.comparison = _comparison;
		result.criteria = _criteria;
		result.meta = _meta;


		//Resolve current promise
		_deferred.resolve({"result": result, "errors": errors});


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
	function timeConsistencyAnalysisSubunits(boundaryRatio) {

		var subunitData = {
			ignored: [],
			nonOutlierCount: 0,
			outlierCount: 0,
			outlierNames: [],
			datapoints: []
		};


		var thresholdRatio = _comparison === "ou" ? boundaryRatio : 1;

		for (let j = 0; j < subunits.length; j++) {
			var subunit = subunits[j];

			var valueA = d2Data.value(_dxA, _pe, subunit, null);
			var valueB = mathService.round(referenceValue(d2Data.values(_dxA, _peRef, subunit, null), _subType, null), 1);

			//If we miss data for both current and reference periods, ignore the orgunit
			if (!d2Utils.isNumber(valueA) && !d2Utils.isNumber(valueB)) {
				subunitData.ignored.push(d2Data.name(subunit));
				continue;
			}


			var data = getRatioAndPercentage(valueA, valueB);
			var outlier = isOutlier(thresholdRatio, data.ratio);
			var weight = 0;

			if (outlier) {
				subunitData.outlierCount++;
				subunitData.outlierNames.push(d2Data.name(subunit));
				weight = outlierWeight(valueA, valueB, thresholdRatio);
			}
			else {
				subunitData.nonOutlierCount++;
			}

			subunitData.datapoints.push({
				"value": valueA,
				"refValue": valueB,
				"ratio": data.ratio,
				"id": subunit,
				"name": d2Data.name(subunit),
				"violation": outlier,
				"weight": weight
			});

		}
		subunitData.error = makeSubunitError(subunitData.ignored);
		return subunitData;
	}




	/** ===== UTILITIES ===== **/

	/**
				 * Pull data from d2Data for dataConsistency checks, in cases where values for multiple periods must be added up
				 * @param _dxA
				 * @param _pe
				 * @param _ouBoundary
				 * @returns {*}
				 */
	function dataConsistencySumDatavalues(dx, pe, ou) {
		var values = d2Data.values(dx, pe, ou, null);
		var sum = 0;
		for (let i = 0; i < values.length; i++) {
			if (values[i]) sum += values[i];
		}

		if (sum === 0) return null;
		else return sum;
	}


	/**
	 * Calculates the ratio and percentage based on the given analysis type and criteria
	 * @param valueA
	 * @param valueB
	 * @returns {{percent: (number|*), ratio: (number|*)}}
	 */
	function getRatioAndPercentage(valueA, valueB) {

		var ratio;
		if (_subType === "do") {
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
	 * Returns either forecast based on refValue, or mean of revalues, limited by maxVal.
	 *
	 * @param values		array of reference values
	 * @param type			type of consistency - constant (mean) or increase/decrease (forecast)
	 * @param maxVal		optional - max value for forecast (e.g. 100% for completeness)
	 * @returns {*}			average or forecasted value
	 */
	function referenceValue(values, type, maxVal) {

		if (values.length === 0) return null;

		var value;
		if (type != "constant") {
			value = mathService.forecast(values);
			if (maxVal && value > maxVal) value = maxVal;

			//Set negative forecasts to 0
			if (value < 0) value = 0;
		}
		else {
			value = mathService.getMean(values);
			if (maxVal && value > maxVal) value = maxVal;
		}
		if (isNaN(value)) return null;
		else return value;
	}


	/**
	 * Checks if the ratio for a subunit is an "outlier" based on the given analysis type and criteria
	 * @param thresholdRatio
	 * @param subunitRatio
	 * @returns {boolean}
	 */
	function isOutlier(thresholdRatio, subunitRatio) {
		var ratioOfRatios;
		if (_type === "data") {
			switch (_subType) {
			case "do":
				return subunitRatio < 0 ? true : false;
			case "aGTb":
				return subunitRatio < (1.0 - _criteria * 0.01) ? true : false;
			case "eq":
				return subunitRatio > (1.0 + _criteria * 0.01) || subunitRatio < (1.0 - _criteria * 0.01) ? true : false;
			case "level":
				ratioOfRatios = subunitRatio/thresholdRatio;
				return ratioOfRatios > (1.0 + _criteria * 0.01) || ratioOfRatios < (1.0 - _criteria * 0.01) ? true : false;
			}
		}
		else {
			ratioOfRatios = subunitRatio/thresholdRatio;
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
		if (_type === "time" || _subType === "level") {
			weight = valueB*boundaryRatio - valueA;
		}
		else {
			weight = Math.abs(valueA - valueB);
		}
		weight = Math.abs(weight);
		weight = mathService.round(weight, 0);

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
		error.item = d2Data.name(dx);
		error.severity = "warning";

		if (_type === "data") {
			error.type = "Consistency betweeen indicators";
			error.msg = "Consistency analysis " + d2Data.name(_dxA) + "/" + d2Data.name(_dxB) +
							" in " + pe + " skipped for " + d2Data.name(ou) + " due to missing data for " + d2Data.name(dx) + ".";
		}
		else {
			error.type = "Consistency over time";
			error.msg = "Consistency analysis for " + _pe + " vs " +
							_peRef.join(", ") + " skipped for " + d2Data.name(ou) + " due to missing data.";
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
			if (_type === "data") {
				error = {
					"severity": "warning",
					"type": "Consistency betweeen indicators",
					"item": d2Data.name(_dxA) + " - " + d2Data.name(_dxB),
					"msg": "Skipped for the following units due to missing data: " + orunits.join(", ")
				};
			}
			else {
				error = {
					"severity": "warning",
					"type": "Consistency over time",
					"item": d2Data.name(_dxA),
					"msg": "Skipped for the following units due to missing data: " + orunits.join(", ")
				};
			}
		}

		return error;
	}


	return service;

}
