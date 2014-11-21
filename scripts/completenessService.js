(function(){  
	/**Service: Completeness*/
	angular.module('completenessAnalysis').service('completenessDataService', function (mathService, metaDataService, periodService, requestService) {
		
		var self = this;
		
		self.resultsCallback = null;
			
		function resetParameters() {
			self.requests = [];
			self.result = [];
		}
		
		
		self.analyseData = function (data, period, orgunit, parameters) {
			
			resetParameters();
			
			var variables = getVariables(data);
			var orgunits = getOrgunits(orgunit);
			var periods = periodService.getISOPeriods(period.startDate, period.endDate, period.periodType);
			console.log(period);			
			console.log(periods);
			
			
			var requestURL = "/api/analytics.json?";
			requestURL += "dimension=dx:" + IDsFromObjects(variables).join(";");
			requestURL += "&dimension=ou:" + IDsFromObjects(orgunits).join(";");
			
			if (orgunit.selectionType === 'level') {
				requestURL += ';LEVEL-' + orgunit.level.level;		
			}
			else if (orgunit.selectionType === 'group') {
				requestURL += ';OU_GROUP-' + orgunit.group.id;		
			}
			
			requestURL += "&dimension=pe:" + periods.join(";");
					
			if (parameters.analysisType === "outlier") {
				self.requests.push({
					'URL': requestURL,
					'variables': variables,
					'orgunits': orgunits,
					'periods': periods,
					'parameters': parameters,
					'type': 'outlier',
					'periodType': period.periodType		
				});
			}
			
			fetchData();
			
		};
		
		
		self.getSingleCompleteness = function(dx, ou, pe) {
			
			var dataSets = [{'id': 'BfMAe6Itzgt', 'periodType': 'Yearly'}]; //metaDataService.getDataSetsFromID(dx);
			
			
			var requestURLs = [];
			for (var i = 0; i < dataSets.length; i++) {
				var period = 2013; //periodService.getBestFit(dataSets[i].periodType, pe);
				var requestURL = "/api/analytics.json?";
				requestURL += "dimension=dx:" + dataSets[i].id;
				requestURL += "&dimension=ou:" + ou;
				requestURL += "&dimension=pe:" + period;
				
				requestURLs.push(requestURL);	
			}
			
			
			requestService.getMultiple(requestURLs).then(function(response) { 
				
				var result = "";
				
				for (var i = 0; i < response.length; i++) {
					var data = response[i].data;
					
					var valueIndex, dxIndex, ouIndex, peIndex;
					for (var i = 0; i < data.headers.length; i++) {
						if (data.headers[i].name === "value") valueIndex = i;
						if (data.headers[i].name === "ou") ouIndex = i;
						if (data.headers[i].name === "pe") peIndex = i;
						if (data.headers[i].name === "dx") dxIndex = i;
					}
					
					if (data.rows.length === 0) response += "No data";
					else { 
						result += data.rows.metaMata.name[data.rows[0][dxIndex]] + " (" + data.rows.metaMata.name[data.rows[0][peIndex]] + "): ";
						result += data.rows[0][valueIndex] + "; ";	
					}
				}
				
				return result;
			});
		};
		
		
		function getVariables(data) {			
			var dataObjects = [];
			if (data.dataSets) {
				dataObjects.push(data.dataSets);
//				for (var i = 0; i < data.dataSets.length; i++) {
//					dataObjects.push(data.dataSets[i]);
//				}
			}
			if (data.dataElements) {
				dataObjects.push(data.dataElements);
//				for (var i = 0; i < data.dataElements.length; i++) {
//					dataObjects.push(data.dataElements[i]);
//				}
			}
			if (data.indicators) {
				dataObjects.push(data.indicators);
//				for (var i = 0; i < data.indicators.length; i++) {
//					dataObjects.push(data.indicators[i]);
//				}
			}
			
			return dataObjects;
		}
		
		
		
		function getOrgunits(orgunit) {			
			var ou = [];
			
			if (orgunit.selectionType === 'user') {
				ou.push.apply(ou, orgunit.userOrgunits);
			}
			else {
				for (var i = 0; i < orgunit.orgunits.length; i++) {
					var tmp = metaDataService.orgunitFromID(orgunit.orgunits[i]);
					ou.push(tmp);
				}
			}
			
			
			if (orgunit.selectionType === 'user' || orgunit.selectionType === 'select') {
				var children = [];
				if (orgunit.includeChildren) {
					for (var i = 0; i < ou.length; i++) {
						children.push.apply(children, metaDataService.orgunitChildrenFromParentID(ou[i].id));
					}
				}
				ou.push.apply(ou, children);
			}
			return metaDataService.removeDuplicateObjects(ou);
		
		
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
				
				self.results = results;
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
		
		
    //Not used
		function orgunitsForAnalysis() {
			var orgunits = [];
			for (var i = 0; i < self.param.orgunits.length; i++) {
				if (self.param.includeChildren) {
					orgunits.push.apply(orgunits, metaDataService.orgunitChildrenFromParentID(self.param.orgunits[i]));
				}
				orgunits.push(metaDataService.orgunitFromID(self.param.orgunits[i]));
			}
			return metaDataService.removeDuplicateObjects(orgunits);
		}
			
		
    //Not used
		function dataSetsWithPeriodType(periodType) {
			
			var matches = [];
			for (var i = 0; i < self.dataSetsToRequest.length; i++) {
				if (self.dataSetsToRequest[i].periodType === periodType) {
					matches.push(self.dataSetsToRequest[i]);
				}
			}
			return matches;
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
			
			
			//Find out what variables goes into rows
			//To-Do: for now we assume there is always only one variable
			var variableID = request.variables[0].id;
			title.push(metaDataService.getNameFromID(variableID));
			
			//Check what goes into rows
			var ouDataDimension;
			if (orgunitIDs.length > 1) {
				ouDataDimension = true;
			}
			else {
				title.push(data.metaData.names[orgunitIDs]);
				ouDataDimension = false;
			}				
			
			
			var row, value, orgunitID, periodID;
			//To-Do: Deal with multiple variables
			if (ouDataDimension) { //Need ou on rows
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
			}
			else {
				orgunitID = orgunitIDs[0];
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
				for (var j = 0; j < periods.length; j++) {
					periodID = periods[j].id;				

					headers.push({'name': periods[j].name, 'id': periodID});
					
					var found = false;
					for (var k = 0; k < data.rows.length && !found; k++) {
												
						//To-Do: variable
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
			var value, mean, variance, standardDeviation, noDevs, highLimit, lowLimit, hasOutlier;
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
						}
					}
				}
				
				row.metaData.hasOutlier = hasOutlier;
			}
					
			
			var analysisResult = {
				'title': title.join(', '),
				'headers': headers,
				'rows': rows
			};
						
			return analysisResult;
		}
				
				
		return self;
	});
})();