(function(){  
	/**Service: Completeness*/
	angular.module('completenessAnalysis').service('completenessDataService', function (mathService, metaDataService, periodService, requestService) {
		
		var self = this;
		
		resetParameters();
			
		function resetParameters() {

			self.result = {
				'headers': [],
				'metaData': {
					'type': "",
					'totalRows': 0,
					'outlierRows': 0,
					'outlierValues': 0,
					'data': null,
					'period': null,
					'parameters': null
					},
				'rows': []
			};
			
			self.remainingRequests = 0;
			self.remainingResults = 0;
			self.pending = 0;
			self.maxPending = 1;
			self.requestQueue = [];
		}
		
		self.analyseData = function (data, period, orgunit, parameters) {
			
			resetParameters();
			self.result.metaData.data = data;
			self.result.metaData.period = period;
			self.result.metaData.orgunit = orgunit;
			self.result.metaData.parameters = parameters;
			self.result.metaData.type = parameters.analysisType;
			
			var variables = data.dataIDs;
			var periods = periodService.getISOPeriods(period.startDate, period.endDate, period.periodType);		
			
			
		
			if (data.details || variables.length > 10) {
				for (var i = 0; i < variables.length; i++) {
					var requestURL = "/api/analytics.json?";
					requestURL += "dimension=dx:" + variables[i];
					requestURL += "&dimension=ou:" + IDsFromObjects(orgunit.boundary).join(';');
					
					if (orgunit.disaggregationType != 'none') {
						requestURL += ';' + orgunit.disaggregationID;		
					}
					
					requestURL += "&dimension=pe:" + periods.join(";");
					
					if (data.details) {
						requestURL += '&dimension=co';
					}
					
					//requestURL += '&ignoreLimit=true';
					requestURL += '&hideEmptyRows=true';
					requestURL += '&tableLayout=true';
					requestURL += '&columns=pe&rows=ou;dx';
					
					if (data.details) {
						requestURL += ';co';
					}
					
					self.remainingResults++;
					self.remainingRequests++;
					
					self.requestQueue.push(requestURL);
				}	
				requestQueue();
			}
			else {
				var requestURL = "/api/analytics.json?";
				requestURL += "dimension=dx:" + variables.join(';');
				requestURL += "&dimension=ou:" + IDsFromObjects(orgunit.boundary).join(';');
				
				if (orgunit.disaggregationType != 'none') {
					requestURL += ';' + orgunit.disaggregationID;		
				}
				
				requestURL += "&dimension=pe:" + periods.join(";");
				
				if (data.details) {
					requestURL += '&dimension=co';
				}
				
				//requestURL += '&ignoreLimit=true';
				requestURL += '&hideEmptyRows=true';
				requestURL += '&tableLayout=true';
				requestURL += '&columns=pe&rows=ou;dx';
				
				if (data.details) {
					requestURL += ';co';
				}
						
	
				
				self.remainingResults++;
				self.remainingRequests++;
				
				requestService.getSingle(requestURL).then(function(response) { 
					
					self.remainingRequests--;
					resultsAnalysis(response.data);
					
				});	
			
			}
			
		};
		
		
		function requestQueue() {
			
			while (self.pending < self.maxPending && self.requestQueue.length > 0) {
				
				self.pending++;
				
				requestService.getSingle(self.requestQueue.pop()).then(function(response) { 
					
					self.remainingRequests--;
					self.pending--;
					requestQueue();
					
					resultsAnalysis(response.data);
				});
								
			}
		}
		
		
		
		function getVariables(data) {			
			var dataObjects = [];
			if (data.dataSets) {
				dataObjects.push(data.dataSets);
			}
			if (data.dataElements) {
				dataObjects.push(data.dataElements);
			}
			if (data.indicators) {
				dataObjects.push(data.indicators);
			}
			
			return dataObjects;
		}
		
		function uniqueArray(array) {
		    var seen = {};
		    return array.filter(function(item) {
		        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
		    });
		}
	
		
		function requestFromURL(requestURL) {

			var matches = null;
			for (var i = 0; i < self.requests.length; i++) {
				if (requestURL.indexOf(self.requests[i].URL) > -1) {
					return self.requests[i];
				}
			}
			console.log("Error");	
			return -1;
		}
		
		
		
		function IDsFromObjects(array) {
			
			var idArray = [];
			for (var i = 0; i < array.length; i++) {
				idArray.push(array[i].id);
			}
			return idArray;
		}
		
		
		function filterArrayIndices(array, indicesToKeep) {
			var newArray = [];
			for (var i = 0; i < indicesToKeep.length; i++) {
				newArray.push(array[indicesToKeep[i]]);
			}
			
			return newArray;
		}
		
		
		
		self.updateAnalysis = function(originalMetaData, orgunits) {
			var data = originalMetaData.data;
			var period = originalMetaData.period;
			var orgunit = originalMetaData.orgunit;
			var parameters = originalMetaData.parameters;								
					
			orgunit.boundary = orgunits;
			orgunit.disaggregationType = 'none';
			
			self.analyseData(data, period, orgunit, parameters);
		}
		
		
		
		function resultsAnalysis(data) {
			
			var old_time = new Date();
			var periodType = self.result.metaData.period.periodType;
			
			var details = self.result.metaData.data.details;
			var coFilter = self.result.metaData.data.coFilter;
						
			var headers = data.headers;
			var dataIndices = [], headerIndices = [];
			var orgunitIDColumn = 0;
			var orgunitNameColumn = 0;
			var dataIDColumn = 0;
			var dataNameColumn = 0;
			var coIDColumn = -1;
			var coNameColumn = -1;

			for (var i = 0; i < headers.length; i++) {
				if (headers[i].meta === false) dataIndices.push(i);

				if (headers[i].column === 'organisationunitid') orgunitIDColumn = i;
				if (headers[i].column === 'organisationunitname') orgunitNameColumn = i;
				
				if (headers[i].column === 'dataid') dataIDColumn = i;
				if (headers[i].column === 'dataname') dataNameColumn = i;
				
				if (headers[i].column === 'categoryoptioncomboid') coIDColumn = i;
				if (headers[i].column === 'categoryoptioncomboname') coNameColumn = i;
				
				if (!headers[i].hidden && headers[i].column != 'categoryoptioncomboname') headerIndices.push(i);
			}
			
			//Fix names of periods
			headers = filterArrayIndices(headers, headerIndices);
			for (var i = 0; i < headers.length; i++) {
				if (headers[i].meta === false) { // = period
					headers[i].id = headers[i].name;
					headers[i].name = periodService.shortPeriodName(headers[i].name);
				}
			}
			
			
			var rows = [], row, sourceRow;
			for (var i = 0; i < data.rows.length; i++) {
				sourceRow = data.rows[i];

				row = {};
				
				//If applicable, check if part of combos we are interested in
				var operandID = sourceRow[dataIDColumn] + '.' + sourceRow[coIDColumn];
				
				var dataName = sourceRow[dataNameColumn];
				if (details) dataName += ' ' + sourceRow[coNameColumn];
				if (details && !coFilter[operandID]) {
				
				
				}
				else {			
					row.metaData = {
							'ou': sourceRow[orgunitIDColumn],
							'ouName': sourceRow[orgunitNameColumn],
							'dx': operandID,
							'dxName': dataName,
							'hasOutlier': false,
							'lowLimit': null,
							'highLimit': null,
							'gaps': 0
						};
						
					row.data = filterArrayIndices(sourceRow, dataIndices);
					row.data.unshift(dataName);	
					row.data.unshift(sourceRow[orgunitNameColumn]);			
					rows.push(row);
				}
			}
						
			
			switch (self.result.metaData.type) {
				case 'gap':
					headers.push({'name': "Gaps", 'column': 'gaps', 'type': 'java.lang.Double', 'hidden': false, 'meta': true});
					headers.push({'name': "Weight", 'column': 'weight', 'type': 'java.lang.Double', 'hidden': false, 'meta': true});
					break;
				
				case 'outlier':	
					headers.push({'name': "Z-Score", 'column': 'zscore', 'type': 'java.lang.Double', 'hidden': false, 'meta': true});
					headers.push({'name': "Weight", 'column': 'weight', 'type': 'java.lang.Double', 'hidden': false, 'meta': true});
					break;
				default:
					headers.push({'name': "Outliers", 'column': 'outliers', 'type': 'java.lang.Double', 'hidden': false, 'meta': true});
					break;
			}
			
			
			//TODO: performance measure
			
			
			//Outlier analysis	
			var value, mean, variance, maxZscore, standardDeviation, noDevs, highLimit, lowLimit, hasOutlier, outlierCount = 0, violationCount = 0, rowViolations;
			if (self.result.metaData.type === 'outlier' || self.result.metaData.type === 'threshold') {			
				for (var i = 0; i < rows.length; i++) {
					valueSet = [];
					row = rows[i];
					
					if (self.result.metaData.type === 'outlier') {
						maxZscore = 0;
						for (var j = 2; j < row.data.length; j++) {
							value = row.data[j];
							if (value != '') {
								valueSet.push(parseFloat(value));
							}
						}
					
						mean = mathService.getMean(valueSet); 
						variance = mathService.getVariance(valueSet);
						standardDeviation = mathService.getStandardDeviation(valueSet);
						noDevs = parseFloat(self.result.metaData.parameters.stdDev);
						highLimit = Math.round((mean + noDevs*standardDeviation) * 10) / 10;
						lowLimit = Math.round((mean - noDevs*standardDeviation) * 10) / 10;
						if (lowLimit < 0) lowLimit = 0;
					
					}
					else { //threshold - min and max already set
						lowLimit = self.result.metaData.parameters.thresholdLow;
						highLimit = self.result.metaData.parameters.thresholdHigh;
					}
						
					row.metaData.lowLimit = lowLimit;
					row.metaData.highLimit = highLimit;
					
					rowViolations = 0;
					hasOutlier = false;
					for (var j = 2; j < row.data.length; j++) {
						value = row.data[j];
						if (value != '') {
							if (value > highLimit || value < lowLimit) {
								hasOutlier = true;
								rowViolations++;
							}
							if (self.result.metaData.type === 'outlier') {
								zScore = ((parseFloat(value)-mean)/standardDeviation);
								if (Math.abs(zScore) > maxZscore) maxZscore = Math.abs(zScore);
							}		
						}
					}
					
					if (self.result.metaData.type != 'outlier') {
						row.data.push(rowViolations);
					}
					else {
						row.data.push(Math.round(maxZscore*10)/10);
						
						var weight = 1;
						if (maxZscore > 3) {
							weight = 1.6;
						}
						else if (maxZscore > 2.5) {
							weight = 1.4;
						}
						
						else if (maxZscore > 2) {
							weight = 1.2;
						}
						
						
						row.data.push(Math.round(mean*maxZscore*weight/10));
					}
					
					violationCount += rowViolations;
					row.metaData.hasOutlier = hasOutlier;
					if (hasOutlier) outlierCount++;
				}
			}
			
			
			//Gap analysis
			else {
				var gaps;
				for (var i = 0; i < rows.length; i++) {
					row = rows[i];
					gaps = 0;
					rowViolations = 0;
					valueSet = [];
					
					for (var j = 2; j < row.data.length; j++) {
						value = row.data[j];
						if (value === "") {
							gaps++;
							rowViolations++;
						}
						else {
							valueSet.push(parseFloat(value));
						}
					}
					mean = mathService.getMean(valueSet);
					
					row.data.push(rowViolations);
					row.data.push(parseInt(mean*rowViolations));
					violationCount += rowViolations;
					
					if (gaps >= self.result.metaData.parameters.maxGaps) {
						row.metaData.hasOutlier = true;
					}
					if (row.metaData.hasOutlier) outlierCount++;
					
				}				
			}
			var new_time = new Date();
			console.log("Time for analysis: " + (new_time - old_time));
			
			addResultPart({
				'totalRows': rows.length,
				'outlierRows': outlierCount,
				'outlierValues': violationCount,
				}, headers, rows);
			
		}
		
		function addResultPart(metaData, headers, rows) {
			self.remainingResults--;
			
			if (self.result.headers.length === 0) {
				self.result.headers = headers;
			}
			self.result.metaData.totalRows += metaData.totalRows;
			self.result.metaData.outlierRows += metaData.outlierRows;
			self.result.metaData.outlierValues += metaData.outlierValues;
			
			console.log(rows.length + " rows");
			
			for (var i = 0; i < rows.length; i++) {
				if (rows[i].metaData.hasOutlier) self.result.rows.push(rows[i]);
			}
						
			console.log("Remaining data for processing: " + self.remainingResults);
			if (self.remainingResults === 0) {
				self.resultsCallback(self.result);				
			}

		}
				
		return self;
	});
})();