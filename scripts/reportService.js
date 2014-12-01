(function(){  
	/**Service: Completeness*/
	angular.module('reportCard').service('reportService', function (mathService, metaDataService, periodService, requestService) {
		
		var self = this;
		self.resultCallback = null;
		self.orgunitBoundaryID = null;
		self.orgunitLevel = null;
		self.analysisYear = null;
		self.result = {
		    "completeness": {
		        "dataSets": [
		        	{
		        	"label": "Antenatal care",
		        	"level1": 80,
		        	"level2p": 0.5,
		        	"level2c": 0.5,
		        	"level2names": "District A, District C"
		        	},{
		        	"label": "Malaria Case Reporting",
		        	"level1": 0.4,
		        	"level2p": 0.5,
		        	"level2c": 0.5,
		        	"level2names": "District B, District C"
		        	}
		        ]
		    },
		    "iConsistency": [
		        {
		            "label": "Accuracy of event reporting - extreme outliers",
		            "type": "extremeOutliers",
		            "indicators": [{
		                    "label": "Overall",
		                    "level1p": 0.2,
		                    "level2p": 0.3,
		                    "level2c": 0.4,
		                    "level2names": "Name1, Name2"
			                },{
		                    "label": "ANC1",
		                    "level1": 0.4,
		                    "level2p": 0.5,
		                    "level2c": 0.5,
		                    "level2names": 0.5
		                }
		            ]
		        },
		        {
		            "label": "Accuracy of event reporting - moderate outliers",
		            "type": "moderateOutliers",
		            "indicators": [
		                {
		                    "label": "Overall",
		                    "level1p": 1.2,
		                    "level2p": 1.3,
		                    "level2c": 1.4,
		                    "level2names": "Name3, Name4"
		                }, {
		                    "label": "ANC1",
		                    "level1": 1.4,
		                    "level2p": 1.5,
		                    "level2c": 1.6,
		                    "level2names": 1.7
		                }
		            ]
		        }
		    ]
		};
		
		self.setCallback = function (callback) {
		
			console.log("Callback set");
			
			self.resultCallback = callback;
		
		}
		
		
		self.doAnalysis = function (orgunitBoundaryID, orgunitLevel, year) {
			self.orgunitBoundaryID = orgunitBoundaryID;
			self.orgunitLevel = orgunitLevel;
			self.analysisYear = year; 
			
			getCompleteness();
			
			sendResult();
		}
		
		
		function sendResult() {
			
			console.log("Sending result for presentation");
			
			self.resultCallback(self.result);
			
		}
		
		
		function getCompleteness() {
			
			//TODO - what about non-monthly data?
			var periods = periodService.getISOPeriods(self.analysisYear + '-01-01', self.analysisYear + '-12-31', "Monthly");
		
			var requestURLchildren = "/api/analytics.json?";
			requestURLchildren += "dimension=dx:" + dataSetsForCompleteness().join(";");
			requestURLchildren += "&dimension=ou:" + self.orgunitBoundaryID + ';LEVEL-' + self.orgunitLevel;
			requestURLchildren += "&dimension=pe:" + periods.join(';');
			requestURLchildren += '&hideEmptyRows=false';
			requestURLchildren += '&tableLayout=true';
			requestURLchildren += '&columns=pe&rows=dx;ou';
			
			var requestURLparent = "/api/analytics.json?";
			requestURLparent += "dimension=dx:" + dataSetsForCompleteness().join(";");
			requestURLparent += "&dimension=ou:" + self.orgunitBoundaryID;
			requestURLparent += "&dimension=pe:" + self.analysisYear;
			requestURLparent += '&hideEmptyRows=false';
			requestURLparent += '&tableLayout=true';
			requestURLparent += '&columns=pe;ou&rows=dx';
			
			requestService.getMultiple([requestURLparent, requestURLchildren]).then(function (response) {
			
				analyseCompleteness(response[0].data, response[1].data); 
							
			});

		}
		
		
		function analyseCompleteness(boundary, children) {
			
			var threshold = analysisParameters().completenessTarget;
		
		
			//First get parent complentess for each dataset, so that it is easy to put in to result later
		
		
		
			var result = [];
			var dataSetName, outlierChildrenName, outlierChildren, allChildren, value;
			for (var i = 0; i < children.rows.length; i++) {
				dataSetName = children.rows[i][1],  allChildren = rows[i].length-2, outlierChildrenName = [], outlierChildren = 0;
				
				for (var j = 2; j < rows[i].length; j++) {
					value = rows[i][j];
					
					if (value < threshold) {
						outlierChildren++;
						var name = children.headers[j].name.split(' ');
						name.splice(0, 1);
						outlierChildrenName.push(name.join(' '));
					}
				}
				
				result.push({
					'dataSet': dataSetName,
					'level1': null,
					'level2c': outlierChildren,
					'level2p': (outlierChildren/allChildren),
					'level2names': outlierChildrenName
				});
			}
			
			console.log(result);
		
		}
				
		
		function dataSetsForCompleteness() {
		
			var dataSetIDs = ["oY9wn1Jzm00", "k4Irute1Kkc", "iRgGnHYSFnI"];
			
			
			return dataSetIDs;
			
		}
		
		
		function analysisParameters() {
		
			var parameters = {
				"completenessTarget": 80
				
			};
			
			
			return parameters;
			
		}
		
		
				
		return self;
	});
})();