(function(){  
	/**Service: Completeness*/
	angular.module('completenessAnalysis').service('completenessDataService', function (mathService, metaDataService, periodService, requestService) {
		
		var self = this;
		
		self.resultsCallback = null;
			
		function resetParameters() {
			self.requests = [];
		}
		
		
		self.analyseData = function (data, period, orgunit, parameters) {
			
			resetParameters();
			
			var variables = getVariables(data);
			var periods = periodService.getISOPeriods(period.startDate, period.endDate, period.periodType);		
			
			var requestURL = "/api/analytics.json?";
			requestURL += "dimension=dx:" + IDsFromObjects(variables).join(";");
			requestURL += "&dimension=ou:" + IDsFromObjects(orgunit.boundary).join(";");
			
			if (orgunit.disaggregationType != 'none') {
				requestURL += ';' + orgunit.disaggregationID;		
			}
			
			requestURL += "&dimension=pe:" + periods.join(";");
			requestURL += '&ignoreLimit=true';
			requestURL += '&hideEmptyRows=true';
			requestURL += '&tableLayout=true';
			requestURL += '&columns=pe&rows=dx;ou';
					
			self.requests.push({
				'URL': requestURL,
				'variables': variables,
				'orgunits': orgunit.boundary,
				'orgunitDisaggregation': orgunit.disaggregationID,
				'periods': periods,
				'parameters': parameters,
				'type': parameters.analysisType,
				'periodType': period.periodType	
			});
			
			fetchData();
			
		};
		
		
		
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
		
				
		
		function fetchData() {
			var requestURLs = [];
			for (var i = 0; i < self.requests.length; i++) {
				requestURLs.push(self.requests[i].URL);
			}
			
			console.log("Start request");
			requestService.getMultiple(requestURLs).then(function(response) { 
				console.log("Received result");
				var results = [];	
				for (var i = 0; i < response.length; i++) {
					var data = response[i].data;
					var request =  requestFromURL(response[i].config.url);
					
					results.push(resultsAnalysis(data, request));
					
				}
				
				for (var i = 0; i < results.length; i++) {
					self.resultsCallback(results[i]);	
				}
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
		
		
		
		self.updateAnalysis = function(baseRequest, orgunits) {
												
			resetParameters();
			
			var metaData = baseRequest.source;
			var variables = metaData.dx;
			var periods = metaData.pe;		
			
			requestURL = "/api/analytics.json?";
			requestURL += "dimension=dx:" + IDsFromObjects(variables).join(";");
			requestURL += "&dimension=ou:" + IDsFromObjects(orgunits).join(";");				
			requestURL += "&dimension=pe:" + periods.join(";");
			requestURL += '&ignoreLimit=true';
			requestURL += '&hideEmptyRows=true';
			requestURL += '&tableLayout=true';
			requestURL += '&columns=pe&rows=dx;ou';
					
			self.requests.push({
				'URL': requestURL,
				'variables': variables,
				'orgunits': orgunits,
				'orgunitDisaggregation': null,
				'periods': periods,
				'parameters': baseRequest.parameters,
				'type': baseRequest.parameters.analysisType,
				'periodType': periodService.periodTypeFromPeriod(periods[0])
			});
			
			fetchData();
		

		}
		
		
		
		function resultsAnalysis(data, request) {
			var old_time = new Date();		
			var periodType = request.periodType;
			
			var variableID = request.variables[0].id;
			var title = data.metaData.names[variableID];
			data.metaData.dx = request.variables;
			data.metaData.ouGroup = request.orgunitDisaggregation; 			
			
			var headers = data.headers;
			var dataIndices = [], headerIndices = [];
			var orgunitIDColumn = 0;
			var orgunitNameColumn = 0;
			for (var i = 0; i < headers.length; i++) {
				if (headers[i].meta === false) dataIndices.push(i);

				if (headers[i].column === 'organisationunitid') orgunitIDColumn = i;
				if (headers[i].column === 'organisationunitname') orgunitNameColumn = i;
				
				if (!headers[i].hidden && headers[i].column != 'dataname') headerIndices.push(i);
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
				row.metaData = {
						'ou': sourceRow[orgunitIDColumn],
						'ouName': sourceRow[orgunitNameColumn],
						'hasOutlier': false,
						'lowLimit': null,
						'highLimit': null,
						'gaps': 0
					};
					
				row.data = filterArrayIndices(sourceRow, dataIndices);
				row.data.unshift(sourceRow[orgunitNameColumn]);			
				rows.push(row);
			}
						
			
			switch (request.type) {
				case 'gap':
					headers.push({'name': "Gaps", 'column': 'gaps', 'type': 'java.lang.Double', 'hidden': false, 'meta': true});
					headers.push({'name': "Weight", 'column': 'weight', 'type': 'java.lang.Double', 'hidden': false, 'meta': true});
					break;
				
				case 'outlier':	
					headers.push({'name': "Outliers", 'column': 'outliers', 'type': 'java.lang.Double', 'hidden': false, 'meta': true});
					headers.push({'name': "Z-Score", 'column': 'zscore', 'type': 'java.lang.Double', 'hidden': false, 'meta': true});
					headers.push({'name': "Weight", 'column': 'weight', 'type': 'java.lang.Double', 'hidden': false, 'meta': true});
					break;
				default:
					headers.push({'name': "Outliers", 'column': 'outliers', 'type': 'java.lang.Double', 'hidden': false, 'meta': true});
					break;
			}
			
			
			//TODO: performance measure
			var new_time = new Date();		
			console.log("Processing rows: " + (new_time - old_time));
			
			
			

			
			//Outlier analysis
			var old_time = new Date();		
			var value, mean, variance, maxZscore, standardDeviation, noDevs, highLimit, lowLimit, hasOutlier, outlierCount = 0, violationCount = 0, rowViolations;
			if (request.type === 'outlier' || request.type === 'threshold') {			
				for (var i = 0; i < rows.length; i++) {
					valueSet = [];
					row = rows[i];
					
					if (request.type === 'outlier') {
						maxZscore = 0;
						for (var j = 1; j < row.data.length; j++) {
							value = row.data[j];
							if (value != '') {
								valueSet.push(parseFloat(value));
							}
						}
					
						mean = mathService.getMean(valueSet); 
						variance = mathService.getVariance(valueSet);
						standardDeviation = mathService.getStandardDeviation(valueSet);
						noDevs = parseFloat(request.parameters.stdDev);
						highLimit = Math.round((mean + noDevs*standardDeviation) * 10) / 10;
						lowLimit = Math.round((mean - noDevs*standardDeviation) * 10) / 10;
						if (lowLimit < 0) lowLimit = 0;
					
					}
					else { //threshold - min and max already set
						lowLimit = request.parameters.thresholdLow;
						highLimit = request.parameters.thresholdHigh;
					}
						
					row.metaData.lowLimit = lowLimit;
					row.metaData.highLimit = highLimit;
					
					rowViolations = 0;
					hasOutlier = false;
					for (var j = 1; j < row.data.length; j++) {
						value = row.data[j];
						if (value != '') {
							if (value > highLimit || value < lowLimit) {
								hasOutlier = true;
								rowViolations++;
							}
							if (request.type === 'outlier') {
								zScore = ((parseFloat(value)-mean)/standardDeviation);
								if (Math.abs(zScore) > maxZscore) maxZscore = Math.abs(zScore);
							}		
						}
					}
					
					row.data.push(rowViolations);
					
					if (request.type === 'outlier') {
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
				var rowsToKeep = [];
				for (var i = 0; i < rows.length; i++) {
					row = rows[i];
					gaps = 0;
					rowViolations = 0;
					valueSet = [];
					
					for (var j = 1; j < row.data.length; j++) {
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
					
					if (gaps >= request.parameters.maxGaps) {
						row.metaData.hasOutlier = true;
					}
					if (row.metaData.hasOutlier) outlierCount++;
					
				}				
			}
			var new_time = new Date();
			console.log("Finding outliers: " + (new_time - old_time));

			var analysisResult = {
				'title': title,
				'type': request.type,
				'metaData': {
					'totalRows': rows.length,
					'outlierRows': outlierCount,
					'outlierValues': violationCount,
					'parameters': request.parameters,
					'source': data.metaData
				},
				'headers': headers,
				'rows': rows
			};
						
			return analysisResult;
		}
				
				
		return self;
	});
})();