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
					
			self.requests.push({
				'URL': requestURL,
				'variables': variables,
				'orgunits': orgunit.boundary,
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
		
		
		function resultsAnalysis(data, request) {
			
			var periodType = request.periodType;
			
			var title = [];
			var headers = [];
			var rows = [];
			
			var orgunitIDs = data.metaData.ou;
			var peIDs = data.metaData.pe;
			
			var periods = [];
			for (var i = 0; i < peIDs.length; i++) {
				periods.push({
					'id': peIDs[i],
					'name': data.metaData.names[peIDs[i]]
				});
			}
						
			//Identify which column is which
			var valueIndex, dxIndex, ouIndex, peIndex;
			for (var i = 0; i < data.headers.length; i++) {
				if (data.headers[i].name === "value") valueIndex = i;
				if (data.headers[i].name === "ou") ouIndex = i;
				if (data.headers[i].name === "pe") peIndex = i;
				if (data.headers[i].name === "dx") dxIndex = i;
			}
			
			
			//TODO: now assumes one variable
			var variableID = request.variables[0].id;
			title.push(metaDataService.getNameFromID(variableID));
			
						
			//TODO: now assumes one variable
			var row, value, orgunitID, periodID;
			headers.push({'name': "Orgunit", 'id': orgunitID, 'type': 'header'});
			for (var i = 0; i < orgunitIDs.length; i++) {
				orgunitID = orgunitIDs[i];
				row = {
					'metaData': {
						'dx': variableID,
						'dxName': data.metaData.names[variableID],
						'ou': orgunitID,
						'ouName': data.metaData.names[orgunitID],
						'hasOutlier': false,
						'lowLimit': null,
						'highLimit': null,
						'gaps': 0
					},
					'data': []
				};

				row.data.push({'value': data.metaData.names[orgunitID], 'type': "header"});
				
				for (var j = 0; j < periods.length; j++) {
					periodID = periods[j].id;

					//First time, also add headers
					if (i === 0) headers.push({'name': periodService.shortPeriodName(periodID), 'type': 'data', 'id': periodID});
					
					var found = false;
					for (var k = 0; k < data.rows.length && !found; k++) {

						if (data.rows[k][ouIndex] === orgunitID && data.rows[k][peIndex] === periodID) { 
							row.data.push({'pe': periodID, 'value': parseFloat(data.rows[k][valueIndex]), 'type': "data"});
							found = true;
						}
					}
					if (!found) {
						row.data.push({'pe': periodID, 'value': "", 'type': "data"});
					}
				}
								
				rows.push(row);
			}
			
			switch (request.type) {
				case 'gap':
					headers.push({'name': "Gaps", 'id': '', 'type': 'result'});				
					headers.push({'name': "Weight", 'id': '', 'type': 'result'});
					break;
				default:
					headers.push({'name': "Outliers", 'id': '', 'type': 'result'});
					break;
			}

			//Find outliers 
			var value, mean, variance, standardDeviation, noDevs, highLimit, lowLimit, hasOutlier, outlierCount = 0, violationCount = 0, rowViolations;
			if (request.type === 'outlier' || request.type === 'threshold') {			
				var rowsToKeep = [];
				for (var i = 0; i < rows.length; i++) {
					valueSet = [];
					row = rows[i];
					
					
					var hasData = false;
					for (var j = 0; j < row.data.length; j++) {
						
						if (row.data[j].type === 'data') {
							var value = row.data[j].value;	
							if (!isNaN(value) && value != "") {
								hasData = true;
								break;
							}
						}
					}
					if (hasData) {
						if (request.type === 'outlier') {
		
							for (var j = 0; j < row.data.length; j++) {
								type = row.data[j].type;
								value = row.data[j].value;
								if (type === 'data' && !isNaN(value) && value != '') {
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
						for (var j = 0; j < row.data.length; j++) {
							value = row.data[j].value;
							if (!isNaN(value) && value != '') {
								if (value > highLimit || value < lowLimit) {
									hasOutlier = true;
									rowViolations++;
								}
							}
						}
						
						row.data.push({'value': rowViolations, 'type': "result"});
						violationCount += rowViolations;
						row.metaData.hasOutlier = hasOutlier;
						if (hasOutlier) outlierCount++;
						
						rowsToKeep.push(row);
					}
				}
				
				rows = rowsToKeep;
			}
			else { //gap analysis
				var gaps;
				var rowsToKeep = [];
				for (var i = 0; i < rows.length; i++) {
					row = rows[i];
					gaps = 0;
					rowViolations = 0;
					valueSet = [];
					
					for (var j = 0; j < row.data.length; j++) {
						if (row.data[j].type === 'data' && row.data[j].value === "") {
							gaps++;
							rowViolations++;
						}
					}

					for (var j = 0; j < row.data.length; j++) {
						type = row.data[j].type;
						value = row.data[j].value;
						if (type === 'data' && !isNaN(value) && value !== '') {
							valueSet.push(parseFloat(value));
						}
					}
					mean = mathService.getMean(valueSet);
					
					
					row.data.push({'value': rowViolations, 'type': "result"});
					row.data.push({'value': parseInt(mean*rowViolations), 'type': "result"});
					violationCount += rowViolations;
					
					if (gaps >= request.parameters.maxGaps) {
						row.metaData.hasOutlier = true;
					}
					if (row.metaData.hasOutlier) outlierCount++;
					
					if ((row.data.length - 3) > rowViolations) {
						rowsToKeep.push(row);
					}
				}
				
				rows = rowsToKeep;
				
			}
			
			
			
			
			
			
			var analysisResult = {
				'title': title.join(', '),
				'type': request.type,
				'metaData': {
					'totalRows': rows.length,
					'outlierRows': outlierCount,
					'outlierValues': violationCount
				},
				'headers': headers,
				'rows': rows
			};
						
			return analysisResult;
		}
				
				
		return self;
	});
})();