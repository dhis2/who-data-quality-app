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
			
			
			requestService.getMultiple(requestURLs).then(function(response) { 
				
				var results = [];	
				for (var i = 0; i < response.length; i++) {
					var data = response[i].data;
					var request =  requestFromURL(response[i].config.url);
					if (request.type === 'outlier') {
						results.push(outlierAnalysis(data, request));						
					}
					
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
		
		
		function outlierAnalysis(data, request) {
			
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
			headers.push({'name': "Orgunit", 'id': orgunitID});
			for (var i = 0; i < orgunitIDs.length; i++) {
				row = {
					'metaData': {
						'dx': variableID,
						'ou': orgunitID,
						'hasOutlier': false,
						'lowLimit': null,
						'highLimit': null
					},
					'data': []
				};
				orgunitID = orgunitIDs[i];
				row.data.push({'value': data.metaData.names[orgunitID], 'type': "text"});
				
				for (var j = 0; j < periods.length; j++) {
					periodID = periods[j].id;

					//First time, also add headers
					if (i === 0) headers.push({'name': periods[j].name, 'id': periodID});
					
					var found = false;
					for (var k = 0; k < data.rows.length && !found; k++) {

						if (data.rows[k][ouIndex] === orgunitID && data.rows[k][peIndex] === periodID) { 
							row.data.push({'pe': periodID, 'value': parseFloat(data.rows[k][valueIndex]), 'type': "number"});
							found = true;
						}
					}
					if (!found) {
						row.data.push({'pe': periodID, 'value': "", 'type': "blank"});
					}
				}
				
				rows.push(row);
			}
			
			
			
			//Find outliers 
			//TODO: should be possible to do gaps and thresholds here as well, very similar
			var value, mean, variance, standardDeviation, noDevs, highLimit, lowLimit, hasOutlier, outlierCount = 0, violationCount = 0;
			for (var i = 0; i < rows.length; i++) {
				valueSet = [];
				row = rows[i];

				for (var j = 0; j < row.data.length; j++) {
					value = row.data[j].value;
					if (!isNaN(value)) {
						valueSet.push(value);
					}
				}
				
				mean = mathService.getMean(valueSet); 
				variance = mathService.getVariance(valueSet);
				standardDeviation = mathService.getStandardDeviation(valueSet);
				noDevs = parseFloat(request.parameters.stdDev);
				highLimit = (mean + noDevs*standardDeviation);
				lowLimit = (mean - noDevs*standardDeviation);
				if (lowLimit < 0) lowLimit = 0;
								
				row.metaData.lowLimit = lowLimit;
				row.metaData.highLimit = highLimit;
				
				hasOutlier = false;
				for (var j = 0; j < row.data.length; j++) {
					value = row.data[j].value;
					if (!isNaN(value)) {
						if (value > highLimit || value < lowLimit) {
							hasOutlier = true;
							j = row.data.length;
							violationCount++;
						}
					}
				}
				
				row.metaData.hasOutlier = hasOutlier;
				if (hasOutlier) outlierCount++;
			}
			
			
			
			var analysisResult = {
				'title': title.join(', '),
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