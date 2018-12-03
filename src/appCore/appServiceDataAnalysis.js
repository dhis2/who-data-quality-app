/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

export default function ($q, requestService, mathService, d2Meta, d2Map) {

	var self = this;

	//"Fixed" variables
	var maxPendingRequests = 1;
	var processIndex = 0;
	var resultLimit = 500000;
	var maxValues = 50000;

	//TODO: looking into ranges
	var ranges = {
		"0-5": 0,
		"5-20": 0,
		"20-100": 0,
		"100-1000": 0,
		"1000+": 0
	};

	self.status = {
		"done": 0,
		"total": 0,
		"progress": 0
	};
	self.currentAnalysisType = "";
	reset(false);

	//If something fails, reset
	function reset(failed) {
		self.analysisQueue = [];

		self.requests = {
			"queue": [],
			"pending": 0,
			"max": maxPendingRequests
		};

		self.process = {
			"queue": [],
			"pending": 0
		};

		if (failed) {
			if (self.currentAnalysisType === "datasetCompleteness") {
				self.dsco.callback(null, null);
			}
			else if (self.currentAnalysisType === "dataCompleteness") {
				self.dco.callback(null);
			}
			else if (self.currentAnalysisType === "indicatorOutlier") {
				self.io.callback(null);
			}
			else if (self.currentAnalysisType === "outlierGap") {
				self.og.callback(null);
			}
		}
	}


	/** -- ANALYSIS JOB QUEUE -- */
	function nextAnalysis() {
		if (self.inProgress) {
			return;
		}

		var queueItem = self.analysisQueue.pop();

		if (!queueItem) {
			console.timeEnd("ANALYSIS");
			return;
		}
		console.time("ANALYSIS");

		self.inProgress = true;

		self.status.total = 0;
		self.status.progress = 0;
		self.status.done = 0;

		self.requests.queue = [];

		if (queueItem.type === "datasetCompleteness") {
			datasetCompletenessAnalysis(queueItem.parameters);
		}
		else if (queueItem.type === "dataCompleteness") {
			dataCompletenessAnalysis(queueItem.parameters);
		}
		else if (queueItem.type === "indicatorOutlier") {
			indicatorOutlierAnalysis(queueItem.parameters);
		}
		else if (queueItem.type === "outlierGap") {
			console.log("outlierGapAnalysis");
			outlierGapAnalysis(queueItem.parameters);
		}
	}


	/** -- ANALYSIS -- */
	/**
	 * Performs outlier and gap analysis
	 * @param {Object} callback - function to send result to
	 * @param {string[]} dataIDs - array of data element or indicator IDs
	 * @param {bool} coAll - include all categoroptions
	 * @param {string[]} coIDs - dataelementoperands to include (if not all)
	 * @param {string[]} periods - array of periods in ISO format
	 * @param {string[]} ouBoundary - array of orgunit IDs (act as boundary if combined with ouLevel or ouGroup)
	 * @param {int} ouLevel - orgunit level (or null)
	 * @param {string} ouGroup - orgunit group id
	 * @param {float} sScoreCriteria - minimum standard score to be included in result
	 * @param {float} zScoreCriteria - minimum modified z-score to be included in result
	 * @param {float} gapCriteria - minimum number of gaps for result to be included
	 */
	self.outlierGap = function (callback, dataIDs, coAll, coIDs, periods, ouBoundary, ouLevel, ouGroup, sScoreCriteria, zScoreCriteria, gapCriteria) {
		if (coAll || coIDs) console.log("CO still used for in self.outlierGap()");
		var queueItem = {
			"parameters": {
				"callback": callback,
				"dataIDs": dataIDs,
				"coAll": coAll,
				"coIDs": coIDs,
				"periods": periods,
				"ouBoundary": ouBoundary,
				"ouGroup": ouGroup,
				"ouLevel": ouLevel,
				"sScoreCriteria": sScoreCriteria ? sScoreCriteria : 2,
				"zScoreCriteria": zScoreCriteria ? zScoreCriteria : 3.5,
				"gapCriteria": gapCriteria
			},
			"type": "outlierGap"
		};
		self.analysisQueue.push(queueItem);

		nextAnalysis();
	};


	function outlierGapAnalysis(parameters) {
		self.og = {};

		//parameters
		self.og.callback = parameters.callback;
		self.og.dataIDs = parameters.dataIDs;
		self.og.coAll = parameters.coAll;
		self.og.coIDs = parameters.coIDs;
		self.og.periods = parameters.periods;
		self.og.ouBoundary = parameters.ouBoundary;
		self.og.ouGroup = parameters.ouGroup;
		self.og.ouLevel = parameters.ouLevel;
		self.og.sScoreCriteria = parameters.sScoreCriteria;
		self.og.zScoreCriteria = parameters.zScoreCriteria;
		self.og.gapCriteria = parameters.gapCriteria;

		//result
		self.og.result = {
			"rows": [],
			"metaData": {}
		};

		console.time("PREPARING");
		self.og.boundaryPartitioned = [];
		outlierGapPartition();
	}


	function outlierGapPartition() {

		//If no group or level, everything is okay
		if (!self.og.ouLevel && !self.og.ouGroup) {
			self.og.ouCount = self.og.ouBoundary.length;
			outlierGapRequest();
		}
		//If method is by level and level <= 2, we assume things are okay
		else if (self.og.ouLevel && self.og.ouLevel <= 2) {
			self.og.ouCount = Math.pow(20, self.og.ouLevel-1);
			outlierGapRequest();
		}
		else {
			d2Meta.orgunitCountEstimate(self.og.ouBoundary, self.og.ouLevel ? self.og.ouLevel : null, self.og.ouGroup ? self.og.ouGroup : null).then(
				function(ouCount) {

					var peCount = self.og.periods.length;
					self.og.ouCount = parseInt(ouCount);

					//Check if orgunits need to be split
					if ((ouCount * peCount) > maxValues) {

						console.log("Request too large (estimated " + parseInt(ouCount*self.og.ouBoundary.length) +
							" units and " + peCount + " periods), partitioning");


						//TODO: Check here that children are not actually in some of the selected groups (if using groups)
						d2Meta.objects("organisationUnits", self.og.ouBoundary, "children[name,id,level]").then(
							function(data) {

								var children = [];
								for (let i = 0; i < data.length; i++) {
									for (let j = 0; j < data[i].children.length; j++) {
										children.push(data[i].children[j].id);
									}
								}
								var diff = self.og.ouBoundary.length/children.length;
								var done = (ouCount*peCount*diff) < maxValues;

								self.og.ouCount = parseInt(self.og.ouCount * diff);

								self.og.ouBoundary = children;


								if (done) {
									outlierGapRequest();
								}
								else {
									outlierGapPartition();
								}
							}
						);
					}
					else {
						outlierGapRequest();
					}
				}
			);
		}
	}


	function outlierGapRequest() {
		var noDisaggregation = !self.og.ouLevel && !self.og.ouGroup;
		var boundary = noDisaggregation ? self.og.ouBoundary.splice(0, self.og.ouBoundary.length) : self.og.ouBoundary.splice(0, 1);
		if (boundary.length === 0) {
			if (self.requests.queue.length === 0) {
				self.inProgress = false;
				reset(true);
			}
			else {
				requestData();
			}
			console.timeEnd("PREPARING");
			return;
		}

		var peCount = self.og.periods.length;
		var ouCount = self.og.ouCount;
		var dxPerRequest = Math.min(Math.max(Math.floor(maxValues/(ouCount * peCount)), 1), 20);

		var baseRequest;
		baseRequest = "/analytics.json?";
		baseRequest += "hideEmptyRows=true&ignoreLimit=true&hierarchyMeta=true";
		baseRequest += "&tableLayout=true&columns=pe&rows=dx;ou";
		baseRequest += "&dimension=pe:" + self.og.periods.join(";");
		baseRequest += "&dimension=ou:" + boundary.join(";");
		if (self.og.ouLevel) baseRequest += ";LEVEL-" + self.og.ouLevel;
		else if (self.og.ouGroup) baseRequest += ";OU_GROUP-" + self.og.ouGroup;

		var dx = angular.copy(self.og.dataIDs);
		while (dx.length > 0) {

			var items = Math.min(dxPerRequest, dx.length);
			var request = baseRequest + "&dimension=dx:" + dx.splice(0, items).join(";");

			self.requests.queue.push({
				"type": "outlierGap",
				"url": request,
				"pending": false,
				"done": false,
				"attempts": 0
			});
		}

		outlierGapRequest();
	}


	function outlierAnalysis(data) {

		var headers = data.data.headers;
		var metaData = data.data.metaData;
		var items = metaData.items; //TODO: fix
		var rows = data.data.rows;

		var sScoreCriteria = self.og.sScoreCriteria;
		var zScoreCriteria = self.og.zScoreCriteria;
		var gapCriteria = self.og.gapCriteria;

		var result = self.og.result;

		//Get the index of the important columns
		var ou, dx, valStart;
		for (let i = 0; i < headers.length; i++) {
			switch (headers[i].column) {
			case "organisationunitid":
				ou = i;
				break;
			case "dataid":
				dx = i;
				break;
			}

			if (!headers[i].meta) {
				valStart = i;
				i = headers.length;
			}
		}

		//Process the actual data
		var row, newRow;
		for (let i = 0; i < rows.length; i++) {
			row = rows[i];


			var ouID = row[ou];
			var ouName = items[ouID].name;
			var ouHierarchy = makeOuHierarchy(ouID, metaData);
			var dxID = row[dx];
			var dxName = items[row[dx]].name;
			newRow = outlierGapNewRow(ouID, ouName, ouHierarchy, dxID, dxName);

			//Iterate to get all values, and look for gaps at the same time
			var value, valueSet = [], gaps = 0;
			for (let j = row.length - 1; j >= valStart; j--) {
				value = row[j];
				newRow.data.unshift(value);

				if (isNumber(value)) {
					valueSet.push(parseFloat(value));
				}
				else {
					gaps++;
				}
			}


			//Calculate and store the statistical properties of the set
			newRow.stats = mathService.getStats(valueSet);


			//TODO: checking ranges
			if (newRow.stats.mean < 5) ranges["0-5"]++;
			else if (newRow.stats.mean < 20) ranges["5-20"]++;
			else if (newRow.stats.mean < 100) ranges["20-100"]++;
			else if (newRow.stats.mean < 1000) ranges["100-1000"]++;
			else ranges["1000+"]++;


			//Check if there are outliers
			//If data has a pre-defined criteria for outliers we can apply that rather than the default
			var outlierCriteria = d2Map.numeratorOutlierCriteria(dxID);
			var sScore = sScoreCriteria, zScore = zScoreCriteria;
			if (outlierCriteria) {

				//-1 means ignore moderate outliers, thus we use extreme as the minimum
				if (outlierCriteria.moderate == -1) {
					sScore = outlierCriteria.extreme;
					zScore = 5;
				}
				//else use the moderate as minimum
				else {
					sScore = outlierCriteria.moderate;
					zScore = 3.5;
				}
			}
			newRow.criteria = {
				"moderate": {
					"s": sScore,
					"z": zScore
				},
				"extreme": {
					"s": outlierCriteria ? outlierCriteria.extreme : 3,
					"z": 5
				}
			};
			newRow.result = outlierGapAnalyseData(valueSet, newRow.stats, gaps, zScore, sScore, gapCriteria);

			//If there are results (i.e. outliers), result set
			if (newRow.result) result.rows.push(newRow);
		}

		if (result.rows.length > parseInt(resultLimit*1.1)) {
			outlierGapTrimResult(result);
		}

		//Mark batch of data as done, then request more for procesing
		processingSucceeded(data.id);

		if (processingDone("outlierGap")) {
			console.log("Number of average values by range:");
			console.log(ranges);
			outlierGapAnalysisDone(result);
		}
		else {
			processData();
		}
	}


	/**Analyses valueSet, making returning a "result" set with maxumim outlier scores and weights*/
	function outlierGapAnalyseData(valueSet, stats, gaps, zScoreCriteria, sScoreCriteria, gapCriteria) {

		var result = {
			"maxSscore": 0,
			"maxZscore": 0,
			"gapWeight": 0,
			"outWeight": 0,
			"totalWeight": 0
		};

		//Look for outliers
		var standardScore, zScore, maxSscore = 0, maxZscore = 0, outliers = 0, value;
		for (let j = 0; j < valueSet.length; j++) {

			value = parseFloat(valueSet[j]);

			standardScore = Math.abs(mathService.calculateStandardScore(value, stats));
			zScore = Math.abs(mathService.calculateZScore(value, stats));

			if (standardScore > maxSscore) maxSscore = standardScore;
			if (zScore > maxZscore) maxZscore = zScore;

			if (zScore >= zScoreCriteria || standardScore >= sScoreCriteria) {
				outliers++;
			}
		}

		result.maxSscore = maxSscore;
		result.maxZscore = maxZscore;

		//check if row should be saved or discarded
		if (outliers > 0 || gaps >= gapCriteria) {
			if (outliers > 0) {
				result.outWeight = getOutlierWeight(valueSet, stats, sScoreCriteria, zScoreCriteria);
			}
			if (gaps >= gapCriteria) {
				result.gapWeight = mathService.round(gaps * stats.median, 0);
			}

			result.totalWeight = result.outWeight + result.gapWeight;

			return result;
		}
		else {
			return null;
		}
	}


	/** Return OU hierarchy as array of names based on result metadata*/
	function makeOuHierarchy(ouID, metaData) {

		var hierarchyIDs = metaData.ouHierarchy[ouID].split("/");
		hierarchyIDs.splice(0,1); //Get rid of leading "" and root, which is not needed

		var hierarchyNames = [];
		for (let i = 0; i < hierarchyIDs.length; i++) {

			hierarchyNames.push(metaData.items[hierarchyIDs[i]].name);

		}
		return hierarchyNames;
	}


	/**Creates a new empty outlier gap analysis row*/
	function outlierGapNewRow(ouID, ouName, ouHierarchy, dxID, dxName) {

		return {
			"data": [],
			"metaData": {
				"ou": {
					"hierarchy": ouHierarchy,
					"name": ouName,
					"id": ouID
				},
				"dx": {
					"name": dxName,
					"id": dxID
				}
			},
			"stats": {
				"mean": undefined,
				"median": undefined,
				"MAD": undefined,
				"sd": undefined,
				"variance": undefined
			}
		};
	}


	/**Trims outlier gap analysis result to resultLimit*/
	function outlierGapTrimResult(result) {
		console.log("Reached " + parseInt(resultLimit*1.1) + " rows - prioritizing");
		result.rows.sort(function (a, b) {
			return b.result.totalWeight - a.result.totalWeight;
		});

		for (let i = resultLimit; i < result.rows.length; i++) {
			result.rows[i] = null;
		}
		result.rows.splice(resultLimit, result.rows.length - resultLimit);
	}


	/**Prints a "histogram" of weight to console*/
	function outlierGapResultHistorgram(result) {
		var weights = {
			"c0-100": 0,
			"c100-500": 0,
			"c500-1000": 0,
			"c1000+": 0
		};
		var w;
		for (let i = 0; i < result.rows.length; i++) {
			w = result.rows[i].result.totalWeight;
			if (w <= 100) {
				weights["c0-100"]++;
			}
			else if (w > 100 && w <= 500) {
				weights["c100-500"]++;
			}
			else if (w > 500 && w <= 1000) {
				weights["c500-1000"]++;
			}
			else {
				weights["c1000+"]++;
			}
		}

		/*console.log("Weight histogram:");
				 var key;
				 for (key in weights) {
				 console.log(key + ": " + weights[key]);
				 }*/
	}


	/**Called when outlier and gap analysis is done. Save metadata and calls callback method*/
	function outlierGapAnalysisDone(result) {
		result.metaData.dataIDs = self.og.dataIDs;
		result.metaData.coAll = self.og.coAll;
		result.metaData.coFilter = self.og.coIDs;
		result.metaData.periods = self.og.periods;
		result.metaData.ouBoundary = self.og.ouBoundary;
		result.metaData.ouGroup = self.og.ouGroup;
		result.metaData.ouLevel = self.og.ouLevel;
		result.metaData.sScoreCriteria = self.og.sScoreCriteria;
		result.metaData.zScoreCriteria = self.og.zScoreCriteria;
		result.metaData.gapCriteria = self.og.gapCriteria;

		if (result.rows.length > resultLimit) {
			outlierGapTrimResult(result);
			result.trimmed = true;
		}

		outlierGapResultHistorgram(result); //Only for dev purposes

		// eslint-disable-next-line no-unused-vars
		outlierGapMetaData(result).then(function(success) {
			self.og.callback(result);

			self.inProgress = false;
			nextAnalysis();
		});
	}


	/** Get names of metadata (data elements and orgunits), and orgunit hierarchy*/
	function outlierGapMetaData(result) {
		var deferred = $q.defer();

		//Check how many levels we need - might have orgunits at different levels when using group selection
		var maxLevels = 0;
		var row;
		for (let i = 0; i < result.rows.length; i++) {
			row = result.rows[i];
			if (row.metaData.ou.hierarchy.length > maxLevels) maxLevels = row.metaData.ou.hierarchy.length;
		}


		d2Meta.objects("organisationUnitLevels", null, "name,id,level").then(function(levels) {

			levels.sort(function(a, b) { return a.level - b.level;});
			levels.splice(0,1); //remove root

			var levelNames = [];
			for (let i = 0; i < maxLevels; i++) {
				if (levels[i] && levels[i].name) levelNames.push(levels[i].name);
			}

			result.metaData.hierarchy = levelNames;

			deferred.resolve(true);
		});

		return deferred.promise;

	}


	/** DATASET COMPLETENESS ANALYSIS*/
	/*
			 Completeness analysis used by Annual Review

			 @param callback			function to send result to
			 @param dsID				dataset ID
			 @param threshold		threshold for subunits to be flagged
			 @param period			analysis period
			 @param ouBoundary		ID of boundary orgunit
			 @param level			level for sub-boundary orgunits
			 @returns				datasets objects array, with these additional properties:
			 boundary completeness
			 subunit count < threshold
			 subunit percent < threshold
			 subunit names < threshold
			 */
	self.datasetCompleteness = function (callback, threshold, datasetID, period, ouBoundary, ouLevel) {

		var queueItem = {
			"type": "datasetCompleteness",
			"parameters": {
				"callback": callback,
				"dsID": datasetID,
				"threshold": threshold,
				"pe": period,
				"ouBoundary": ouBoundary,
				"ouLevel": ouLevel
			}
		};

		self.analysisQueue.push(queueItem);
		nextAnalysis();
	};


	function datasetCompletenessAnalysis(parameters) {
		//Start
		self.dsco = parameters;

		//Reset
		self.dsco.boundaryData = null;
		self.dsco.subunitData = null;


		//1 request boundary completeness data
		var requestURL = "/analytics.json?dimension=dx:" + self.dsco.dsID + "&dimension=ou:" + self.dsco.ouBoundary + "&dimension=pe:" + self.dsco.pe + "&displayProperty=NAME";

		requestService.getSingle(requestURL).then(
			//success
			function (response) {
				if (!requestService.validResponse(response)) return;
				self.dsco.boundaryData = response.data;
				startDatasetCompletenessAnalysis();
			},
			//error
			// eslint-disable-next-line no-unused-vars
			function (response) {
				console.log("Error fetching data");
			}
		);

		//2 request subunit completeness data
		var ou;
		if (self.dsco.ouBoundary) ou = self.dsco.ouBoundary + ";LEVEL-" + self.dsco.ouLevel;
		else ou = "LEVEL-" + self.dsco.ouLevel;

		var requestURL2 = "/analytics.json?dimension=dx:" + self.dsco.dsID + "&dimension=ou:" + ou + "&dimension=pe:" + self.dsco.pe + "&displayProperty=NAME";

		requestService.getSingle(requestURL2).then(
			//success
			function (response) {
				if (!requestService.validResponse(response)) return;
				self.dsco.subunitData = response.data;
				startDatasetCompletenessAnalysis();
			},
			//error
			// eslint-disable-next-line no-unused-vars
			function (response) {
				console.log("Error fetching data");
			}
		);
	}


	function startDatasetCompletenessAnalysis() {

		var subunitReady = (self.dsco.subunitData !== null);
		var boundaryReady = (self.dsco.boundaryData !== null);
		if (!subunitReady || !boundaryReady) return;

		var dsID = self.dsco.dsID;
		var threshold = self.dsco.threshold;
		var pe = self.dsco.pe;
		var ouBoundary = self.dsco.ouBoundary;
		var ouSubunitIDs = self.dsco.subunitData.metaData.dimensions.ou;

		//reshuffle and concat the data from DHIS a bit to make is easier to use
		var headers = self.dsco.boundaryData.headers;
		var items = self.dsco.subunitData.metaData.items;
		var data = self.dsco.subunitData.rows;

		var key;
		data = data.concat(self.dsco.boundaryData.rows);
		for (key in self.dsco.boundaryData.metaData.items) {
			items[key] = self.dsco.boundaryData.metaData.items[key];
		}

		var errors = [];
		var result = {};
		var subunitsWithinThreshold = 0;
		var subunitsOutsideThreshold = 0;
		var subunitViolationNames = [];

		//Get boundary value
		result.boundaryValue = dataValue(headers, data, dsID, pe, ouBoundary, null);

		//Get subunit values
		var value;
		for (let j = 0; j < ouSubunitIDs.length; j++) {
			value = dataValue(headers, data, dsID, pe, ouSubunitIDs[j], null);
			if (isNumber(value)) {
				if (value > threshold) subunitsWithinThreshold++;
				else {
					subunitsOutsideThreshold++;
					subunitViolationNames.push(items[ouSubunitIDs[j]].name);
				}
			}
		}
		//Summarise result
		var percent = 100 * subunitsOutsideThreshold / (subunitsOutsideThreshold + subunitsWithinThreshold);
		result.subunitsWithinThreshold = subunitsWithinThreshold;
		result.subunitsOutsideThreshold = subunitsOutsideThreshold;
		result.subunitViolationPercentage = mathService.round(percent, 1);
		result.subunitViolationNames = subunitViolationNames;

		//Add key metadata to result
		result.pe = pe;
		result.dxID = dsID;
		result.dxName = items[dsID].name;
		result.threshold = threshold;

		self.dsco.callback(result, errors);

		self.inProgress = false;
		nextAnalysis();
	}


	/** DATA COMPLETENESS ANALYSIS*/
	/*
			 Completeness analysis used by Annual Review

			 @param callback			function to send result to
			 @param datasets			array of objects with:
			 name,
			 id,
			 periodtype
			 threshold for completeness
			 threshold for consistency
			 trend
			 @param period			analysis period
			 @param refPeriods		reference periods (for consistency over time)
			 @param bounaryOrgunit	ID of boundary orgunit
			 @param level			level for sub-boundary orgunits
			 @returns				datasets objects array, with these additional properties:
			 boundary completeness
			 boundary consistency over time
			 subunit count < threshold
			 subunit percent < threshold
			 subunit names < threshold
			 subunit count < consistency threshold
			 subunit percent < consistency threshold
			 subunit names < consistency threshold
			 */
	self.dataCompleteness = function (callback, threshold, dataID, coID, periods, ouBoundary, ouLevel) {

		var queueItem = {
			"type": "dataCompleteness",
			"parameters": {
				"callback": callback,
				"threshold": threshold,
				"dxID": dataID,
				"coID": coID,
				"pe": periods,
				"ouBoundary": ouBoundary,
				"ouLevel": ouLevel
			}
		};

		self.analysisQueue.push(queueItem);
		nextAnalysis();

	};


	function dataCompletenessAnalysis(parameters) {
		self.dco = parameters;

		var requestURL = "/analytics.json?dimension=dx:" + self.dco.dxID + "&dimension=ou:" + self.dco.ouBoundary + ";LEVEL-" + self.dco.ouLevel + "&dimension=pe:" + self.dco.pe.join(";") + "&displayProperty=NAME";

		requestService.getSingle(requestURL).then(
			//success
			function (response) {
				if (!requestService.validResponse(response)) return;
				self.dco.data = response.data;
				startDataCompletenessAnalysis();
			},
			//error
			// eslint-disable-next-line no-unused-vars
			function (response) {
				console.log("Error fetching data");
			}
		);

	}


	function startDataCompletenessAnalysis() {

		var rows = self.dco.data.rows;
		var headers = self.dco.data.headers;
		var items = self.dco.data.metaData.items;

		var subunits = self.dco.data.metaData.dimensions.ou;
		var periods = self.dco.data.metaData.dimensions.pe;
		var dxID = self.dco.dxID;

		var threshold = self.dco.threshold;


		var totalExpectedValues = subunits.length * periods.length;
		var totalActualValues = 0;

		var totalSubunits = subunits.length;
		var subunitsOutsideThreshold = 0;
		var subunitViolationNames = [];

		var valid, value, completeness;
		for (let i = 0; i < subunits.length; i++) {

			valid = 0;
			for (let j = 0; j < periods.length; j++) {

				value = dataValue(headers, rows, dxID, periods[j], subunits[i], null);
				if (isNumber(value) && parseFloat(value) != 0) valid++;

			}
			totalActualValues += valid;

			completeness = 100 * valid / periods.length;
			if (completeness < threshold) {
				subunitViolationNames.push(items[subunits[i]].items);
				subunitsOutsideThreshold++;
			}
		}

		//Summarise result
		var result = {};
		var percent = 100 * subunitsOutsideThreshold / totalSubunits;
		result.subunitsOutsideThreshold = subunitsOutsideThreshold;
		result.subunitViolationPercentage = mathService.round(percent, 1);
		result.subunitViolationNames = subunitViolationNames;
		result.boundaryValue = mathService.round(100 * totalActualValues / totalExpectedValues, 1);

		//Include some metadata
		result.dxID = dxID;
		result.dxName = items[dxID].name;
		result.pe = periods;
		result.threshold = threshold;

		//Return
		self.dco.callback(result);

		self.inProgress = false;
		nextAnalysis();
	}


	/** DATA OUTLIER ANALYSIS*/
	/*
			 Completeness analysis used by Annual Review

			 @param callback			function to send result to
			 @param datasets			array of objects with:
			 name,
			 id,
			 periodtype
			 threshold for completeness
			 threshold for consistency
			 trend
			 @param period			analysis period
			 @param refPeriods		reference periods (for consistency over time)
			 @param bounaryOrgunit	ID of boundary orgunit
			 @param level			level for sub-boundary orgunits
			 @returns				datasets objects array, with these additional properties:
			 boundary completeness
			 boundary consistency over time
			 subunit count < threshold
			 subunit percent < threshold
			 subunit names < threshold
			 subunit count < consistency threshold
			 subunit percent < consistency threshold
			 subunit names < consistency threshold
			 */
	self.indicatorOutlier = function (callback, indicator, periods, boundaryOrgunit, level) {

		var queueItem = {
			"type": "indicatorOutlier",
			"parameters": {
				"callback": callback,
				"indicator": indicator,
				"periods": periods,
				"boundaryOrgunit": boundaryOrgunit,
				"level": level
			}
		};

		self.analysisQueue.push(queueItem);
		nextAnalysis();

	};


	function indicatorOutlierAnalysis(parameters) {
		self.io = parameters;

		var requestURL = "/analytics.json?dimension=dx:" + self.io.indicator.dataID + "&dimension=ou:" + self.io.boundaryOrgunit + ";LEVEL-" + self.io.level + "&dimension=pe:" + self.io.periods.join(";") + "&displayProperty=NAME";

		requestService.getSingle(requestURL).then(
			//success
			function (response) {
				if (!requestService.validResponse(response)) return;
				self.io.data = response.data;
				startIndicatorOutlierAnalysis();
			},
			//error
			// eslint-disable-next-line no-unused-vars
			function (response) {
				console.log("Error fetching data");
			}
		);

	}


	function startIndicatorOutlierAnalysis() {
		var rows = self.io.data.rows;
		var headers = self.io.data.headers;
		var subunits = self.io.data.metaData.dimensions.ou;
		var periods = self.io.data.metaData.dimensions.pe;
		var items = self.io.data.metaData.items;

		var totalValues = 0;
		var totalExtremeOutliers = 0;
		var totalModerateOutliers = 0;
		var totalZscoreOutliers = 0;

		var subunitsExtreme = 0;
		var subunitExtremeNames = [];
		var subunitsModerate = 0;
		var subunitModerateNames = [];
		var subunitsZscore = 0;
		var subunitZscoreNames = [];


		var de = self.io.indicator.dataID;
		var extremeLimit = self.io.indicator.extremeOutlier;
		var moderateLimit = self.io.indicator.moderateOutlier;

		var value, valueSet, extremeCount, moderateCount, zCount;
		for (let i = 0; i < subunits.length; i++) {
			valueSet = [];
			extremeCount = 0;
			moderateCount = 0;
			zCount = 0;

			for (let j = 0; j < periods.length; j++) {
				value = dataValue(headers, rows, de, periods[j], subunits[i], null);
				if (isNumber(value)) valueSet.push(parseFloat(value));
			}
			totalValues += valueSet.length;

			var stats = mathService.getStats(valueSet);
			var modMax = stats.mean + stats.sd * moderateLimit;
			var modMin = stats.mean - stats.sd * moderateLimit;
			var extMax = stats.mean + stats.sd * extremeLimit;
			var extMin = stats.mean - stats.sd * extremeLimit;

			for (let j = 0; j < valueSet.length; j++) {
				if (valueSet[j] > extMax || valueSet[j] < extMin) {
					extremeCount++;
					totalExtremeOutliers++;
				}
				else if (valueSet[j] > modMax || valueSet[j] < modMin) {
					moderateCount++;
					totalModerateOutliers++;
				}

				//Modified Z-score
				if (mathService.calculateZScore(valueSet[i], stats) > 3.5) {
					zCount++;
					totalZscoreOutliers++;
				}

			}

			if (extremeCount > 0) {
				subunitsExtreme++;
				subunitExtremeNames.push(items[subunits[i]].name);
			}
			if (moderateCount > 1) {
				subunitsModerate++;
				subunitModerateNames.push(items[subunits[i]].name);
			}
			if (zCount > 1) {
				subunitsZscore++;
				subunitZscoreNames.push(items[subunits[i]].name);
			}
		}


		self.io.indicator.boundaryExtreme = mathService.round(100 * totalExtremeOutliers / totalValues, 1);
		self.io.indicator.countExtreme = subunitsExtreme;
		self.io.indicator.percentExtreme = mathService.round(100 * subunitsExtreme / subunits.length, 1);
		self.io.indicator.namesExtreme = subunitExtremeNames.sort();

		self.io.indicator.boundaryModerate = mathService.round(100 * totalModerateOutliers / totalValues, 1);
		self.io.indicator.countModerate = subunitsModerate;
		self.io.indicator.percentModerate = mathService.round(100 * subunitsModerate / subunits.length, 1);
		self.io.indicator.namesModerate = subunitModerateNames.sort();

		self.io.indicator.boundaryZscore = mathService.round(100 * totalZscoreOutliers / totalValues, 1);
		self.io.indicator.countZscore = subunitsZscore;
		self.io.indicator.percentZscore = mathService.round(100 * subunitsZscore / subunits.length, 1);
		self.io.indicator.namesZscore = subunitZscoreNames.sort();

		self.io.callback(self.io.indicator);
		self.inProgress = false;
		nextAnalysis();

	}



	/**COMMON DATA FUNCTIONS*/
	/*
			 Requires DHIS analytics data in json format.
			 @param header			response header from analytics
			 @param dataValues		response rows from analytics
			 @param de, pe, ou, co	IDs

			 @returns float of datavalue, or null if not found
			 */
	function dataValue(header, dataValues, de, pe, ou, co) {
		var dxi, pei, oui, coi, vali;
		for (let i = 0; i < header.length; i++) {
			if (header[i].name === "dx" && !header[i].hidden) dxi = i;
			if (header[i].name === "ou" && !header[i].hidden) oui = i;
			if (header[i].name === "pe" && !header[i].hidden) pei = i;
			if (header[i].name === "co" && !header[i].hidden) coi = i;
			if (header[i].name === "value" && !header[i].hidden) vali = i;
		}

		var data;
		for (let i = 0; i < dataValues.length; i++) {
			data = dataValues[i];
			if (
				(dxi === undefined || data[dxi] === de) &&
				(pei === undefined || data[pei] === pe.toString()) &&
				(oui === undefined || data[oui] === ou) &&
				(coi === undefined || data[coi] === co)
			) return parseFloat(data[vali]);
		}

		return null;
	}


	//Returns difference between current sum and what would be expected from mean of those values withing 1 SD
	function getOutlierWeight(valueSet, stats, SDlimit, Zlimit) {

		if (valueSet.length <= 1 || isNaN(stats.sd) || (stats.mean === 0 && stats.sd === 0)) {
			return 0;
		}

		var normCount = 0, normSum = 0, total = 0;
		for (let i = 0; i < valueSet.length; i++) {
			var value = valueSet[i];
			var standardScore = Math.abs(mathService.calculateStandardScore(value, stats));
			var zScore = Math.abs(mathService.calculateZScore(value, stats));
			if (standardScore < SDlimit && zScore < Zlimit) {
				normSum += value;
				normCount++;
			}
			total += value;
		}
		var normMean = normSum / normCount;
		var expectedTotal = normMean * valueSet.length;
		return Math.abs(mathService.round(total - expectedTotal, 0));
	}


	/** DATA REQUESTS QUEUEING */
	function requestData() {

		if (self.status.total === 0) {
			self.status.total = self.requests.queue.length;
			self.status.done = 0;
		}

		var request = getNextRequest();
		while (request && self.requests.pending < self.requests.max) {

			self.requests.pending++;
			request.pending = true;
			requestService.getSingle(request.url).then(
				//success
				function (response) {
					requestService.validResponse(response);
					self.requests.pending--;
					storeResponse(response);
					self.status.progress = mathService.round(100 * self.status.done / self.status.total, 0);
				},
				//error
				function (response) {
					self.requests.pending--;
					console.log("Error getting request");
					storeResponse(response); //TODO: Why?
					self.status.progress = mathService.round(100 * self.status.done / self.status.total, 0);
				}
			);

			request = getNextRequest();
		}

	}


	function getNextRequest() {

		for (let i = 0; i < self.requests.queue.length; i++) {
			if (!self.requests.queue[i].pending) {
				return self.requests.queue[i];
			}
		}
		return null;
	}


	function requestSucceeded(url) {
		for (let i = 0; i < self.requests.queue.length; i++) {

			if (url.indexOf(self.requests.queue[i].url) > -1) {

				var requestType = self.requests.queue[i].type;
				self.requests.queue[i] = null;
				self.requests.queue.splice(i, 1);

				return requestType;
			}
		}
		return null;
	}


	function requestFailed(url) {
		for (let i = 0; i < self.requests.queue.length; i++) {
			if (url.indexOf(self.requests.queue[i].url) > -1) {

				self.requests.queue[i].pending = false;
				self.requests.queue[i].attempts++;

				if (self.requests.queue[i].attempts > 1) {
					console.log("Attempts: " + self.requests.queue[i].attempts);
				}

				if (self.requests.queue[i].attempts > 3) {
					console.log("To many attempts: " + self.requests.queue[i].attempts);
					self.requests.queue[i] = null;
					self.requests.queue.splice(i, 1);
				}
			}
		}
	}


	function storeResponse(response) {

		var data = response.data;
		var requestURL = response.config.url;
		var requestType;

		var status = response.status;
		if (status != 200) {

			//TODO: Should split it instead
			if (status === 409 && (data && data.indexOf("Table exceeds") > -1)) {
				console.log("Query result too big");
				requestSucceeded(requestURL);

			}

			//No children for this boundary ou - no worries..
			else if (status === 409 && (data && data.indexOf("Dimension ou is present") > -1)) {
				console.log("Requested child data for a unit without children");
				requestSucceeded(requestURL);
			}

			//Probably time out - try again
			else if (status === 0) {
				console.log("Timout - retrying");
				requestFailed(requestURL);
			}

			else if (status === 302) {
				console.log("User has been logged out");
				console.log(response);
				requestFailed(requestURL);
			}

			//Unknown error
			else {
				console.log("Unknown error while fetching data: " + response.statusText);
				requestSucceeded(requestURL);
			}
		}

		else {

			self.status.done++;

			//Mark item in queue as downloaded
			requestType = requestSucceeded(requestURL);
			if (requestType != null) {
				//Queue data for processing
				self.process.queue.push({
					"type": requestType,
					"data": response.data,
					"pending": false,
					"id": ++processIndex
				});

				processData();
			}
		}
		//fetch more data
		requestData();
	}

	/** DATA PROCESS QUEUING */


	function processData() {

		var data = getNextData();
		while (data && self.process.pending < 1) {

			data.pending = true;
			self.process.pending++;

			if (data.type == "outlierGap") outlierAnalysis(data);

			data = getNextData();
		}

	}


	function getNextData() {

		for (let i = 0; i < self.process.queue.length; i++) {
			if (!self.process.queue[i].pending) {
				return self.process.queue[i];
			}
		}
		return null;
	}


	//OKAY - remove object
	function processingSucceeded(id) {
		for (let i = 0; i < self.process.queue.length; i++) {
			if (self.process.queue[i].id === id) {
				self.process.queue[i].data = null;
				self.process.queue[i] = null;
				self.process.queue.splice(i, 1);
				break;
			}
		}

		self.process.pending--;


	}


	function processingDone(type) {

		//Check if all requests haver returned
		for (let i = 0; i < self.requests.queue.length; i++) {
			if (self.requests.queue[i].type === type) {
				return false;
			}
		}

		//Check if all processing is done
		for (let i = 0; i < self.process.queue.length; i++) {
			if (self.process.queue[i].type === type) {
				return false;
			}
		}

		return true;

	}


	/** UTILITIES*/
	function isNumber(number) {

		return !isNaN(parseFloat(number));

	}


}