(function(){  
	/**Service: Completeness*/
	angular.module('reportCard').service('reportService', function (mathService, metaDataService, periodService, requestService) {
		
		var self = this;
		
		init();
		
		function init() {
			self.resultCallback = null;
			self.orgunitBoundaryID = null;
			self.orgunitLevel = null;
			self.analysisYear = null;
			self.result = null;
			self.map = null;
		}
	
		
		self.setCallback = function (callback) {
		
			console.log("Callback set");
			
			self.resultCallback = callback;
		
		}
		
		
		self.doAnalysis = function (orgunitBoundaryID, orgunitLevel, year, group) {
			self.orgunitBoundaryID = orgunitBoundaryID;
			self.orgunitLevel = orgunitLevel;
			self.analysisYear = year; 
			self.group = group;
			self.core = false;
			if (group === 'Core') self.core = true;
			
			//Result skeleton
			self.result = resultTemplate();
			
			//Get mapped data, then do analysis
			requestService.getSingle('/api/systemSettings/DQAmapping').then(function(response) {
				
				self.map = response.data;
				
				getCompleteness();
				getOutliers();
				getTimeConsistency();
				getDataConsistency();
				
				sendResult();
			});
		}
		
		
		function sendResult() {
			
			console.log("Sending result for presentation");
			
			self.resultCallback(self.result);
			
		}
		
		
		function getCompleteness() {
			
			var dataSetIDs = dataSetsForCompleteness();
			
			var requestURLboundary, requestURLchildren;
			for (var i = 0; i < dataSetIDs.length; i++) {
								
				requestURLboundary = "/api/analytics.json?"
				requestURLboundary += "filter=pe:" + self.analysisYear;
				requestURLboundary += "&dimension=dx:" + dataSetIDs[i];
				requestURLboundary += "&dimension=ou:" + self.orgunitBoundaryID;
				requestURLboundary += '&hideEmptyRows=false';
				requestURLboundary += '&ignoreLimit=true';
				
				requestURLchildren = "/api/analytics.json?";
				requestURLchildren += "filter=pe:" + self.analysisYear;
				requestURLchildren += "&dimension=dx:" + dataSetIDs[i];
				requestURLchildren += "&dimension=ou:" + self.orgunitBoundaryID + ';LEVEL-' + self.orgunitLevel;
				requestURLchildren += '&hideEmptyRows=false';
				requestURLchildren += '&ignoreLimit=true';
				
				requestService.getMultiple([requestURLboundary, requestURLchildren]).then(function (response) {
				
					analyseCompleteness(response[0].data, response[1].data); 		
				});
			}
		
		}
		
		
		function analyseCompleteness(boundary, children) {
			
			
			var threshold = parseFloat(analysisParameters().completenessTarget);
			var dataSetCompleteness = {};
			
			
			var val = 0, ou = 0, dx = 0;
			for (var i = 0; i < boundary.headers.length; i++) {
				if (boundary.headers[i].name === 'value') val = i;
				if (boundary.headers[i].name === 'dx') dx = i;
			}
			
			if (boundary.rows.length > 0) {
				dataSetCompleteness.level1 = boundary.rows[0][val];
				dataSetCompleteness.label = boundary.metaData.names[boundary.rows[0][dx]];
			}
			else {
				dataSetCompleteness.level1 = -1;
			}
			
			
			
			for (var i = 0; i < children.headers.length; i++) {
				if (children.headers[i].name === 'value') val = i;
				if (children.headers[i].name === 'dx') dx = i;
				if (children.headers[i].name === 'ou') ou = i;
			}
			

			var totalCount = children.rows.length;
			var outlierCount = 0;
			var outlierNames = [];
			var row;
			for (var i = 0; i < totalCount; i++) {
				row = children.rows[i];
				
				if (parseFloat(row[val]) < threshold) {
					outlierCount++;
					outlierNames.push(children.metaData.names[row[ou]]);
				}
				
					
			}
			
			dataSetCompleteness.level2c = outlierCount;
			dataSetCompleteness.level2p = Math.round((1000*outlierCount)/totalCount)/10
			dataSetCompleteness.level2names = outlierNames.join(', ');
			
			
			self.result.completeness.dataSets.push(dataSetCompleteness);
			
		}
			
			
		function getOutliers() {
			var dataIDs = dataForOutliers();
			
			var requestURLboundary, requestURLchildren;
			for (var i = 0; i < dataIDs.length; i++) {
				
				var periods = periodService.getISOPeriods(self.analysisYear + '-01-01', self.analysisYear + '-12-31', dataIDs[i].periodType);			
				
				requestURL = "/api/analytics.json?"
				requestURL += "&dimension=pe:" + periods.join(';');
				requestURL += "&dimension=dx:" + dataIDs[i].id;
				requestURL += "&dimension=ou:" + self.orgunitBoundaryID + ';LEVEL-' + self.orgunitLevel;		
				requestURL += '&hideEmptyRows=false';
				requestURL += '&tableLayout=true';
				requestURL += '&columns=pe&rows=dx;ou';
				requestURL += '&ignoreLimit=true';
				
								
				var rh = new resultHandler(analyseOutliers, dataIDs[i], true);
				requestService.getSingle(requestURL).then(rh.handleResult);
			}
		}
		
		
		function analyseOutliers(data, dataInfo) {
			
			data = data.data;
			
			var valStart = 99, ou = 0, dx = 0;
			for (var i = 0; i < data.headers.length; i++) {
				if (data.headers[i].column === 'dataid') dx = i;
				if (data.headers[i].column === 'organisationunitid') ou = i;
				if (!data.headers[i].meta) {
					if (i < valStart) valStart = i;
				}
			}
			
			
			
			var totalCount = 0;
			var totalOUcount = data.metaData.ou.length;
			var moderateOutliers = 0;
			var extremeOutliers = 0;
			var children2moderateOutlierNames = [];
			var children2extremeOutlierNames = [];
			var children2moderateOutliers = 0;
			var children2extremeOutliers = 0;
			var row, value, valueSet, rowModOut, rowExtOut;
			for (var i = 0; i < data.rows.length; i++) {
				
				row = data.rows[i];
				rowModOut = 0;
				rowExtOut = 0;
				valueSet = [];
				for (var j = valStart; j < row.length; j++) {
					value = row[j];
					if (value != '') {
						valueSet.push(parseFloat(value));
					}
					totalCount += valueSet.length;
										
					mean = mathService.getMean(valueSet); 
					standardDeviation = mathService.getStandardDeviation(valueSet);
					
					if (parseFloat(value) > (mean + dataInfo.extStdDev*standardDeviation) || parseFloat(value) < (mean - dataInfo.extStdDev*standardDeviation)) {
						//extreme outlier					
						extremeOutliers++;
						rowExtOut++;
					}
					else if (parseFloat(value) > (mean + dataInfo.modStdDev*standardDeviation) || parseFloat(value) < (mean - dataInfo.modStdDev*standardDeviation)) {
						//moderate outlier					
						moderateOutliers++;
						rowModOut++;
					}
				}
				
				if (rowExtOut >= 2) {
					children2extremeOutlierNames.push(data.metaData.names[row[ou]]);
					children2extremeOutliers++;
				}
				else if (rowModOut >= 2) {
					children2moderateOutlierNames.push(data.metaData.names[row[ou]]);
					children2moderateOutliers++;
				}
			}
			
			for (var i = 0; i < self.result.iConsistency.length; i++) {
				if (self.result.iConsistency[i].type === 'extremeOutliers') {
					self.result.iConsistency[i].indicators.push(
						{
						    "label": data.metaData.names[dataInfo.id],
						    "level1": Math.round((1000*extremeOutliers)/totalCount)/10 + '%',
						    "level2p": Math.round((1000*children2extremeOutliers)/totalOUcount)/10,
						    "level2c": children2extremeOutliers,
						    "level2names": children2extremeOutlierNames.join(', ')
						}
					);
				}
				else if (self.result.iConsistency[i].type === 'moderateOutliers') {
					self.result.iConsistency[i].indicators.push(
						{
						    "label": data.metaData.names[dataInfo.id],
						    "level1": Math.round((1000*moderateOutliers)/totalCount)/10  + '%',
						    "level2p": Math.round((1000*children2moderateOutliers)/totalOUcount)/10,
						    "level2c": children2moderateOutliers,
						    "level2names": children2moderateOutlierNames.join(', ')
						}
					);
				}
			}
					
			
		
		}
		
			
		function getTimeConsistency() {
			var dataIDs = dataForOutliers();
			
			var requestURLboundary, requestURLchildren;
			for (var i = 0; i < dataIDs.length; i++) {
				
				var periods = periodService.getISOPeriods((parseInt(self.analysisYear - 3)).toString() + '-01-01', self.analysisYear + '-12-31', 'Yearly');		
				
				requestURLboundary = "/api/analytics.json?"
				requestURLboundary += "&dimension=pe:" + periods.join(';');
				requestURLboundary += "&dimension=dx:" + dataIDs[i].id;
				requestURLboundary += "&dimension=ou:" + self.orgunitBoundaryID;
				requestURLboundary += '&hideEmptyRows=false';
				requestURLboundary += '&tableLayout=true';
				requestURLboundary += '&columns=pe&rows=dx;ou';
				requestURLboundary += '&ignoreLimit=true';
				
				requestURLchildren = "/api/analytics.json?"
				requestURLchildren += "&dimension=pe:" + periods.join(';');
				requestURLchildren += "&dimension=dx:" + dataIDs[i].id;
				requestURLchildren += "&dimension=ou:" + self.orgunitBoundaryID + ';LEVEL-' + self.orgunitLevel;
				requestURLchildren += '&hideEmptyRows=false';
				requestURLchildren += '&tableLayout=true';
				requestURLchildren += '&columns=pe&rows=dx;ou';
				requestURLchildren += '&ignoreLimit=true';
								
				var rh = new resultHandler(analyseTimeConsistency, dataIDs[i], true);
				requestService.getMultiple([requestURLboundary, requestURLchildren]).then(rh.handleResult);
			}
		
		}
		
		
		function analyseTimeConsistency(data, dataInfo) {
			var boundary = data[0].data;
			var children = data[1].data;
			
			var valStart = 99, ou = 0, dx = 0, curVal = 99;
			for (var i = 0; i < boundary.headers.length; i++) {
				if (boundary.headers[i].column === 'dataid') dx = i;
				if (boundary.headers[i].column === 'organisationunitid') ou = i;
				if (!boundary.headers[i].meta) {
					if (i < valStart) valStart = i;
					if (parseInt(boundary.headers[i].name) === parseInt(self.analysisYear)) curVal = i;
				}
			}
			
			
			//First get data for parent
			var boundaryData = ouConsistency(boundary.rows[0].slice(valStart, curVal), boundary.rows[0][curVal]);
			
			if (!boundaryData) {
				self.result.alerts.push({type: 'warning', msg: "Consistency over time: not enough data to include " +  boundary.metaData.names[dataInfo.id] + " in the analysis."});
				return;
			}
			
			var errors = false;
			var childData, outliers = 0, outlierNames = [], totalChildren = children.metaData.ou.length;			
			for (var i = 0; i < children.rows.length; i++) {
				childData = ouConsistency(children.rows[i].slice(valStart, curVal), children.rows[i][curVal]);
				if (childData === null) {
					totalChildren--;
					errors = true;
				}
				else if (((childData.ratio-boundaryData.ratio)/boundaryData.ratio) > dataInfo.consistency) {			
					outliers++;
					outlierNames.push(children.metaData.names[children.rows[i][ou]]);
				}
			}
			
			
			for (var i = 0; i < self.result.iConsistency.length; i++) {
				if (self.result.iConsistency[i].type === 'consistencyTime') {
					self.result.iConsistency[i].indicators.push(
						{
						    "label": boundary.metaData.names[dataInfo.id],
						    "level1": Math.round(100*(boundaryData.ratio))/100,
						    "level2p": Math.round((1000*outliers)/totalChildren)/10,
						    "level2c": outliers,
						    "level2names": outlierNames.join(', ')
						}
					);
				}
			}
			if (errors) {
				self.result.alerts.push({type: 'warning', msg: "Consistency over time: " + (children.metaData.ou.length - totalChildren) + ' units do not have data for all of the last four years for ' + boundary.metaData.names[dataInfo.id] + ". These units are excluded from the analysis."});
			}
			
			
		}
		
		
		function ouConsistency(previousYears, currentYear) {
			
			//TODO: ignore missing values? (lack of historical data)
			var withData = [];
			for (var i = 0; i < previousYears.length; i++) {
				if (previousYears[i] != '') {
					withData.push(parseFloat(previousYears[i]));
				}
			}
			
			if (withData.length != previousYears.length || currentYear === "" ) {
				return null;
			}
			
			var average = mathService.getMean(withData);
			var ratio = parseFloat(currentYear)/average;
		
			return {'average': average, 'ratio': Math.round(100*ratio)/100};
		
		}
		
		
		function getDataConsistency() {
			var dataIDs = dataRelations();
			
			var requestURLboundary, requestURLchildren;
			for (var i = 0; i < dataIDs.length; i++) {
								
				requestURLboundary = "/api/analytics.json?"
				requestURLboundary += "&dimension=pe:" + self.analysisYear;
				requestURLboundary += "&dimension=dx:" + dataIDs[i].A + ';' + dataIDs[i].B;
				requestURLboundary += "&dimension=ou:" + self.orgunitBoundaryID;
				requestURLboundary += '&hideEmptyRows=false';
				requestURLboundary += '&ignoreLimit=true';
				
				requestURLchildren = "/api/analytics.json?"
				requestURLchildren += "&dimension=pe:" + self.analysisYear;
				requestURLchildren += "&dimension=dx:" + dataIDs[i].A + ';' + dataIDs[i].B;
				requestURLchildren += "&dimension=ou:" + self.orgunitBoundaryID + ';LEVEL-' + self.orgunitLevel;
				requestURLchildren += '&hideEmptyRows=false';
				requestURLchildren += '&ignoreLimit=true';
								
				var rh = new resultHandler(analyseDataConsistency, dataIDs[i], true);
				requestService.getMultiple([requestURLboundary, requestURLchildren]).then(rh.handleResult);
			}
		
		}
		
		
		function analyseDataConsistency(data, dataInfo) {
			var boundary = data[0].data;
			var children = data[1].data;
						
			var dx, ou, val;
			for (var i = 0; i < boundary.headers.length; i++) {
				if (boundary.headers[i].name === 'dx') dx = i;
				if (boundary.headers[i].name === 'ou') ou = i;
				if (boundary.headers[i].name === 'value') val = i;
			}
			
			var boundaryA, boundaryB;
			for (var i = 0; i < boundary.rows.length; i++) {
				if (boundary.rows[i][dx] === dataInfo.A) {
					boundaryA = boundary.rows[i][val];
				}
				else if (boundary.rows[i][dx] === dataInfo.B) {
					boundaryB = boundary.rows[i][val];
				}
			}
			var boundaryRatio = parseFloat(boundaryA)/parseFloat(boundaryB);
			
			for (var i = 0; i < children.headers.length; i++) {
				if (children.headers[i].name === 'dx') dx = i;
				if (children.headers[i].name === 'ou') ou = i;
				if (children.headers[i].name === 'value') val = i;
			}
			
			var childrenValues = {};
			for (var i = 0; i < children.rows.length; i++) {
				
				if (!childrenValues[children.rows[i][ou]]) childrenValues[children.rows[i][ou]] = {};
								
				if (children.rows[i][dx] === dataInfo.A) {
					childrenValues[children.rows[i][ou]]['A'] = children.rows[i][val];
				}
				if (children.rows[i][dx] === dataInfo.B) {
					childrenValues[children.rows[i][ou]]['B'] = children.rows[i][val];
				}				
			}
			
			
			
			
						
			var ratio, outliers = 0, outlierNames = [], totalChildren = 0;
			if (dataInfo.type === 'levelRatio') { 
				for (var ou in childrenValues) {
					totalChildren++;
					if (childrenValues[ou].A != '' && childrenValues[ou].B != '') {
					
						ratio = parseFloat(childrenValues[ou].A)/parseFloat(childrenValues[ou].B);
						
						if (((ratio-boundaryRatio)/boundaryRatio) > dataInfo.criteria) {
							outliers++;
							outlierNames.push(children.metaData.names[ou]);
						}
						
					}
									
				}
				for (var i = 0; i < self.result.iConsistency.length; i++) {
					if (self.result.iConsistency[i].type === 'consistencyOU') {
						self.result.iConsistency[i].indicators.push(
							{
							    "label": boundary.metaData.names[dataInfo.A] + ' to ' + boundary.metaData.names[dataInfo.B],
							    "level1": Math.round(100*(boundaryRatio))/100,
							    "level2p": Math.round((1000*outliers)/totalChildren)/10,
							    "level2c": outliers,
							    "level2names": outlierNames.join(', ')
							}
						);
					}
				}
			}
			else { //outlier = ratio above/below a certain value
				for (var ou in childrenValues) {
					totalChildren++;
					if (childrenValues[ou].A != '' && childrenValues[ou].B != '') {
					
						ratio = parseFloat(childrenValues[ou].A)/parseFloat(childrenValues[ou].B);
						
						if (ratio > dataInfo.criteria) {
							outliers++;
							outlierNames.push(children.metaData.names[ou]);
						}
						
					}
									
				}
				for (var i = 0; i < self.result.iConsistency.length; i++) {
					if (self.result.iConsistency[i].type === 'consistencyInternal') {
						self.result.iConsistency[i].indicators.push(
							{
							    "label": boundary.metaData.names[dataInfo.A] + ' to ' + boundary.metaData.names[dataInfo.B],
							    "level1": Math.round(100*(boundaryRatio))/100,
							    "level2p": Math.round((1000*outliers)/totalChildren)/10,
							    "level2c": outliers,
							    "level2names": outlierNames.join(', ')
							}
						);
					}
				}
			}
			
			
		}
		
		
		function dataSetsForCompleteness() {
			
			var data, dataSetIDs = {};
			for (var i = 0; i < self.map.data.length; i++) {
				data = self.map.data[i];
				if (data.matched) {
					if ((data.core && self.core) || (data.group === self.group)) {
						dataSetIDs[data.dataSetID] = true;
					}
				}
			}
			var IDs = [];
			for (key in dataSetIDs) {
				IDs.push(key);
			}
			
			return IDs;
		}
		
		
		function periodTypeFromDataSet(dataSetID) {
			for (var i = 0; i < self.map.dataSets.length; i++) {
				if (dataSetID === self.map.dataSets[i].id) return self.map.dataSets[i].periodType;
			}
		}
		
		
		function dataForOutliers() {
			
			var data, dataIDs = [];
			for (var i = 0; i < self.map.data.length; i++) {
				data = self.map.data[i];
				if (data.matched && ((data.core && self.core) || (data.group === self.group))) {
					
					dataIDs.push({
						'id': data.localData.id,
						'modStdDev': data.moderateOutlier,
						'extStdDev': data.extremeOutlier,
						'consistency': data.consistency,
						'periodType': periodTypeFromDataSet(data.dataSetID)
					});
					
					
				}
			}

			return dataIDs;
			
		}
	
		
		function localDataIDfromCode(code) {
			var data;
			for (var i = 0; i < self.map.data.length; i++) {
				data = self.map.data[i];
				if (data.matched && ((data.core && self.core) || (data.group === self.group)) && data.code === code) {
					return self.map.data[i].localData.id;
				}
			}
			
			return null;
		}
		
		
		function dataRelations() {
			
			var data, relations = [];
			for (var i = 0; i < self.map.relations.length; i++) {
				data = self.map.relations[i];
				
				var codeA = localDataIDfromCode(data.A);
				var codeB = localDataIDfromCode(data.B);
				
				if (codeA && codeB) {
					relations.push({
						'A': codeA,
						'B': codeB,
						'type': data.type,
						'criteria': data.criteria
					});
				}
			}
			
			
			return relations;	
		}
		
		
		function analysisParameters() {
			
			
			//TODO - per dataset
			var parameters = {
				"completenessTarget": 75
			};
			
			
			return parameters;
			
		}
		
		
		function resultTemplate() {
			
			return {	
					"alerts": [],
				    "completeness": {
				    	"descriptions": "Reporting completeness from the facility - the percentage of expected reports that have been entered and completed.",
				        "dataSets": []
				    },
				    "iConsistency": [
				        {
				            "label": "Accuracy of event reporting - extreme outliers",
				            "description": "The overall score denotes the percentage of values reported during the year that are extreme outliers. \nFor lower level units, more than 2 outlieries qualifies as poor score.",
				            "type": "extremeOutliers",
				            "indicators": []
				        },
				        {
				            "label": "Accuracy of event reporting - moderate outliers",
				            "description": "The overall score denotes the percentage of values reported during the year that are moderate outliers. \nFor lower level units, more than 2 outlieries qualifies as poor score.",
				            "type": "moderateOutliers",
				            "indicators": []
				        },
				        {
				            "label": "Consistency over time",
				            "description": "The overall score is the ratio of the year of analysis against the average for the three previous years.\nFor lower level units, poor score indicates that there is a large variation in a given units ratio compared to the overall ratio.",
				            "type": "consistencyTime",
				            "indicators": []
				        },
				        {
				            "label": "Internal consistency between indicators - by level",
				            "description": "The overall score denotes the ratio between the two indicatos.\nFor the lower level units, poor score indicates a large difference in a given units ratio compared to the overall ratio.",
				            "type": "consistencyOU",
				            "indicators": []
				        },
				        {
				            "label": "Internal consistency between indicators - internal",
				            "description": "The overall score denotes the ratio between the two indicatos.\nFor the lower level units, poor score indicates a ratio that is different from what is expected for the two indicators.",
				            "type": "consistencyInternal",
				            "indicators": []
				        }
				    ]
					
				};
		
		}
		
		
				
		return self;
	});
})();