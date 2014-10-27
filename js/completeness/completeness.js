
(function(){
	
	var app = angular.module('completenessAnalysis', ['ui.grid', 'ui.grid.resizeColumns', 'daterangepicker']);
	
	
	/**Directive: Completeness parameters*/
	app.directive("completenessParameters", function() {
		return {
			restrict: "E",
	        templateUrl: "js/completeness/completenessParameters.html"
		};
      
	});
	
	
	/**Directive: Completeness results*/	
	app.directive("completenessResult", function() {
		return {
			restrict: "E",
	        templateUrl: "js/completeness/completenessResult.html"
		};
	  
	});
	
	/**Directive: Completeness results*/	
	app.directive("outlierResult", function() {
		return {
			restrict: "E",
	        templateUrl: "js/completeness/outlierResult.html"
		};
	  
	});	
		
	
	/**Controller: Parameters*/
	app.controller("ParamterController", function(completenessDataService, metaDataService, periodService, BASE_URL, $http, $q, $sce, $scope) {
	    
	    
	    var self = this;
	        
	    init();
	    initSelects();	 
    	initOrgunitTree();  	
	    
		function init() {
	    	self.dataSets = [];
	    	self.dataSetsSelected = undefined;
	    	
	    	self.dataElements = [];
	    	self.dataElementsSelected = undefined;
	    		    
	    	self.indicators = [];
	    	self.indicatorsSelected = undefined;
	    	
	    	self.orgunits = [];
	    	
	    	self.userOrgunit = [];
	    	
	    	self.orgunitLevels = [];
	    	self.orgunitLevelSelected = undefined;
	    	
	    	self.orgunitGroups = [];
	    	self.orgunitGroupSelected = undefined;
	    	
	    	self.periodTypes = [];
	    	self.periodTypeSelected = undefined;
	    	
	    	self.periodCount = [];
	    	self.periodCountSelected = undefined;
	    	
	    	self.years = [];
	    	self.yearSelected = undefined;
	    	
	    	self.isoPeriods = [];
	    	
	    	self.date = {
	    		"startDate": moment().subtract(12, 'months'), 
	    		"endDate": moment()
	    	};
	    }
	    
	    
	    function initSelects() {
			
			metaDataService.fetchMetaData();
			
			var dataSetPromise = metaDataService.getDataSets();
			dataSetPromise.then(function(data) { 
				self.dataSets = data;
			});
			
			var dataElementPromise = metaDataService.getDataElements();
			dataElementPromise.then(function(data) { 
				self.dataElements = data;
			});
			
			var indicatorPromise = metaDataService.getIndicators();
			indicatorPromise.then(function(data) { 
				self.indicators = data;
			});
			
			var orgunitPromise = metaDataService.getOrgunits();
			orgunitPromise.then(function(data) { 
				self.orgunitData = data;
			});
			
			metaDataService.getOrgunitLevels().then(function(data) { 
				self.orgunitLevels = data;
			});

			//Options
			self.onlyNumbers = /^\d+$/;
			self.threshold = 90;
			self.stdDev = 2;
			self.analysisType = "outlier";
			
			
			//Date initialisation
			self.periodTypes = periodService.getPeriodTypes();
			self.periodTypeSelected = self.periodTypes[2];
			
			self.periodCounts = periodService.getPeriodCount();
			self.periodCountSelected = self.periodCounts[11];
			
			self.years = periodService.getYears();;
			self.yearSelected = self.years[0];
			
			self.periodOption = "last";			
			self.datePickerOpts = {
	    		locale: {
    	            applyClass: 'btn-blue',
    	            applyLabel: "Select",
	    	   	},
	    	    ranges: {
	    	    	'Last half year': [moment().subtract(6, 'months'), moment()],
	    	      	'Last year': [moment().subtract(12, 'months'), moment()]
	    	    }
	    	};
	    	
	    	self.includeChildren = true;
	    	self.orgunitSelectionType = 'select';
	    }
	    				

		function initOrgunitTree() {
			$('#orgunitTree').jstree({
				"plugins" : [ "wholerow", "ui"],
			    'core': {
		            'data': function (node, callback) {
		            	
		            	//Tree is empty - get first two levels right away
		            	if (node.parent === null) {
		            	
		            		metaDataService.getRootOrgunits().then(function(data) { 
		            			var orgunits = data;
		            			var orgunitNodes = [];
				
								//Iterate over all the orgunit the user is assigned to (root(s))
								for (var i = 0; i < orgunits.length; i++) {
									orgunitNodes[i] = {
										'id': orgunits[i].id, 
										'text': orgunits[i].name,
										'children': [], 
										'state': {
											'opened': true
										}
									};
									
									//Add the children of the root(s) as well
									for (var j = 0; j < orgunits[i].children.length; j++) {
										orgunitNodes[i].children.push({
											'id': orgunits[i].children[j].id,
											'text': orgunits[i].children[j].name,
											'children': true
										});
										
										orgunitNodes[i].children.sort(sortNodeByName);
									}	
								}

								orgunitNodes.sort(sortNodeByName);
								callback(orgunitNodes);
		            		
		            		});
		            	}
			                	
	                	//A leaf was clicked, need to get the next level
	                	else {
	                		var orgunits = metaDataService.orgunitChildrenFromParentID(node.id);
	                		var children = [];
	                		for (var i = 0; i < orgunits.length; i++) {
	                			children.push({
                					'id': orgunits[i].id,
                					'text': orgunits[i].name,
                					'children': true //should probably add a check for number of levels, and avoid this for facilities
	                			});
	                		}
	                		
	                		children.sort(sortNodeByName);
	                		callback(children);	                		
	                	} //end else
	                }//end data
		        }//end core
		   	}).bind("select_node.jstree", function (NODE, REF_NODE) {
		   		self.orgunits = $('#orgunitTree').jstree('get_selected');
		   	}).on("loaded.jstree", function() {
		   		//select user orgunit nodes as default
		   		metaDataService.getUserOrgunits().then(function(data) {
		   			for (var i = 0; i < data.length; i++) {
		   				$('#orgunitTree').jstree('select_node', data[i].id);
		   				console.log("Selected " + data[i].id);
		   			}
		   		});
		   	});
		}
		
		
		function sortNodeByName(a, b) {
			var aName = a.text.toLowerCase();
			var bName = b.text.toLowerCase(); 
			return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
		
		}
		
		
		self.doAnalysis = function() {
			//Collapse open panels
			$('.panel-collapse').removeClass('in');
			
			//Call service to get data
			completenessDataService.analyseData(self.dataSetsSelected, 
												self.dataElementsSelected, 
												self.indicatorsSelected, 
												self.date.startDate, 
												self.date.endDate,
												self.orgunits, 
												self.threshold, 
												self.includeChildren,
												self.stdDev,
												self.analysisType);
				
		}
		return self;
		
	});
	
	
	/**Controller: Results*/	
	app.controller("ResultsController", function(completenessDataService) {
	    var self = this;
	    
	    self.results = [];
	    self.itemsPerPage = 15;
        self.outliersOnly = true;
        
        // calculate page in place
        function paginateRows(rows) {
            var pagedItems = [];
            
            for (var i = 0; i < rows.length; i++) {
                if (i % self.itemsPerPage === 0) {
                    pagedItems[Math.floor(i / self.itemsPerPage)] = [ rows[i] ];
                } else {
                    pagedItems[Math.floor(i / self.itemsPerPage)].push(rows[i]);
                }
            }
            
            return pagedItems;
            
        };
        
        self.range = function (start, end) {
            var ret = [];
            if (!end) {
                end = start;
                start = 0;
            }
            for (var i = start; i < end; i++) {
                ret.push(i);
            }
            return ret;
        };
        
        self.prevPage = function (result) {
            if (result.currentPage > 0) {
                result.currentPage--;
            }
        };
        
        self.nextPage = function (result) {
            if (result.currentPage < result.pages.length - 1) {
                result.currentPage++;
            }
        };
        
        self.setPage = function (result, n) {
            result.currentPage = n;
        };
        
        
        function filterOutlierRows(rows) {
        
        	var row, filteredRows = [];
        	for (var i = 0; i < rows.length; i++) {
        		row = rows[i];
        		
        		if (row.metaData.hasOutlier) {
        			filteredRows.push(row);
        		}
        	}
        	
        	return filteredRows;
        	
        
        }
            
        self.filter = function() {
			for (var i = 0; i < self.results.length; i++) {
				self.results[i] = self.filterChanged(self.results[i]);
			}
        
        }
        
        
	    
	    self.filterChanged = function(result) {
	    	if (self.outliersOnly) {
	    		result.pages = paginateRows(filterOutlierRows(result.rows));	
	    	}
	    	else {
	    		result.pages = paginateRows(result.rows);	
	    	}
	    	
	    	result.currentPage = 0;
	    	result.n = 0;
	    	
	    	return result;
	    	
	    }
	    	    
	    var receiveResult = function(results) {
		    for (var i = 0; i < results.length; i++) {
		    	results[i] = self.filterChanged(results[i]);
		    }
		    self.results = results;
	    }
   	    completenessDataService.resultsCallback = receiveResult;

			                   	   	
	   	return self;
	});
	 
	 
	/**Service: Completeness data*/
	app.service('completenessDataService', function (mathService, metaDataService, periodService, requestService, BASE_URL) {
		
		var self = this;
		
		self.resultsCallback = null;
		
		init();
			
		function init() {
			self.param = {
				'dataSets': null,
				'dataElements': null,
				'indicators': null,
				'startDate': "",
				'endDate': "",
				'orgunits': [],
				'threshold': 0,
				'includeChildren': false,
				'stdDev': '',
				'analysisType': ''
			};
			resetParameters();
		}
		
			
		function resetParameters() {
			self.dataSetsToRequest = [];
			self.analysisObjects = [];
			self.requests = [];
			self.result = [];
		}
		
		
		self.analyseData = function (dataSets, dataElements, indicators, startDate, endDate, orgunits, threshold, includeChildren, stdDev, analysisType) {
			
			resetParameters();
			
			self.param.dataSets = dataSets; 
			self.param.dataElements = dataElements; 
			self.param.indicators = indicators; 
			self.param.startDate = startDate;
			self.param.endDate = endDate;
			self.param.orgunits = orgunits;
			self.param.threshold = threshold;
			self.param.includeChildren = includeChildren;
			self.param.stdDev = stdDev;
			self.param.analysisType = analysisType;
						
			if (self.param.analysisType === "outlier") {
				prepareOutlierRequests();
				fetchData();
			}
		}
		
		
		function prepareOutlierRequests() {
			
			var variableID;
			var periodType = "Monthly";
			if (self.param.dataElements) {
				variableID = self.param.dataElements.id; 
			}
			else {
				variableID = self.param.indicators.id; 
			}
			var periods = periodService.getISOPeriods(self.param.startDate, self.param.endDate, periodType);
			var orgunits = orgunitsForAnalysis();
			
			var requestURL = "/api/analytics.json?";
			requestURL += "dimension=dx:" + variableID;
			requestURL += "&dimension=ou:" + IDsFromObjects(orgunits).join(";");
			requestURL += "&dimension=pe:" + periods.join(";");
				
			self.requests.push({
				'URL': requestURL,
				'variables': variableID,
				'type': 'outlier',
				'periodType': periodType		
			});			
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
						results.push(findOutliers(data, request.periodType, request.variables));						
					}
				}
				
				self.results = results;
				self.resultsCallback(results);
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
			
		
		function dataSetsForAnalysis() {
			var dataSets = [];
			var analysisObj;
			for (var i = 0; i < self.analysisObjects.length; i++) {
				analysisObj = self.analysisObjects[i];
				
				for (var j = 0; j < analysisObj.dataSets.length; j++) {
					dataSets.push(analysisObj.dataSets[j]);	
				}
			}
			self.dataSetsToRequest = metaDataService.removeDuplicateObjects(dataSets);
		}
		
		
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
		
		
		function findOutliers(data, periodType, variables) {
			
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
				})
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
			var variableID = variables;
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
								row.data.push({'value': parseFloat(data.rows[k][valueIndex]), 'type': "number"});
								found = true;
							};
						}
						if (!found) {
							row.data.push({'value': "", 'type': "blank"});
						}
					}
					
					rows.push(row);
				}
			}
			else {
				orgunitID = orgunitIDs[0];
				row = {
					'metaData': {
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
							row.data.push({'value': parseFloat(data.rows[k][valueIndex]), 'type': "number"});
							found = true;
						};
					}
					
					if (!found) {
						row.data.push({'value': "", 'type': "blank"});
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
				noDevs = parseFloat(self.param.stdDev);
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
		
			
		function getChartParameters(chartID, result) {
		
			
			var periods = [];
			for (var i = 0; i < result.periods.length; i++) {
				periods.push({
					'id': result.periods[i].iso
					});	
			}
		
		
			var chartParameters = {
				url: BASE_URL,
				el: chartID,
				type: "column",
				columns: [ // Chart series
				  {dimension: "de", items: [{id: result.variableID}]}
				],
				rows: [ // Chart categories
				  {dimension: "pe", items: periods}
				],
				filters: [
				  {dimension: "ou", items: [{id: result.orgunitID}]}
				],
				// All following options are optional
				width: "800px",
				heigth: "400px",
				showData: false,
				hideLegend: true,
				targetLineValue: result.highLimit,
				baseLineValue: result.lowLimit,
				hideTitle: true
				};
				
			return chartParameters;
		}
		
				
		return self;
	});
	
	
	
})();

