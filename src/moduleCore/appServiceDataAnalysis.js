(function () {
	/**Service: Completeness*/
	angular.module('dataQualityApp').service('dataAnalysisService', ['$q', 'requestService', 'mathService', 'metaDataService', function ($q, requestService, mathService, metaDataService) {

		var self = this;

		//"Fixed" variables
		var maxPendingRequests = 1;
		var processIndex = 0;

		self.status = {
			'done': 0,
			'total': 0,
			'progress': 0
		};
		self.currentAnalysisType = '';
		reset(false);

		//If something fails, reset
		function reset(failed) {
			self.analysisQueue = [];

			self.requests = {
				'queue': [],
				'pending': 0,
				'max': maxPendingRequests
			};

			self.process = {
				'queue': [],
				'pending': 0
			};

			if (failed) {
				if (self.currentAnalysisType === 'datasetCompleteness') {
					self.dsco.callback(null, null);
				}
				else if (self.currentAnalysisType === 'timeConsistency') {
					self.dsci.callback(null, null);
				}
				else if (self.currentAnalysisType === 'dataCompleteness') {
					self.dco.callback(null);
				}
				else if (self.currentAnalysisType === 'indicatorOutlier') {
					self.io.callback(null);
				}
				else if (self.currentAnalysisType === 'dataConsistency') {
					self.dc.callback(null, null);
				}
				else if (self.currentAnalysisType === 'outlierGap') {
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

			if (queueItem.type === 'datasetCompleteness') {
				datasetCompletenessAnalysis(queueItem.parameters);
			}
			else if (queueItem.type === 'timeConsistency') {
				timeConsistencyAnalysis(queueItem.parameters);
			}
			else if (queueItem.type === 'dataCompleteness') {
				dataCompletenessAnalysis(queueItem.parameters);
			}
			else if (queueItem.type === 'indicatorOutlier') {
				indicatorOutlierAnalysis(queueItem.parameters);
			}
			else if (queueItem.type === 'dataConsistency') {
				dataConsistencyAnalysis(queueItem.parameters);
			}
			else if (queueItem.type === 'outlierGap') {
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
			var queueItem = {
				'parameters': {
					'callback': callback,
					'dataIDs': dataIDs,
					'coAll': coAll,
					'coIDs': coIDs,
					'periods': periods,
					'ouBoundary': ouBoundary,
					'ouGroup': ouGroup,
					'ouLevel': ouLevel,
					'sScoreCriteria': sScoreCriteria,
					'zScoreCriteria': zScoreCriteria,
					'gapCriteria': gapCriteria
				},
				'type': 'outlierGap'
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

			//Make a guess on how many data elements we can include in each query (2 minimum) if we want to stay within roughly 50000 rows (we ignore limit in case some go slightly higher)
			var maxValues = 50000;
			var ouPerLevel = 15; //assume this number children on average, and two levels
			if (!self.og.ouLevel && !self.og.ouGroup) ouPerLevel = 1;
			var peCount = self.og.periods.length;
			var avgCatCombo = 1;
			if (self.og.coAll || self.og.coIDs) avgCatCombo = 4;
			var numDEs = Math.max(Math.ceil(maxValues / (peCount * ouPerLevel * ouPerLevel * avgCatCombo)), 2);//TODO: should take number of orgunits into account
			var numOUs = (self.og.ouLevel || self.og.ouGroup) ? 1 : 50;
			var ouIDs;
			for (var i = 0; i < self.og.ouBoundary.length; i += numOUs) {
				//make requests
				var baseRequest;
				baseRequest = '/api/analytics.json?';
				baseRequest += 'hideEmptyRows=true&ignoreLimit=true&hierarchyMeta=true';
				baseRequest += '&tableLayout=true';
				baseRequest += '&dimension=pe:' + self.og.periods.join(';');

				var start = i;
				var end = (i + numOUs) > self.og.ouBoundary.length ? self.og.ouBoundary.length : (i + numOUs);
				ouIDs = self.og.ouBoundary.slice(start, end);
				baseRequest += '&dimension=ou:' + ouIDs.join(';');
				if (self.og.ouLevel) baseRequest += ';LEVEL-' + self.og.ouLevel;
				else if (self.og.ouGroup) baseRequest += ';OU_GROUP-' + self.og.ouGroup;



				//check whether to get categoryoptions or not
				if (self.og.coAll || self.og.coIDs) {
					baseRequest += '&dimension=co';
					baseRequest += '&columns=pe&rows=ou;dx;co';
				}
				else {
					baseRequest += '&columns=pe&rows=ou;dx';
				}

				//add data ids
				var dxIDs, request, requests = [];
				for (var j = 0; j < self.og.dataIDs.length; j = j + numDEs) {

					var start = j;
					var end = (j + numDEs) > self.og.dataIDs.length ? self.og.dataIDs.length : (j + numDEs);

					dxIDs = self.og.dataIDs.slice(start, end);

					self.requests.queue.push({
						"type": 'outlierGap',
						"url": baseRequest + '&dimension=dx:' + dxIDs.join(';'),
						"pending": false,
						"done": false,
						"attempts": 0
					});
				}
			}

			console.log(self.requests.queue.length + " requests in queue for outlier and gap analysis");

			if (self.requests.queue.length === 0) {
				self.inProgress = false;
				reset(true);
			}
			else {
				requestData();
			}
		}


		function outlierAnalysis(data) {

			var headers = data.data.headers;
			var metaData = data.data.metaData;
			var names = metaData.names;
			var rows = data.data.rows;
			var periods = self.og.periods;

			var coAll = self.og.coAll;
			var coIDs = self.og.coIDs;

			var sScoreCriteria = self.og.sScoreCriteria;
			var zScoreCriteria = self.og.zScoreCriteria;
			var gapCriteria = self.og.gapCriteria;

			var result = self.og.result;

			//Get the index of the important columns
			var ou, dx, co, valStart;
			for (var i = 0; i < headers.length; i++) {
				switch (headers[i].column) {
					case 'organisationunitid':
						ou = i;
						break;
					case 'dataid':
						dx = i;
						break;
					case 'categoryoptioncomboid':
						co = i;
						break;
				}

				if (!headers[i].meta) {
					valStart = i;
					i = headers.length;
				}
			}

			//Process the actual data
			var row, newRow;
			for (var i = 0; i < rows.length; i++) {
				row = rows[i];

				var dxID;
				if (!coAll && coIDs) {
					dxID = row[dx] + '.' + row[co];
					if (!coIDs[dxID]) continue;
				}
				else {
					dxID = row[dx];
				}

				var ouID = row[ou];
				var ouName = names[ouID];
				var ouHierarchy = makeOuHierarchy(ouID, metaData);
				var dxName = co != undefined ? names[row[dx]] + ' ' + names[row[co]] : names[row[dx]];
				newRow = outlierGapNewRow(ouID, ouName, ouHierarchy, dxID, dxName);




				//Iterate to get all values, and look for gaps at the same time
				var value, valueSet = [], gaps = 0;
				for (var j = row.length - 1; j >= valStart; j--) {
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

				//Check if there are outliers
				newRow.result = outlierGapAnalyseData(valueSet, newRow.stats, gaps, zScoreCriteria, sScoreCriteria, gapCriteria)

				//If there are results (i.e. outliers), result set
				if (newRow.result) result.rows.push(newRow);
			}

			if (result.rows.length > 210000) {
				outlierGapTrimResult(result)
			}

			//Mark batch of data as done, then request more for procesing
			processingSucceeded(data.id);

			if (processingDone('outlierGap')) {
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
			for (var j = 0; j < valueSet.length; j++) {

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
					result.outWeight = getOutlierWeight(valueSet, stats, sScoreCriteria);
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

			var hierarchyIDs = metaData.ouHierarchy[ouID].split('/');
			hierarchyIDs.splice(0,2); //Get rid of leading "" and root, which is not needed

			var hierarchyNames = [];
			for (var i = 0; i < hierarchyIDs.length; i++) {

				hierarchyNames.push(metaData.names[hierarchyIDs[i]]);

			}
			return hierarchyNames;
		}


		/**Creates a new empty outlier gap analysis row*/
		function outlierGapNewRow(ouID, ouName, ouHierarchy, dxID, dxName) {

			return {
				"data": [],
				"metaData": {
					'ou': {
						'hierarchy': ouHierarchy,
						'name': ouName,
						"id": ouID
					},
					'dx': {
						"name": dxName,
						"id": dxID
					}
				},
				'stats': {
					"mean": undefined,
					"median": undefined,
					"MAD": undefined,
					"sd": undefined,
					"variance": undefined
				}
			};
		}

		/**Trims outlier gap analysis result to 2000*/
		function outlierGapTrimResult(result) {
			console.log("Reached 210000 rows - prioritizing");
			result.rows.sort(function (a, b) {
				return b.result.totalWeight - a.result.totalWeight;
			});

			for (var i = 200000; i < result.rows.length; i++) {
				result.rows[i] = null;
			}
			result.rows.splice(200000, result.rows.length - 200000);
		}

		/**Prints a "histogram" of weight to console*/
		function outlierGapResultHistorgram(result) {
			var weights = {
				'c0-100': 0,
				'c100-500': 0,
				'c500-1000': 0,
				'c1000+': 0
			};
			var w;
			for (var i = 0; i < result.rows.length; i++) {
				w = result.rows[i].result.totalWeight;
				if (w <= 100) {
					weights['c0-100']++;
				}
				else if (w > 100 && w <= 500) {
					weights['c100-500']++;
				}
				else if (w > 500 && w <= 1000) {
					weights['c500-1000']++;
				}
				else {
					weights['c1000+']++;
				}
			}

			console.log("Weight histogram:");
			var key;
			for (key in weights) {
				console.log(key + ": " + weights[key]);
			}
		}

		/**Called when outlier and gap analysis is done. Save metadata and calls callback method*/
		function outlierGapAnalysisDone(result) {

			console.log(result.metaData)

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

			if (result.rows.length > 200000) {
				outlierGapTrimResult(result);
			}

			outlierGapResultHistorgram(result); //TODO: Only for dev purposes

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
			for (var i = 0; i < result.rows.length; i++) {
				row = result.rows[i];
				if (row.metaData.ou.hierarchy.length > maxLevels) maxLevels = row.metaData.ou.hierarchy.length;
			}


			metaDataService.getOrgunitLevels().then(function(levels) {

				var levels = levels;
				levels.sort(function(a, b) { return a.level - b.level});
				levels.splice(0,1); //remove root

				var levelNames = [];
				for (var i = 0; i < maxLevels; i++) {
					if (levels[i] && levels[i].name) levelNames.push(levels[i].name);
				}

				result.metaData.hierarchy = levelNames;

				deferred.resolve(true);
			});

			return deferred.promise;

		}

		function getObjectWithID(array, id) {

			for (var i = 0; i < array.length; i++) {
				if (array[i].id === id) return array[i];
			}

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
				'type': 'datasetCompleteness',
				'parameters': {
					'callback': callback,
					'dsID': datasetID,
					'threshold': threshold,
					'pe': period,
					'ouBoundary': ouBoundary,
					'ouLevel': ouLevel
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
			var requestURL = '/api/analytics.json?dimension=dx:' + self.dsco.dsID + '&dimension=ou:' + self.dsco.ouBoundary + '&dimension=pe:' + self.dsco.pe + '&displayProperty=NAME';

			requestService.getSingle(requestURL).then(
				//success
				function (response) {
					self.dsco.boundaryData = response.data;
					startDatasetCompletenessAnalysis();
				},
				//error
				function (response) {
					console.log("Error fetching data");
				}
			);

			//2 request subunit completeness data
			var ou;
			if (self.dsco.ouBoundary) ou = self.dsco.ouBoundary + ';LEVEL-' + self.dsco.ouLevel;
			else ou = LEVEL - self.dsco.ouLevel;

			var requestURL = '/api/analytics.json?dimension=dx:' + self.dsco.dsID + '&dimension=ou:' + ou + '&dimension=pe:' + self.dsco.pe + '&displayProperty=NAME';

			requestService.getSingle(requestURL).then(
				//success
				function (response) {
					self.dsco.subunitData = response.data;
					startDatasetCompletenessAnalysis();
				},
				//error
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
			var ouSubunitIDs = self.dsco.subunitData.metaData.ou;

			//reshuffle and concat the data from DHIS a bit to make is easier to use
			var headers = self.dsco.boundaryData.headers;
			var names = self.dsco.subunitData.metaData.names;
			var data = self.dsco.subunitData.rows;

			var key;
			data = data.concat(self.dsco.boundaryData.rows);
			for (key in self.dsco.boundaryData.metaData.names) {
				names[key] = self.dsco.boundaryData.metaData.names[key];
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
			for (var j = 0; j < ouSubunitIDs.length; j++) {
				value = dataValue(headers, data, dsID, pe, ouSubunitIDs[j], null);
				if (isNumber(value)) {
					if (value > threshold) subunitsWithinThreshold++;
					else {
						subunitsOutsideThreshold++;
						subunitViolationNames.push(names[ouSubunitIDs[j]]);
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
			result.dxName = names[dsID];
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
				'type': 'dataCompleteness',
				'parameters': {
					'callback': callback,
					'threshold': threshold,
					'dxID': dataID,
					'coID': coID,
					'pe': periods,
					'ouBoundary': ouBoundary,
					'ouLevel': ouLevel
				}
			};

			self.analysisQueue.push(queueItem);
			nextAnalysis();

		};


		function dataCompletenessAnalysis(parameters) {
			self.dco = parameters;

			var requestURL = '/api/analytics.json?dimension=dx:' + self.dco.dxID + '&dimension=ou:' + self.dco.ouBoundary + ';LEVEL-' + self.dco.ouLevel + '&dimension=pe:' + self.dco.pe.join(';') + '&displayProperty=NAME';

			requestService.getSingle(requestURL).then(
				//success
				function (response) {
					self.dco.data = response.data;
					startDataCompletenessAnalysis();
				},
				//error
				function (response) {
					console.log("Error fetching data");
				}
			);

		}


		function startDataCompletenessAnalysis() {

			var rows = self.dco.data.rows;
			var headers = self.dco.data.headers;
			var names = self.dco.data.metaData.names;

			var subunits = self.dco.data.metaData.ou;
			var periods = self.dco.data.metaData.pe;
			var dxID = self.dco.dxID;

			var threshold = self.dco.threshold;


			var totalExpectedValues = subunits.length * periods.length;
			var totalActualValues = 0;

			var totalSubunits = subunits.length;
			var subunitsOutsideThreshold = 0;
			var subunitViolationNames = [];

			var valid, value, completeness;
			for (var i = 0; i < subunits.length; i++) {

				valid = 0;
				for (var j = 0; j < periods.length; j++) {

					value = dataValue(headers, rows, dxID, periods[j], subunits[i], null);
					if (isNumber(value) && parseFloat(value) != 0) valid++;

				}
				totalActualValues += valid;

				completeness = 100 * valid / periods.length;
				if (completeness < threshold) {
					subunitViolationNames.push(names[subunits[i]]);
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
			result.dxName = names[dxID];
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
				'type': 'indicatorOutlier',
				'parameters': {
					'callback': callback,
					'indicator': indicator,
					'periods': periods,
					'boundaryOrgunit': boundaryOrgunit,
					'level': level
				}
			};

			self.analysisQueue.push(queueItem);
			nextAnalysis();

		};

		function indicatorOutlierAnalysis(parameters) {
			self.io = parameters;

			var requestURL = '/api/analytics.json?dimension=dx:' + self.io.indicator.localData.id + '&dimension=ou:' + self.io.boundaryOrgunit + ';LEVEL-' + self.io.level + '&dimension=pe:' + self.io.periods.join(';') + '&displayProperty=NAME';

			requestService.getSingle(requestURL).then(
				//success
				function (response) {
					self.io.data = response.data;
					startIndicatorOutlierAnalysis();
				},
				//error
				function (response) {
					console.log("Error fetching data");
				}
			);

		}

		function startIndicatorOutlierAnalysis() {
			var rows = self.io.data.rows;
			var headers = self.io.data.headers;
			var subunits = self.io.data.metaData.ou;
			var periods = self.io.data.metaData.pe;
			var names = self.io.data.metaData.names;

			var totalValues = 0;
			var totalExtremeOutliers = 0;
			var totalModerateOutliers = 0;
			var totalZscoreOutliers = 0;

			var totalDistricts = subunits.length;
			var subunitsExtreme = 0;
			var subunitsModerate = 0;
			var subunitExtremeNames = [];
			var subunitModerateNames = [];
			var subunitsZscore = 0;
			var subunitZscoreNames = [];


			var de = self.io.indicator.localData.id;
			var extremeLimit = self.io.indicator.extremeOutlier;
			var moderateLimit = self.io.indicator.moderateOutlier;

			var value, valueSet, extremeCount, moderateCount, zCount;
			for (var i = 0; i < subunits.length; i++) {
				valueSet = [];
				extremeCount = 0;
				moderateCount = 0;
				zCount = 0;

				for (var j = 0; j < periods.length; j++) {
					value = dataValue(headers, rows, de, periods[j], subunits[i], null);
					if (isNumber(value)) valueSet.push(parseFloat(value));
				}
				totalValues += valueSet.length;

				var stats = mathService.getStats(valueSet);
				var modMax = stats.mean + stats.sd * moderateLimit;
				var modMin = stats.mean - stats.sd * moderateLimit;
				var extMax = stats.mean + stats.sd * extremeLimit;
				var extMin = stats.mean - stats.sd * extremeLimit;

				for (var j = 0; j < valueSet.length; j++) {
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
					subunitExtremeNames.push(names[subunits[i]]);
				}
				if (moderateCount > 1) {
					subunitsModerate++;
					subunitModerateNames.push(names[subunits[i]]);
				}
				if (zCount > 1) {
					subunitsZscore++;
					subunitZscoreNames.push(names[subunits[i]]);
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


		/**TIME CONSISTENCY ANALYSIS*/
		/*
		 Consistency over time (completeness, indicator, data element)

		 @param callback			function to send result to
		 @param type				'constant' for average of previous periods, 'forecast' for forecast
		 @param threshold		threshold for change between current and reference period for subunits to be flagged
		 @param maxForecast		maximum forecasted value, e.g. 100 (%) for completeness forecasts
		 @param dataID			ID of dataset (for completeness), indicator, data element
		 @param coID				categoryoptioncomboid if data element detail, else null
		 @param period			reporting period
		 @param refPeriods		reference periods
		 @param ouBoundary		ID of boundary orgunit
		 @param level			level for sub-boundary orgunits
		 @returns				results object with this and more:
		 boundary consistency
		 subunit count < threshold
		 subunit percent < threshold
		 subunit names < threshold
		 */
		self.timeConsistency = function (callback, type, threshold, maxForecast, dataID, coID, period, refPeriods, ouBoundary, ouLevel) {

			var queueItem = {
				'type': 'timeConsistency',
				'parameters': {
					'callback': callback,
					'dxID': dataID,
					'coID': coID,
					'threshold': threshold,
					'type': type,
					'maxForecast': maxForecast,
					'pe': period,
					'refPe': refPeriods,
					'ouBoundary': ouBoundary,
					'ouLevel': ouLevel
				}
			};

			self.analysisQueue.push(queueItem);
			nextAnalysis();
		};


		function timeConsistencyAnalysis(parameters) {
			//Start
			self.dsci = parameters;

			//Reset
			self.dsci.boundaryData = null;
			self.dsci.subunitData = null;

			var periods = [].concat(self.dsci.refPe);
			periods.push(self.dsci.pe);

			//1 request boundary consistency data for the four years
			var requestURL = '/api/analytics.json?dimension=dx:' + self.dsci.dxID + '&dimension=ou:' + self.dsci.ouBoundary + '&dimension=pe:' + periods.join(';') + '&displayProperty=NAME';

			requestService.getSingle(requestURL).then(
				//success
				function (response) {
					self.dsci.boundaryData = response.data;
					startTimeConsistencyAnalysis();
				},
				//error
				function (response) {
					console.log("Error fetching data");
				}
			);

			//2 request subunit completeness data for the four years
			var ou = self.dsci.ouBoundary + ';LEVEL-' + self.dsci.ouLevel;
			var requestURL = '/api/analytics.json?dimension=dx:' + self.dsci.dxID + '&dimension=ou:' + ou + '&dimension=pe:' + periods.join(';') + '&displayProperty=NAME';

			requestService.getSingle(requestURL).then(
				//success
				function (response) {
					self.dsci.subunitData = response.data;
					startTimeConsistencyAnalysis();
				},
				//error
				function (response) {
					console.log("Error fetching data");
				}
			);
		}


		function startTimeConsistencyAnalysis() {
			var subunitReady = (self.dsci.subunitData !== null);
			var boundaryReady = (self.dsci.boundaryData !== null);
			if (!subunitReady || !boundaryReady) return;

			var dxID = self.dsci.dxID;
			var threshold = self.dsci.threshold;
			var type = self.dsci.type;
			var maxForecast = self.dsci.maxForecast;
			var pe = self.dsci.pe;
			var refPe = self.dsci.refPe;
			var ouBoundary = self.dsci.ouBoundary;
			var ouSubunitIDs = self.dsci.subunitData.metaData.ou;

			//reshuffle and concat the data from DHIS a bit to make is easier to use
			var headers = self.dsci.boundaryData.headers;
			var names = self.dsci.subunitData.metaData.names;
			var data = self.dsci.subunitData.rows;

			data = data.concat(self.dsci.boundaryData.rows);
			var key;
			for (key in self.dsci.boundaryData.metaData.names) {
				names[key] = self.dsci.boundaryData.metaData.names[key];
			}


			var errors = [];
			var result = {};
			var subunitsWithinThreshold = 0;
			var subunitsOutsideThreshold = 0;
			var subunitViolationNames = [];
			var subunitDatapoints = [];


			var values = [];
			for (var k = 0; k < refPe.length; k++) {
				values.push(dataValue(headers, data, dxID, refPe[k], ouBoundary, null));
			}

			//Check which years to include, based on data for boundary
			//Look at reference periods, starting from first. Remove if pe is null, pr less than a fifth of the preceeding
			while (values.length > 0 && (values[0] === null || values[0] * 5 < values[1])) {
				var droppedValue = values.shift();
				var droppedPeriod = refPe.shift();
				errors.push({
					'severity': "warning",
					'type': "Consistency over time",
					'item': names[dxID],
					'msg': "Missing data: Ignoring " + droppedPeriod + " from consistency analysis due to low completeness (" + droppedValue + ")."
				});
			}

			//Can we get consistency at all?
			if (refPe.length === 0) {
				errors.push({
					'severity': "warning",
					'type': "Consistency over time",
					'item': names[dxID],
					'msg': "Not enough reference data to calculate consistency over time."
				});

				self.dsci.callback(null, errors);

				self.inProgress = false;
				nextAnalysis();

				return;
			}


			var value, tmpVal, refValue, ratio, violation;
			value = dataValue(headers, data, dxID, pe, ouBoundary, null);
			refValue = referenceValue(values, type, maxForecast);

			result.boundaryValue = value;
			result.boundaryRefValue = mathService.round(refValue, 1);
			result.boundaryRatio = mathService.round(value / refValue, 3);
			result.boundaryPercentage = mathService.round(100 * value / refValue, 1);

			var subunit, weight, ignoreList = [];
			for (var i = 0; i < ouSubunitIDs.length; i++) {
				subunit = ouSubunitIDs[i];
				violation = false;
				weight = 0;

				value = dataValue(headers, data, dxID, pe, subunit, null);

				values = [];
				for (var k = 0; k < refPe.length; k++) {
					tmpVal = dataValue(headers, data, dxID, refPe[k], subunit, null);
					if (tmpVal) values.push(tmpVal);
				}
				refValue = referenceValue(values, type, maxForecast);

				ratio = value / refValue;
				if (!isNumber(value) || !isNumber(refValue)) {
					ignoreList.push(names[subunit]);
				}
				else if (ratio > (1 + 0.01 * threshold) || ratio < (1 - 0.01 * threshold)) {
					subunitsOutsideThreshold++;
					subunitViolationNames.push(names[subunit]);
					violation = true;
					weight = mathService.round(Math.abs(value - refValue), 0);
				}
				else {
					subunitsWithinThreshold++;
				}

				subunitDatapoints.push({
					'name': names[subunit],
					'id': subunit,
					'value': value,
					'refValue': mathService.round(refValue, 1),
					'ratio': isNumber(ratio) ? mathService.round(ratio, 3) : null,
					'violation': violation,
					'weight': weight
				});
			}
			if (ignoreList.length > 0) errors.push({
				'severity': "warning",
				'type': "Consistency over time",
				'item': names[dxID],
				'msg': "Skipped for the following units due to missing data: " + ignoreList.join(', ')
			});


			//Summarise result
			var percent = 100 * subunitsOutsideThreshold / (subunitsOutsideThreshold + subunitsWithinThreshold);
			result.subunitsWithinThreshold = subunitsWithinThreshold;
			result.subunitsOutsideThreshold = subunitsOutsideThreshold;
			result.subunitViolationPercentage = mathService.round(percent, 1);
			result.subunitViolationNames = subunitViolationNames;
			result.subunitDatapoints = subunitDatapoints;

			//Add key metadata to result
			result.pe = pe;
			result.dxID = dxID;
			result.dxName = names[dxID];
			result.type = type;
			result.threshold = threshold;

			self.dsci.callback(result, errors);

			self.inProgress = false;
			nextAnalysis();
		}


		/**DATA CONSISTENCY ANALAYSIS*/
		/*
		 Indicator consistency analysis used by Annual Review

		 @param callback			function to send result to
		 @param relation			relation object
		 @param indicatorA/B		indicator object
		 @param period			analysis period
		 @param bounaryOrgunit	ID of boundary orgunit
		 @param level			level for sub-boundary orgunits
		 @returns				relation object with results
		 */

		self.dataConsistency = function (callback, type, criteria, relationCode, dxIDa, dxIDb, period, boundaryOrgunit, level) {

			var queueItem = {
				'type': 'dataConsistency',
				'parameters': {
					'callback': callback,
					'type': type,
					'criteria': criteria,
					'relationCode': relationCode,
					'dxIDa': dxIDa,
					'dxIDb': dxIDb,
					'pe': period,
					'ouBoundary': boundaryOrgunit,
					'ouLevel': level
				}
			};

			self.analysisQueue.push(queueItem);
			nextAnalysis();
		};


		function dataConsistencyAnalysis(parameters) {
			//Start
			self.dc = parameters;

			//Reset
			self.dc.boundaryData = null;
			self.dc.subunitData = null;

			//1 request boundary data
			var requestURL = '/api/analytics.json?dimension=dx:' + self.dc.dxIDa + ';' + self.dc.dxIDb + '&dimension=ou:' + self.dc.ouBoundary + '&dimension=pe:' + self.dc.pe + '&displayProperty=NAME';

			requestService.getSingle(requestURL).then(
				//success
				function (response) {
					self.dc.boundaryData = response.data;
					startDataConsistencyAnalysis();
				},
				//error
				function (response) {
					console.log("Error fetching data");
				}
			);


			//2 request subunit data
			var requestURL = '/api/analytics.json?dimension=dx:' + self.dc.dxIDa + ';' + self.dc.dxIDb + '&dimension=ou:' + self.dc.ouBoundary + ';LEVEL-' + self.dc.ouLevel + '&dimension=pe:' + self.dc.pe + '&displayProperty=NAME';

			requestService.getSingle(requestURL).then(
				//success
				function (response) {
					self.dc.subunitData = response.data;
					startDataConsistencyAnalysis();
				},
				//error
				function (response) {
					console.log("Error fetching data");
				}
			);

		}


		function startDataConsistencyAnalysis() {
			var subunitReady = (self.dc.subunitData !== null);
			var boundaryReady = (self.dc.boundaryData !== null);
			if (!subunitReady || !boundaryReady) return;

			var dxIDa = self.dc.dxIDa;
			var dxIDb = self.dc.dxIDb;
			var type = self.dc.type;
			var criteria = self.dc.criteria;
			var relationCode = self.dc.relationCode;
			var pe = self.dc.pe;
			var ouBoundary = self.dc.ouBoundary;
			var ouSubunitIDs = self.dc.subunitData.metaData.ou;

			//reshuffle and concat the data from DHIS a bit to make is easier to use
			var headers = self.dc.boundaryData.headers;
			var names = self.dc.subunitData.metaData.names;
			var data = self.dc.subunitData.rows;

			data = data.concat(self.dc.boundaryData.rows);
			for (key in self.dc.boundaryData.metaData.names) {
				names[key] = self.dc.boundaryData.metaData.names[key];
			}

			var errors = [];
			var result = {};
			var subunitsWithinThreshold = 0;
			var subunitOutliers = 0;
			var subunitViolationNames = [];
			var subunitDatapoints = []; //needed for graphing


			var boundaryRatio, boundarySubunitRatio, valueA, valueB;
			valueA = dataValue(headers, data, dxIDa, pe, ouBoundary, null);
			valueB = dataValue(headers, data, dxIDb, pe, ouBoundary, null);

			if (!isNumber(valueA)) {
				errors.push({
					'severity': "warning",
					'type': "Consistency betweeen indicators",
					'item': names[dxIDa],
					'msg': "Missing data: consistency analysis " + names[dxIDa] + "/" + names[dxIDb] + " in " + pe + " skipped for " + names[ouBoundary] + " due to missing data."
				});
			}
			else if (!isNumber(valueB)) {
				errors.push({
					'severity': "warning",
					'type': "Consistency betweeen indicators",
					'item': names[dxIDb],
					'msg': "Missing data: consistency analysis " + names[dxIDa] + "/" + names[dxIDb] + " in " + pe + " skipped for " + names[ouBoundary] + " due to missing data."
				});
			}
			else if (type === 'do') {
				result.boundaryValueA = valueA;
				result.boundaryValueB = valueB;
				result.boundaryRatio = mathService.round(dropOutRate(valueA, valueB), 3);
				result.boundaryPercentage = mathService.round(100 * result.boundaryRatio, 1);
			}
			else {
				result.boundaryValueA = valueA;
				result.boundaryValueB = valueB;
				result.boundaryRatio = mathService.round(valueA / valueB, 3);
				result.boundaryPercentage = mathService.round(100 * result.boundaryRatio, 1);
			}

			//Get subunit values
			var ratio, subunit, ignoreList = [], violation, weight;
			for (var j = 0; j < ouSubunitIDs.length; j++) {
				subunit = ouSubunitIDs[j];
				violation = false;
				weight = 0;

				ratio = null;
				valueA = dataValue(headers, data, dxIDa, pe, subunit, null);
				valueB = dataValue(headers, data, dxIDb, pe, subunit, null);

				if (!isNumber(valueA) || !isNumber(valueB)) {
					ignoreList.push(names[subunit]);
				}
				//Drop out
				else if (type === 'do') {
					ratio = mathService.round(dropOutRate(valueA, valueB), 3);
					if (ratio < 0) {
						subunitOutliers++;
						subunitViolationNames.push(names[subunit]);
						violation = true;
						weight = valueB - valueA;
					}
					else {
						subunitsWithinThreshold++;
					}
				}
				//A > B
				else if (type === 'aGTb') {
					ratio = mathService.round(valueA / valueB, 3);
					if (ratio < (1.0 - criteria * 0.01)) {
						subunitOutliers++;
						subunitViolationNames.push(names[subunit]);
						violation = true;
						weight = valueB - valueA;
					}
					else {
						subunitsWithinThreshold++;
					}
				}
				//A = B
				else {
					ratio = mathService.round(valueA / valueB, 3);
					if (ratio > (1.0 + criteria * 0.01) || ratio < (1.0 - criteria * 0.01)) {
						subunitOutliers++;
						subunitViolationNames.push(names[subunit]);
						violation = true;
						weight = Math.abs(valueA - valueB);
					}
					else {
						subunitsWithinThreshold++;
					}
				}

				if (isNumber(ratio)) {
					subunitDatapoints.push({
						'value': valueA,
						'refValue': valueB,
						'ratio': ratio,
						'id': subunit,
						'name': names[subunit],
						'violation': violation,
						'weight': weight
					});
				}
			}

			if (ignoreList.length > 0) errors.push({
				'severity': "warning",
				'type': "Consistency betweeen indicators",
				'item': names[dxIDa] + " - " + names[dxIDb],
				'msg': "Skipped for the following units due to missing data: " + ignoreList.join(', ')
			});


			//Summarise result
			var percent = 100 * subunitOutliers / (subunitOutliers + subunitsWithinThreshold);
			result.subunitsWithinThreshold = subunitsWithinThreshold;
			result.subunitsOutsideThreshold = subunitOutliers;
			result.subunitViolationPercentage = mathService.round(percent, 1);
			result.subunitViolationNames = subunitViolationNames.sort();
			result.subunitDatapoints = subunitDatapoints;

			//Add key metadata to result
			result.dxIDa = dxIDa;
			result.dxIDb = dxIDb;
			result.dxNameA = names[dxIDa];
			result.dxNameB = names[dxIDb];
			result.pe = pe;
			result.type = type;
			result.criteria = criteria;
			result.relationCode = relationCode;


			self.dc.callback(result, errors);

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
			for (var i = 0; i < header.length; i++) {
				if (header[i].name === 'dx' && !header[i].hidden) dxi = i;
				if (header[i].name === 'ou' && !header[i].hidden) oui = i;
				if (header[i].name === 'pe' && !header[i].hidden) pei = i;
				if (header[i].name === 'co' && !header[i].hidden) coi = i;
				if (header[i].name === 'value' && !header[i].hidden) vali = i;
			}

			var data;
			for (var i = 0; i < dataValues.length; i++) {
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


		/*
		 Calculates ratio between current value and the mean or forecast of reference values.
		 @param refValues			array of reference values
		 @param currentvalue			value for current period
		 @param type					type of consistency - constant (mean) or increase/decrease (forecast)
		 @param maxVal				optional - max value for forecast (e.g. 100% for completeness)

		 @returns					ratio current/reference
		 */
		function timeConsistency(refvalues, currentvalue, type, maxVal) {
			var refVal;
			if (type && type != 'constant') {
				refVal = mathService.forecast(refvalues);
				if (maxVal && refVal > maxVal) refVal = maxVal;
			}
			else {
				refVal = mathService.getMean(refvalues);
			}
			var value = mathService.round(100 * currentvalue / refVal, 1);
			if (isNaN(value)) return null;
			else return value;
		}


		/*
		 Returns either forecast based on refValue, or mean of revalues, limited by maxVal.
		 @param refValues			array of reference values
		 @param type					type of consistency - constant (mean) or increase/decrease (forecast)
		 @param maxVal				optional - max value for forecast (e.g. 100% for completeness)

		 @returns					ratio current/reference
		 */
		function referenceValue(refValues, type, maxVal) {

			if (refValues.length === 0) return null;

			var value;
			if (type != 'constant') {
				value = mathService.forecast(refValues);
				if (maxVal && value > maxVal) value = maxVal;
			}
			else {
				value = mathService.getMean(refValues);
				if (maxVal && value > maxVal) value = maxVal;
			}
			if (isNaN(value)) return null;
			else return value;
		}


		function dropOutRate(valueA, valueB) {

			return (valueA - valueB) / valueA;


		}

		//Returns difference between current sum and what would be expected from mean of those values withing 1 SD
		function getOutlierWeight(valueSet, stats, SDlimit) {

			if (valueSet.length <= 1 || isNaN(stats.sd) || (stats.mean === 0 && stats.sd === 0)) {
				return 0;
			}

			var normCount = 0, normSum = 0, total = 0;
			for (var i = 0; i < valueSet.length; i++) {
				var value = valueSet[i];
				if (Math.abs((value - stats.mean) / stats.sd) < SDlimit) {
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
						self.requests.pending--;
						storeResponse(response);
						self.status.done++;
						self.status.progress = mathService.round(100 * self.status.done / self.status.total, 0);
					},
					//error
					function (response) {
						self.requests.pending--;
						self.status.done++;
						console.log("Error getting request");
						storeResponse(response); //TODO: Why?
						self.status.progress = mathService.round(100 * self.status.done / self.status.total, 0);
					}
				);

				request = getNextRequest();
			}

		}


		function getNextRequest() {

			for (var i = 0; i < self.requests.queue.length; i++) {
				if (!self.requests.queue[i].pending) {
					return self.requests.queue[i];
				}
			}
			return null;
		}


		function requestSucceeded(url) {
			for (var i = 0; i < self.requests.queue.length; i++) {

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
			for (var i = 0; i < self.requests.queue.length; i++) {
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
				if (status === 409 && (data.indexOf("Table exceeds") > -1)) {
					console.log("Query result too big");
					requestSucceeded(requestURL);

				}

				//No children for this boundary ou - no worries..
				else if (status === 409 && (data.indexOf("Dimension ou is present") > -1)) {
					console.log("Requested child data for a unit without children");
					requestSucceeded(requestURL);
				}

				//Probably time out - try again
				else if (status === 0) {
					console.log("Timout - retrying");
					requestFailed(requestURL);
				}

				//Unknown error
				else {
					console.log("Unknown error while fetching data: " + response.statusText);
					requestSucceeded(requestURL);
				}
			}

			else {

				//Mark item in queue as downloaded
				var requestType = requestSucceeded(requestURL);
				if (requestType != null) {
					//Queue data for processing
					self.process.queue.push({
						'type': requestType,
						'data': response.data,
						'pending': false,
						'id': ++processIndex
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

				if (data.type = "outlierGap") outlierAnalysis(data);

				data = getNextData();
			}

		}


		function getNextData() {

			for (var i = 0; i < self.process.queue.length; i++) {
				if (!self.process.queue[i].pending) {
					return self.process.queue[i];
				}
			}
			return null;
		}


		//OKAY - remove object
		function processingSucceeded(id) {
			for (var i = 0; i < self.process.queue.length; i++) {
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
			for (var i = 0; i < self.requests.queue.length; i++) {
				if (self.requests.queue[i].type === type) {
					return false;
				}
			}

			//Check if all processing is done
			for (var i = 0; i < self.process.queue.length; i++) {
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


	}]);

})();