(function(){  
	/**Service: Completeness*/
	angular.module('dataQualityApp').service('dataAnalysisService', ['requestService', 'mathService', function (requestService, mathService) {
	
	  	
		var self = this;
		self.maxPendingRequests = 3;
		
		self.analysisQueue = [];
		self.z = 0.6745;
		
		function reset() {
			self.debugCount = 0;
			self.analysisType = null;
			self.result = null;
			self.callback = null;	
			
			self.requestQueue = [];		//Queue with requests
			self.pendingRequests = 0; //Pending requests

			self.processQueue = [];		//Responses awainting processing
			self.pendingProcessing = 0; //Responses pending processing
			
			self.variables = null;
			self.periods = null;
			self.orgunits = null;
			self.parameters = null;
			
			self.inProgress = false;
		}
		
		/**ANALYSIS JOB QUEUE*/
		function nextAnalysis() {
			
			if (self.inProgress) {	
				return;
			}			
			
			
			var queueItem = self.analysisQueue.pop();
			
			if (!queueItem) {
				console.log("No more jobs in queue");
				return;
			}
			
			self.inProgress = true;
			
			if (queueItem.type === 'datasetCompleteness') {
				datasetCompletenessAnalysis(queueItem.parameters);
			}
			else if (queueItem.type === 'timeConsistency') {
				  timeConsistencyAnalysis(queueItem.parameters);
			}
			else if (queueItem.type === 'dataCompleteness') {
				dataCompletenessAnalysis(queueItem.parameters);
			}
			else if (queueItem.type === 'indicatorConsistency') {
				indicatorConsistencyAnalysis(queueItem.parameters);
			}
			else if (queueItem.type === 'indicatorOutlier') {
				indicatorOutlierAnalysis(queueItem.parameters);
			}
			else if (queueItem.type === 'dataConsistency') {
				dataConsistencyAnalysis(queueItem.parameters);
			}
			else {	
				reset();
				self.callback = queueItem.callback;
				self.variables = queueItem.variables; 
				self.periods = queueItem.periods; 
				self.orgunits = queueItem.orgunits; 
				self.parameters = queueItem.param;
				self.analysisType = queueItem.type;					

				if (self.analysisType === 'outlier') {
					resetOutlierResult();
					createOutlierRequests();
				}
			}
		}
		
		
		/** OUTLIER AND GAP ANALYSIS
		@param callback			function to send result to
		@param variables		array of data element, dataset or indicator IDs
		@param periods			array of periods in ISO format
		@param orgunits			array of orgunit IDs
		@param parameters		object with the following properties
			.outlierLimit	int		SD from mean to count as outlier
			.gapLimit		int		number of gaps/missing data to count as violation
			.OUgroup		string	ID of orgunit group for disaggregation.
			.OUlevel		int 	orgunit level for disaggregation.
			.co				bool	whether or not include categoryoptions
			.coFilter		array of strings of data element operands to include in result
		*/
		self.outlier = function (callback, variables, periods, orgunits, parameters) {
			var queueItem = {
				'callback': callback,
				'variables': variables,
				'periods': periods, 
				'orgunits': orgunits,
				'param': parameters,
				'type': 'outlier'
			};
			self.analysisQueue.push(queueItem);
			
			nextAnalysis();
		}
		
		
		function createOutlierRequests() {
			var baseRequest;
			baseRequest = '/api/analytics.json?';
			baseRequest += '&hideEmptyRows=true';
			baseRequest += '&tableLayout=true';
			baseRequest += '&dimension=pe:' + self.periods.join(';');
			
			//if many variables or categoryoptions => need to fetch one variable at the time to be safe
			var splitData;
			if (self.parameters.co) {
				baseRequest += '&dimension=co';
				baseRequest += '&columns=pe&rows=ou;dx;co';
				splitData = true;
			}
			else if (self.variables.length > 10) {
				baseRequest += '&columns=pe&rows=ou;dx';
				splitData = true;
			}
			else {
				baseRequest += '&columns=pe&rows=ou;dx';					
				splitData = false;
			}
			
			var request, requests = [];
			for (var i = 0; i < self.orgunits.length; i++) {
				request = baseRequest;
				request += '&dimension=ou:' + self.orgunits[i];
				if (self.parameters.OUgroup) {
					request += ';OU_GROUP-' + self.parameters.OUgroup;
				}
				else if (self.parameters.OUlevel) {
					request += ';LEVEL-' + self.parameters.OUlevel;					
				}
				
				
				if (splitData) {
					for (var j = 0; j < self.variables.length; j++) {
						requests.push(request + '&dimension=dx:' + self.variables[j]);
					}
				}
				else {
					requests.push(request + '&dimension=dx:' + self.variables.join(';'));
				}
			}
			
			for (var i = 0; i < requests.length; i++) {
				self.requestQueue.push({
					"url": requests[i],
					"pending": false,
					"done": false
				});
			}
			
			console.log(self.requestQueue.length + " requests in queue for this job");
			
			if (self.requestQueue.length === 0) self.inProgress = false;
			
			requestData();
		}
	
	
		function resetOutlierResult() {
		
			self.result = {
				"rows": [],
				"aggregates": {},
				"metaData": {}
			};
		}
	
		
		function outlierAnalysis(data) {
				
			var headers = data.data.headers;
			var names = data.data.metaData.names;
			var rows = data.data.rows;
			var periods = data.data.metaData.pe;
			
			var SD = self.parameters.outlierLimit;
			var maxGap = self.parameters.gapLimit;
			
			
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
			
						
			//process the actual data
			var row, value, valueSet, newRow, stats, lookForGap, gapCount, zScore;
			for (var i = 0; i < rows.length; i++) {
				row = rows[i];
				
				var dxID, filteredOut = false;
				if (self.parameters.co) {
					 dxID = row[dx] + '.' + row[co];
					 if (!self.parameters.coFilter[dxID]) filteredOut = true;
				}
				
				
				if (!filteredOut) {
					newRow = {
						"data": [],
						"metaData": {
							"ouName": names[row[ou]],
							"ouID": row[ou],
							"dxName": co != undefined ? names[row[dx]] + ' ' + names[row[co]] : names[row[dx]],
							"dxID": co != undefined ? row[dx] + '.' + row[co] : row[dx],
							"mean": undefined,
							"var": undefined,
							"maxZ": undefined,
							"sd": undefined,
							"gaps": 0,
							"outliers": 0,
							"peGap": [],
							"peOut": [],
							"gapWeight": 0,
							"outWeight": 0
						}
					};
					
					//Iterate to get all values, and look for gaps at the same time
					valueSet = [];
					for (var j = row.length-1; j >= valStart; j--) {
					
						value = row[j];
						newRow.data.unshift(value);
						
						if (isNumber(value)) {
							valueSet.push(parseFloat(value));
						}
						else {
							newRow.metaData.peGap.push(periods[periods.length - (row.length - j)]);			
							newRow.metaData.gaps++;
						}
						
					}
					
					//Calculate and store the statistical properties of the set
					stats = mathService.getStats(valueSet);
					newRow.metaData.mean = stats.mean;
					newRow.metaData.var = stats.variance;
					newRow.metaData.sd = stats.sd;
					
					newRow.metaData.maxZ = 0;
					//Look for outliers
					for (var j = row.length-1; j >= valStart; j--) {
					
						value = row[j];
						if (isNumber(value)) {
							value = parseFloat(value);
							
							//Calculate zScore
							zScore = mathService.round(100*Math.abs((value-stats.mean)/stats.sd))/100;
							if (zScore > newRow.metaData.maxZ) newRow.metaData.maxZ = zScore;
							
							//Check if outlier according to parameters
							if (zScore >= SD) {
								newRow.metaData.peOut.push(periods[periods.length - (row.length - j)]);					
								newRow.metaData.outliers++;	
							}
						}
					}
					
					//check if row should be saved or discarded
					//if (newRow.metaData.outliers > 0 || newRow.metaData.gaps >= maxGap) {
						newRow.metaData.gapWeight = Math.floor(mathService.median(valueSet)*newRow.metaData.gaps);
						newRow.metaData.outWeight = getOutlierWeight(valueSet, stats.mean, stats.sd);
						self.result.rows.push(newRow);
					//}
				}
			}
								
			//Store result and mark as done, then request more data
			data.pending = false;
			data.done = true;
			self.pendingProcessing--;	
			
			if (processingDone()) {
				outlierAggregatesAndMetaData();
			}
			else {
				processData();	
			}
		}
		
		
		function getOutlierWeight(dataValueSet, mean, sd) {
			
			if (dataValueSet.length <= 1 || isNaN(sd) || (mean === 0 && sd === 0)) {
				return 0;
			}
			
			var normCount = 0, normSum = 0, total = 0;
			for (var i = 0; i < dataValueSet.length; i++) {
				var value = dataValueSet[i];
				if (((value-mean)/sd) < 1.5) {
					normSum += value;
					normCount++;
				}
				total += value;
			}
			var normMean = normSum/normCount;
			var expectedTotal = normMean * dataValueSet.length;
			return mathService.round(total-expectedTotal);
		}
		
		
		function outlierAggregatesAndMetaData() {
			
			var ouGaps = {};
			var ouOut = {};
			var dxGaps = {};
			var dxOut = {};
			var peGaps = {};
			var peOut = {};
			
			var dxPeOut = {};

			//When iterating through all rows, make a name dictionary as well 
			var names = {};
			
			for (var i = 0; i < self.periods.length; i++) {
				peGaps[self.periods[i]] = 0;
				peOut[self.periods[i]] = 0;			
			}
			
			var meta;
			for (var i = 0; i < self.result.rows.length; i++) {
				meta = self.result.rows[i].metaData;
								
				//Get number of gaps per ou
				if (ouGaps[meta.ouID]) ouGaps[meta.ouID] += meta.gaps;
				else ouGaps[meta.ouID] = meta.gaps;

				//Get number of outliers per ou
				if (ouOut[meta.ouID]) ouOut[meta.ouID] += meta.outliers;
				else ouOut[meta.ouID] = meta.outliers;
								
				//Get number of gaps per dx
				if (dxGaps[meta.dxID]) dxGaps[meta.dxID] += meta.gaps;
				else dxGaps[meta.dxID] = meta.gaps;
				
				//Get number of outliers per dx
				if (dxOut[meta.dxID]) dxOut[meta.dxID] += meta.outliers;
				else dxOut[meta.dxID] = meta.outliers;
				
				//Get number of gaps per pe
				for (var j = 0; j < meta.peGap.length; j++) {
					//Get number of gaps per pe
					if (peGaps[meta.peGap[j]]) peGaps[meta.peGap[j]]++;
					else peGaps[meta.peGap[j]] = 1;
				}
				
				//Get number of outliers per pe
				for (var j = 0; j < meta.peOut.length; j++) {
					//Get number of outliers per pe
					if (peOut[meta.peOut[j]]) peOut[meta.peOut[j]]++;
					else peOut[meta.peOut[j]] = 1;
					
					//Get the number of outliers per dx AND pe
					
					if (dxPeOut[meta.dxID]) {
						
						dxPeOut[meta.dxID][meta.peOut[j]]++;
						
					}
					else {
						dxPeOut[meta.dxID] = {};
						
						for (var k = 0; k < self.periods.length; k++) {
							dxPeOut[meta.dxID][self.periods[k]] = 0;
						}
						
						dxPeOut[meta.dxID][meta.peOut[j]]++;
					}
					 	
				}
				
				names[meta.ouID] = meta.ouName;
				names[meta.dxID] = meta.dxName
			}
			
			self.result.aggregates = {};
			self.result.aggregates.ouGaps = ouGaps;
			self.result.aggregates.ouOut = ouOut;
			self.result.aggregates.dxGaps = dxGaps;
			self.result.aggregates.dxOut = dxOut;
			self.result.aggregates.peGaps = peGaps;
			self.result.aggregates.peOut = peOut;
			self.result.aggregates.dxPeOut = dxPeOut;
			
			self.result.metaData.names = names;
			self.result.metaData.variables = self.variables;
			self.result.metaData.periods = self.periods;
			self.result.metaData.orgunits = self.orgunits;
			self.result.metaData.parameters = self.parameters
			
			
			self.callback(self.result);
			
			self.inProgress = false;
			nextAnalysis();
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
		self.datasetCompleteness = function(callback, threshold, datasetID, period, ouBoundary, ouLevel) {
						
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
			}
			
			self.analysisQueue.push(queueItem);
			nextAnalysis();
		}
		
		
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
					function(response) {
					    self.dsco.boundaryData = response.data;	
					    startDatasetCompletenessAnalysis();				
					}, 
					//error
					function(response) {
					    console.log("Error fetching data");
					}
				);

			//2 request subunit completeness data			
			var ou;
			if (self.dsco.ouBoundary) ou = self.dsco.ouBoundary + ';LEVEL-' + self.dsco.ouLevel;
			else ou = LEVEL-self.dsco.ouLevel;
			
			var requestURL = '/api/analytics.json?dimension=dx:' + self.dsco.dsID + '&dimension=ou:' + ou + '&dimension=pe:' + self.dsco.pe + '&displayProperty=NAME';
			
			requestService.getSingle(requestURL).then(
					//success
					function(response) {
					    self.dsco.subunitData = response.data;	
					    startDatasetCompletenessAnalysis();
					}, 
					//error
					function(response) {
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
			var percent = 100*subunitsOutsideThreshold/(subunitsOutsideThreshold + subunitsWithinThreshold);
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
		self.dataCompleteness = function(callback, threshold, dataID, coID, periods, ouBoundary, ouLevel) {
			
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
			}
			
			self.analysisQueue.push(queueItem);
			nextAnalysis();
			
		}
		
		
		function dataCompletenessAnalysis(parameters) {
			self.dc = parameters;
						
			var requestURL = '/api/analytics.json?dimension=dx:' + self.dc.dxID + '&dimension=ou:' + self.dc.ouBoundary + ';LEVEL-' + self.dc.ouLevel + '&dimension=pe:' + self.dc.pe.join(';') + '&displayProperty=NAME';
			
			requestService.getSingle(requestURL).then(
					//success
					function(response) {
					    self.dc.data = response.data;	
					    startDataCompletenessAnalysis();				
					}, 
					//error
					function(response) {
					    console.log("Error fetching data");
					}
			);
			
		}
		
	
		function startDataCompletenessAnalysis() {
			
			var rows = self.dc.data.rows;
			var headers = self.dc.data.headers;
			var names = self.dc.data.metaData.names;
			
			var subunits = self.dc.data.metaData.ou;
			var periods = self.dc.data.metaData.pe;
			var dxID = self.dc.dxID;
			
			var threshold = self.dc.threshold;
			
			
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

				completeness = 100*valid/periods.length;
				if (completeness < threshold) {
					subunitViolationNames.push(names[subunits[i]]);
				 	subunitsOutsideThreshold++;
				 }
			}
			
			//Summarise result
			var result = {};
			var percent = 100*subunitsOutsideThreshold/totalSubunits;
			result.subunitsOutsideThreshold = subunitsOutsideThreshold;
			result.subunitViolationPercentage = mathService.round(percent, 1);
			result.subunitViolationNames = subunitViolationNames;
			result.boundaryValue = mathService.round(100*totalActualValues/totalExpectedValues, 1);
			
			//Include some metadata
			result.dxID = dxID;
			result.dxName = names[dxID];
			result.pe = periods;
			result.threshold = threshold;
			
			//Return			
			self.dc.callback(result);

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
		self.indicatorOutlier = function(callback, indicator, periods, boundaryOrgunit, level) {
			
			var queueItem = {
				'type': 'indicatorOutlier',
				'parameters': {
					'callback': callback,
					'indicator': indicator,
					'periods': periods,
					'boundaryOrgunit': boundaryOrgunit, 
					'level': level
				}
			}
			
			self.analysisQueue.push(queueItem);
			nextAnalysis();
			
		}
		
		function indicatorOutlierAnalysis(parameters) {
			self.io = parameters;
						
			var requestURL = '/api/analytics.json?dimension=dx:' + self.io.indicator.localData.id + '&dimension=ou:' + self.io.boundaryOrgunit + ';LEVEL-' + self.io.level + '&dimension=pe:' + self.io.periods.join(';') + '&displayProperty=NAME';
			
			requestService.getSingle(requestURL).then(
					//success
					function(response) {
					    self.io.data = response.data;	
					    startIndicatorOutlierAnalysis();				
					}, 
					//error
					function(response) {
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
						
			var valueSet, extremeCount, moderateCount, zCount;
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
				var modMax = stats.mean + stats.sd*moderateLimit;
				var modMin = stats.mean - stats.sd*moderateLimit;
				var extMax = stats.mean + stats.sd*extremeLimit;
				var extMin = stats.mean - stats.sd*extremeLimit;
				
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
					if ((self.z*(valueSet[j]-stats.median)/stats.MAD) > 3.5) {
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
			
			
			self.io.indicator.boundaryExtreme = mathService.round(100*totalExtremeOutliers/totalValues, 1);
			self.io.indicator.countExtreme = subunitsExtreme;
			self.io.indicator.percentExtreme = mathService.round(100*subunitsExtreme/subunits.length, 1);
			self.io.indicator.namesExtreme = subunitExtremeNames.sort();
			
			self.io.indicator.boundaryModerate = mathService.round(100*totalModerateOutliers/totalValues, 1);
			self.io.indicator.countModerate = subunitsModerate;
			self.io.indicator.percentModerate = mathService.round(100*subunitsModerate/subunits.length, 1);
			self.io.indicator.namesModerate = subunitModerateNames.sort();
			
			self.io.indicator.boundaryZscore = mathService.round(100*totalZscoreOutliers/totalValues, 1);
			self.io.indicator.countZscore = subunitsZscore;
			self.io.indicator.percentZscore = mathService.round(100*subunitsZscore/subunits.length, 1);
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
		self.timeConsistency = function(callback, type, threshold, maxForecast, dataID, coID, period, refPeriods, ouBoundary, ouLevel) {
						
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
			}
			
			self.analysisQueue.push(queueItem);
			nextAnalysis();
		}
		
		
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
					function(response) {
					    self.dsci.boundaryData = response.data;	
					    startTimeConsistencyAnalysis();				
					}, 
					//error
					function(response) {
					    console.log("Error fetching data");
					}
				);

			//2 request subunit completeness data for the four years			
			var ou = self.dsci.ouBoundary + ';LEVEL-' + self.dsci.ouLevel;			
			var requestURL = '/api/analytics.json?dimension=dx:' + self.dsci.dxID + '&dimension=ou:' + ou + '&dimension=pe:' + periods.join(';') + '&displayProperty=NAME';
			
			requestService.getSingle(requestURL).then(
					//success
					function(response) {
					    self.dsci.subunitData = response.data;	
					    startTimeConsistencyAnalysis();
					}, 
					//error
					function(response) {
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
			while (values.length > 0 && (values[0] === null || values[0]*5 < values[1])) {
				var droppedValue = values.shift();
				var droppedPeriod = refPe.shift();
				errors.push({'type': "warning", 'type': "Consistency over time", 'item': names[dxID], 'msg': "Missing data: Ignoring " + droppedPeriod + " from consistency analysis due to low completeness (" + droppedValue + ")."});
			}
			
			//Can we get consistency at all?
			if (refPe.length === 0) {
				errors.push({'type': "warning", 'type': "Consistency over time", 'item': names[dxID], 'msg': "Not enough reference data to calculate consistency over time."});

				self.dsci.callback(null, errors);

				self.inProgress = false;
				nextAnalysis();

				return;				
			}
			
			
			var value, refValue, ratio;
			value = dataValue(headers, data, dxID, pe, ouBoundary, null);
			refValue = referenceValue(values, type, maxForecast);
			
			result.boundaryValue = value;
			result.boundaryRefValue = mathService.round(refValue, 1);
			result.boundaryRatio = mathService.round(value/refValue, 3);
			result.boundaryPercentage = mathService.round(100*value/refValue, 1);
			
			var subunit, ignoreList = [];
			for (var i = 0; i < ouSubunitIDs.length; i++) {
				subunit = ouSubunitIDs[i];
				
				value = dataValue(headers, data, dxID, pe, subunit, null);
				
				values = [];
				for (var k = 0; k < refPe.length; k++) {
					values.push(dataValue(headers, data, dxID, refPe[k], subunit, null));
				}				
				refValue = referenceValue(values, type, maxForecast);
				
				ratio = value/refValue;
				if (!isNumber(value) || !isNumber(refValue)) {
					ignoreList.push(names[subunit]);
				}
				else if (ratio > (1+0.01*threshold) || ratio < (1-0.01*threshold)) {
					subunitsOutsideThreshold++;
					subunitViolationNames.push(names[subunit]);
				} 
				else {
					subunitsWithinThreshold++;
				}
								
				subunitDatapoints.push({
					'name': names[subunit],
					'id': subunit,
					'value': value,
					'refValue': mathService.round(refValue, 1),
					'ratio': mathService.round(ratio, 3)
				});
			}
			if (ignoreList.length > 0)  errors.push({'type': "warning", 'type': "Consistency over time", 'item': names[dxID], 'msg': "Skipped for the following units due to missing data: " + ignoreList.join(', ')});
									
			
			//Summarise result
			var percent = 100*subunitsOutsideThreshold/(subunitsOutsideThreshold + subunitsWithinThreshold);
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
		
		self.dataConsistency = function(callback, type, criteria, relationCode, dxIDa, dxIDb, period, boundaryOrgunit, level) {
						
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
			}
			
			self.analysisQueue.push(queueItem);
			nextAnalysis();
		}
		
		
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
					function(response) {
					    self.dc.boundaryData = response.data;	
					    startDataConsistencyAnalysis();				
					}, 
					//error
					function(response) {
					    console.log("Error fetching data");
					}
				);
			
			
			//2 request subunit data
			var requestURL = '/api/analytics.json?dimension=dx:' + self.dc.dxIDa + ';' + self.dc.dxIDb + '&dimension=ou:' + self.dc.ouBoundary + ';LEVEL-' + self.dc.ouLevel + '&dimension=pe:' + self.dc.pe + '&displayProperty=NAME';
			
			requestService.getSingle(requestURL).then(
					//success
					function(response) {
					    self.dc.subunitData = response.data;	
					    startDataConsistencyAnalysis();
					}, 
					//error
					function(response) {
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
				errors.push({'type': "warning", 'type': "Consistency betweeen indicators", 'item': names[dxIDa], 'msg': "Missing data: consistency analysis " + names[dxIDa] + "/" + names[dxIDb] + " in " + pe + " skipped for " + names[ouBoundary] + " due to missing data."});
			}			
			else if (!isNumber(valueB)) {
				errors.push({'type': "warning", 'type': "Consistency betweeen indicators", 'item': names[dxIDb], 'msg': "Missing data: consistency analysis " + names[dxIDa] + "/" + names[dxIDb] + " in " + pe + " skipped for " + names[ouBoundary] + " due to missing data."});			
			}
			else if (type === 'do') {
				result.boundaryValueA = valueA;
				result.boundaryValueB = valueB;
				result.boundaryRatio = mathService.round(dropOutRate(valueA, valueB), 3);
				result.boundaryPercentage = mathService.round(100*result.boundaryRatio, 1);
			}
			else {
				result.boundaryValueA = valueA;
				result.boundaryValueB = valueB;
				result.boundaryRatio = mathService.round(valueA/valueB, 3);
				result.boundaryPercentage = mathService.round(100*result.boundaryRatio, 1);
			}
			
			//Get subunit values
			var ratio, subunit, ignoreList = [];
			for (var j = 0; j < ouSubunitIDs.length; j++) {
				subunit = ouSubunitIDs[j];
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
					}
					else {
						subunitsWithinThreshold++;
					}
				}
				//A > B
				else if (type === 'aGTb') {
					ratio = mathService.round(valueA/valueB, 3);
					if (ratio < (1.0-criteria*0.01)) {
						subunitOutliers++;
						subunitViolationNames.push(names[subunit]);
					}
					else {
						subunitsWithinThreshold++;
					}
				}
				//A = B
				else {
					ratio = mathService.round(100*valueA/valueB, 1);
					if (ratio > (1.0+criteria*0.01) || ratio < (1.0-criteria*0.01)) {
						subunitOutliers++;
						subunitViolationNames.push(names[subunit]);
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
						'name': names[subunit]
					});
				}
			}
			
			if (ignoreList.length > 0) errors.push({'type': "warning", 'type': "Consistency betweeen indicators", 'item': names[dxIDa] + " - " + names[dxIDb], 'msg': "Skipped for the following units due to missing data: " + ignoreList.join(', ')});
			
			
			//Summarise result
			var percent = 100*subunitOutliers/(subunitOutliers + subunitsWithinThreshold);
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
			var value = mathService.round(100*currentvalue/refVal, 1);
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
			var value;
			if (type === 'forecast') {
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
			
			return (valueA - valueB)/valueA;
		
		
		}
		
		
		/** DATA REQUESTS QUEUING */
		function requestData() {
			var request = getNextRequest();
			while (request && self.pendingRequests < self.maxPendingRequests) {
				
				self.pendingRequests++;
				request.pending = true;
				requestService.getSingle(request.url).then(
					//success
					function(response) {
					    self.pendingRequests--;
					    storeResponse(response);
					}, 
					//error
					function(response) {
					    self.pendingRequests--;
					    storeResponse(response);
					}
				);
				
				request = getNextRequest();
			}
		}
		
	
		function getNextRequest() {
			for (var i = 0; i < self.requestQueue.length; i++) {
				if (!self.requestQueue[i].pending && !self.requestQueue[i].done) {
					return self.requestQueue[i];
				}
			}
			return null;
		}
		
		
		function markRequestAsComplete(url) {
			for (var i = 0; i < self.requestQueue.length; i++) {
				if (url.indexOf(self.requestQueue[i].url) > -1) {
					self.requestQueue[i].done = true;
					self.requestQueue[i].pending = false;
					return true;
				}
			}
			return false;
		}
			
		
		function storeResponse(response) {
			
			var data = response.data;
			var requestURL = response.config.url;
			
			var status = response.status;
			if (status != 200) {
				//TODO: if too many values, split.. Make sure we don't get same data twice, if selections on multiple levels => self.orgunits = self.orgunit.children...
				if (status === 409 && (data.indexOf("Table exceeds") > -1)) {
					self.callback(null);
				}
				else {
					console.log("Error fetching data: " + response.statusText);
					self.callback(null);
				}
			}
			else {
				//Mark item in queue as downloaded - discard if not there (which means it stems from different request
				if (!markRequestAsComplete(response.config.url)) {
					requestData();
					return;
				}
				
				//fetch more data
				requestData();				
				
				//Queue data for processing
				self.processQueue.push({
					'data': response.data,
					'pending': false,
					'done': false
				});
				
				processData();
			}
		}
		
		
		function processData() {
			
			var data = getNextData();
			while (data && self.pendingProcessing < 1) {
				
				data.pending = true;
				self.pendingProcessing++;
								
				//TODO: check analysis type and forward to right method
				if (self.type = "outlier") outlierAnalysis(data);
								

				data = getNextData();
			}
			
		}
		
	
		function getNextData() {
			for (var i = 0; i < self.processQueue.length; i++) {
				if (!self.processQueue[i].pending && !self.processQueue[i].done) {
					return self.processQueue[i];
				}
			}
			return null;
		}
		
		
		function processingDone() {
						
			//Check if all requests are done
			for (var i = 0; i < self.requestQueue.length; i++) {
				if (!self.requestQueue[i].done) return false;
			}
			
			for (var i = 0; i < self.processQueue.length; i++) {
				if (!self.processQueue[i].done) return false;
			}
			
			return true;
		
		}
		
		
		/** UTILITIES*/
		function isNumber(number) {
			
			return !isNaN(parseFloat(number));
		
		}
		
		
	
	}]);
	
})();