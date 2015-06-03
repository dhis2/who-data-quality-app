(function(){  
	/**Service: Completeness*/
	angular.module('dataQualityApp').service('dataAnalysisService', ['requestService', 'mathService', function (requestService, mathService) {
	
	  	
		var self = this;
		self.maxPendingRequests = 3;
		
		self.analysisQueue = [];
		
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
		
		
		function nextAnalysis() {
			
			if (self.inProgress) {
				console.log("Analysis job already in progress.");	
				return;
			}			
			
			
			var queueItem = self.analysisQueue.pop();
			
			if (!queueItem) {
				console.log("No more jobs in queue");
				return;
			}
			
			console.log("Doing next analysis job");
			self.inProgress = true;
			
			if (queueItem.type === 'indicatorCompleteness') {
				indicatorCompletenessAnalysis(queueItem.parameters);
			}
			else if (queueItem.type === 'datasetCompleteness') {
				datasetCompletenessAnalysis(queueItem.parameters);
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
							zScore = Math.round(100*Math.abs((value-stats.mean)/stats.sd))/100;
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
						newRow.metaData.gapWeight = Math.floor(median(valueSet)*newRow.metaData.gaps);
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
		
		
		function median(values) {
			
			values.sort( function(a,b) {return a - b;} );
			
		    var half = Math.floor(values.length/2);
		
		    if(values.length % 2) return values[half];
		    else return (values[half-1] + values[half]) / 2.0;
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
			return Math.round(total-expectedTotal);
		}
		
		
		function outlierAggregatesAndMetaData() {
			
			console.log("Summarising");
			
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
			
			console.log("Returning");
			
			self.callback(self.result);
			
			self.inProgress = false;
			nextAnalysis();
		}				
		
		
		/** CONSISTENCY ANALYSIS
		
		
		
		*/
		self.consistencyAnalysis = function () {}
			
		
		
		
		/** COMPLETENESS ANALYSIS
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
		self.datasetCompleteness = function(callback, datasets, period, refPeriods, boundaryOrgunit, level) {
						
			var queueItem = {
				'type': 'datasetCompleteness',
				'parameters': {
					'callback': callback,
					'datasets': datasets,
					'period': period,
					'refPeriods': refPeriods,
					'boundaryOrgunit': boundaryOrgunit, 
					'level': level
				}
			}
			
			self.analysisQueue.push(queueItem);
			nextAnalysis();
		}
		
		
		function datasetCompletenessAnalysis(parameters) {
			//Start
			self.dsc = parameters;
			
			//Reset
			self.boundaryCompleteness = null;
			self.subunitCompleteness = null;
									
			//periods to request
			self.dsc.refPeriods = self.dsc.refPeriods.sort(function(a, b){return a-b});
			var pe = [].concat(self.dsc.refPeriods);
			pe.push(self.dsc.period);
			
			//datasets to request
			var ds = [];
			for (var i = 0; i < self.dsc.datasets.length; i++) {
				ds.push(self.dsc.datasets[i].id);
			}
			
			//1 request boundary completeness data for the four years
			var requestURL = '/api/analytics.json?dimension=dx:' + ds.join(';') + '&dimension=ou:' + self.dsc.boundaryOrgunit + '&dimension=pe:' + pe.join(';') + '&displayProperty=NAME';
			
			requestService.getSingle(requestURL).then(
					//success
					function(response) {
					    self.boundaryCompleteness = response.data;	
					    startDatasetCompletenessAnalysis();				
					}, 
					//error
					function(response) {
					    console.log("Error fetching data");
					}
				);
			
			
			//2 request subunit completeness data for the four years
			var requestURL = '/api/analytics.json?dimension=dx:' + ds.join(';') + '&dimension=ou:' + self.dsc.boundaryOrgunit + ';LEVEL-' + self.dsc.level + '&dimension=pe:' + pe.join(';') + '&displayProperty=NAME';
			
			requestService.getSingle(requestURL).then(
					//success
					function(response) {
					    self.subunitCompleteness = response.data;	
					    startDatasetCompletenessAnalysis();
					}, 
					//error
					function(response) {
					    console.log("Error fetching data");
					}
				);
			
		}
				
		
		function startDatasetCompletenessAnalysis() {
			if (self.boundaryCompleteness === null || self.subunitCompleteness === null) return;
			else console.log("Received required dataset completeness data - start analysis");
			
			var year = self.dsc.period;
			var refYears = self.dsc.refPeriods;
			var boundary = self.dsc.boundaryOrgunit;
			var subunits = self.subunitCompleteness.metaData.ou;
			var data = self.boundaryCompleteness.rows.concat(self.subunitCompleteness.rows);
			var headers = self.boundaryCompleteness.headers;

			var names = self.subunitCompleteness.metaData.names;
			for (key in self.boundaryCompleteness.metaData.names) {
				names[key] = self.boundaryCompleteness.metaData.names[key];
			}
			
			
			var ds;
			var value;
			for (var i = 0; i < self.dsc.datasets.length; i++) {
				ds = self.dsc.datasets[i];
				
				
				//1 data set completeness
				var subunitsAbove = 0;
				var subunitsBelow = 0;
				var subunitNames = [];
				
				//Get boundary value
				ds.boundary = dataValue(headers, data, ds.id, year, boundary, null);
				
				//Get subunit values
				for (var j = 0; j < subunits.length; j++) {
					value = dataValue(headers, data, ds.id, year, subunits[j], null);
					if (value) {
						if (value > ds.threshold) subunitsAbove++;
						else {
							subunitsBelow++;
							subunitNames.push(names[subunits[j]]);						
						}
					}
					//else not expected to report
				}
				//Summarise			
				ds.count = subunitsBelow;
				ds.percent = 100*subunitsBelow/(subunitsBelow + subunitsAbove);
				ds.percent = Math.round(ds.percent*10)/10;
				ds.names = subunitNames;
				
				
				
				
				//2 dataset completeness consistency over time
				subunitsAbove = 0;
				subunitsBelow = 0;
				subunitNames = [];
				
				var values = [];
				for (var k = 0; k < refYears.length; k++) {
					values.push(dataValue(headers, data, ds.id, refYears[k], boundary, null));
				}	
				ds.boundaryTrend = timeConsistency(values, ds.boundary, ds.trend);
				
				//Get subunit values
				for (var j = 0; j < subunits.length; j++) {
					
					var values = [], trend;
					for (var k = 0; k < refYears.length; k++) {
						values.push(dataValue(headers, data, ds.id, refYears[k], boundary, null));
					}
					trend = timeConsistency(values, dataValue(headers, data, ds.id, year, subunits[j], null), ds.trend);
					
					if (trend > (100 + ds.consistencyThreshold) || trend < (100-ds.consistencyThreshold)) {
						subunitsBelow++;
						subunitNames.push(names[subunits[j]]);						
					}
					else {
						subunitsAbove++;
					}				
				}
				
				//Summarise			
				ds.countTrend = subunitsBelow;
				ds.percentTrend = round(100*subunitsBelow/(subunitsBelow + subunitsAbove),1);
				ds.namesTrend = subunitNames;
				
				
			}
			
			self.dsc.callback(self.dsc.datasets);
			
			self.inProgress = false;
			nextAnalysis();
		}
		
		
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
		self.indicatorCompleteness = function(callback, indicator, periods, boundaryOrgunit, level) {
			
			var queueItem = {
				'type': 'indicatorCompleteness',
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
		
		function indicatorCompletenessAnalysis(parameters) {
			self.ic = parameters;
						
			var requestURL = '/api/analytics.json?dimension=dx:' + self.ic.indicator.localData.id + '&dimension=ou:' + self.ic.boundaryOrgunit + ';LEVEL-' + self.ic.level + '&dimension=pe:' + self.ic.periods.join(';') + '&displayProperty=NAME';
			
			requestService.getSingle(requestURL).then(
					//success
					function(response) {
					    self.ic.data = response.data;	
					    startIndicatorCompletenessAnalysis();				
					}, 
					//error
					function(response) {
					    console.log("Error fetching data");
					}
			);
			
		}
		
		
		
		function startIndicatorCompletenessAnalysis() {
			
			
			var rows = self.ic.data.rows;
			var headers = self.ic.data.headers;
			var subunits = self.ic.data.metaData.ou;
			var periods = self.ic.data.metaData.pe;
			var names = self.ic.data.metaData.names;
			
			var totalExpected = subunits.length * periods.length;
			var totalValues = 0;
			
			var totalDistricts = subunits.length;
			var subunitsBelow = 0;
			var subunitNames = [];

			var de = self.ic.indicator.localData.id;
			var threshold = self.ic.indicator.missing;
			
			var valid, value, completeness;
			for (var i = 0; i < subunits.length; i++) {
				
				valid = 0;
				for (var j = 0; j < periods.length; j++) {
					
					value = dataValue(headers, rows, de, periods[j], subunits[i], null);
					if (isNumber(value) && parseFloat(value) != 0) valid++;
					
				}
				 totalValues += valid;

				 completeness = 100*valid/periods.length;
				 if (completeness < threshold) {
				 	subunitNames.push(names[subunits[i]]);
				 	subunitsBelow++;
				 }
			}
			
			self.ic.indicator.boundary = round(100*totalValues/totalExpected, 1);
			self.ic.indicator.count = subunitsBelow;
			self.ic.indicator.percent = round(100*subunitsBelow/subunits.length, 1);
			self.ic.indicator.names = subunitNames;
			
			self.ic.callback(self.ic.indicator);
			self.inProgress = false;
			nextAnalysis();
		}
		
		
		
		
		
		/*
		Calculates ratio between current value and the mean or forecast of reference values. Forecast is set to max = 100, e.g. for use with completeness or indicators
		
		@param refValues			array of reference values
		@param currentvalue			value for current period
		@param type					type of consistency - constant (mean) or increase/decrease (forecast)
		
		@returns					ratio current/reference
		*/
		function timeConsistency(refvalues, currentvalue, type) {
			var refVal;
			if (type && type != 'constant') {
				refVal = forecast(refvalues);
				if (refVal > 100) refVal = 100; //Complenetess = max 100%
				if (refVal < refvalues[1] && refVal < refvalues[2]) {
					console.log("Ignored first year of completenesss, too low: " + refvalues.shift());
					refVal = forecast(refvalues);
		
				}				
			}
			else {
				refVal = mean(refvalues);
				
				if (refVal < refvalues[1] && refVal < refvalues[2]) {
					console.log("Ignored first year of completenesss, too low: " + refvalues.shift());
					refVal = mean(refvalues);
				}
			}

			return round(100*currentvalue/refVal, 1);
		}
		
		
		
		
		/*
		@param values			array of values
		
		@returns				mean of values, excluding null values
		*/
		function mean(values) {
			var valueCount = 0;
			var sum = 0;
			for (var i = 0; i < values.length; i++) {
				if (values[i]) {
					valueCount++;
					sum += parseFloat(values[i]);
				}
			}
			
			return (sum/valueCount);
		}
		
		/*
		@param values			array of preceding values (time trend)
		
		@returns				forecasted value based on change across years
		*/		
		function forecast(values) {
		
			var i, points = [];
			for (i = 0; i < values.length; i++) {
				if (values[i]) points.push([i, parseFloat(values[i])]);
				else points.push([i, null]);
			}
			var forecast = regression('linear', points);
			return forecast.equation[0]*i + forecast.equation[1];
		}
		
		/*
		@param value			value to round
		@param decimals			number of decimals to include
		
		@returns				value rounded to given decimals
		*/
		function round(value, decimals) {
			var factor = Math.pow(10,decimals);
			return Math.round(value*factor)/factor;
			
		}
		
		
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
		
		
		
		/** DATA REQUESTS AND QUEUING */
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
		
		
		/** UTILITIES
		
		*/
		function isNumber(number) {
			
			return !isNaN(parseFloat(number));
		
		}
				
		return self;
	
	}]);
	
})();