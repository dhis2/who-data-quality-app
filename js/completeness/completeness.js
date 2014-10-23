
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
	
	
	/**Controller: Parameters*/
	app.controller("ParamterController", function(completenessDataService, metaDataService, BASE_URL, $http, $q, $sce, $scope) {
	    
	    
	    var self = this;
	        
	    init();
	    initSelects();	 
    	initOrgunitTree();  	
	    
		function init() {
	    	self.dataSets = [];
	    	self.dataSetsSelected = [];
	    	
	    	self.dataElements = [];
	    	self.dataElementsSelected = [];
	    		    
	    	self.indicators = [];
	    	self.indicatorsSelected = [];
	    	
	    	self.orgunits = [];
	    	
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

			//Options
			self.onlyNumbers = /^\d+$/;
			self.threshold = 80;
			
			
			//Date initialisation
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
												self.includeChildren);
				
		}
		
		
		return self;
		
	});
	
	
	/**Controller: Results*/	
	app.controller("ResultsController", function(completenessDataService) {
	    var self = this;
	    
	    self.results = [];
	    self.gridOptions = [];
	    
	    var receiveResult = function(results) {
	     	self.results = results;
	     	self.gridOptions = [];

	     	for (var i = 0; i < results.length; i++) {
		     	var option = {};
	     		option.data = results[i].data;	     		
	     		option.columnDefs = results[i].columnDefs;
	     		option.showColumnMenu = false;
	     		option.periodType = results[i].periodType;
	     		self.gridOptions.push(option);
	     	}
	    }
   	    completenessDataService.resultsCallback = receiveResult;

			                   	   	
	   	return self;
	});
	 
	 
	/**Service: Completeness data*/
	app.service('completenessDataService', function (metaDataService, periodService, requestService, uiGridConstants) {
		
		var self = this;
		
		self.resultsCallback = null; 
		
		init();
			
		function init() {
			self.param = {
				'dataSets': [],
				'dataElements': [],
				'indicators': [],
				'startDate': "",
				'endDate': "",
				'orgunits': [],
				'threshold': 0,
				'includeChildren': false
			};
			resetParameters();
		}
		
			
		function resetParameters() {
			self.dataSetsToRequest = [];
			self.orgunitsToRequest = [];
			self.analysisObjects = [];
			self.requests = [];
			self.result = [];
		}
		
		
		self.analyseData = function (dataSets, dataElements, indicators, startDate, endDate, orgunits, threshold, includeChildren) {
			
			resetParameters();
			
			self.param.dataSets = dataSets; 
			self.param.dataElements = dataElements; 
			self.param.indicators = indicators; 
			self.param.startDate = startDate;
			self.param.endDate = endDate;
			self.param.orgunits = orgunits;
			self.param.threshold = threshold;
			self.param.includeChildren = includeChildren;
			
			
			processMetaData();	
			dataSetsForAnalysis();
			orgunitsForAnalysis();
			prepareRequests();
			fetchData();
		}
					
			
		function processMetaData() {
								
			var analysisObject;
			for (var i = 0; i < self.param.dataSets.length; i++) {
				
				analysisObject = {
					'type': 'dataset',
					'id': self.param.dataSets[i].id,
					'dataElements': [],
					'dataSets': [self.param.dataSets[i]]
				};

				self.analysisObjects.push(analysisObject);
							
			}
			
			for (var i = 0; i < self.param.dataElements.length; i++) {
				
				analysisObject = {
					'type': 'dataelement',
					'id': self.param.dataElements[i].id,
					'dataElements': [self.param.dataElements[i]],
					'dataSets': metaDataService.getDataSetsFromDataElement(self.param.dataElements[i])
				};
				
				self.analysisObjects.push(analysisObject);
							
			}
			
			
			for (var i = 0; i < self.param.indicators.length; i++) {
				
				var dataElements = metaDataService.getDataElementsFromIndicator(self.param.indicators[i]);
				var dataSets = [];
				for (var j = 0; j < dataElements.length; j++) {
					dataSets.push.apply(dataSets, metaDataService.getDataSetsFromDataElement(dataElements[j]));
				}
								
				analysisObject = {
					'type': 'indicator',
					'id': self.param.indicators[i].id,
					'dataElements': dataElements,
					'dataSets': metaDataService.removeDuplicateObjects(dataSets)
				};
				
				self.analysisObjects.push(analysisObject);				
			}
		}
		
		
		function prepareRequests() {
			
			var periodTypes = {};
			for (var i = 0; i < self.dataSetsToRequest.length; i++) {
				periodTypes[self.dataSetsToRequest[i].periodType] = true;
			}
			
			
			var periods, dataSets, request;
			for (var pType in periodTypes) {
			    if (periodTypes.hasOwnProperty(pType)) {
					periods = periodService.getISOPeriods(self.param.startDate, self.param.endDate, pType);
					dataSets = dataSetsWithPeriodType(pType);
					
					var requestURL = "/api/analytics.json?";
					requestURL += "dimension=dx:" + IDsFromObjects(dataSets).join(";");
					requestURL += "&dimension=ou:" + IDsFromObjects(self.orgunitsToRequest).join(";");
					requestURL += "&dimension=pe:" + periods.join(";");
					
					request = {
						'URL': requestURL,
						'periodType': pType,
						'dataSets': dataSets,
						'periods': periods
					}
					
					self.requests.push(request);				
				}
			}
		
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
					results.push(processResult(data, requestFromURL(response[i].config.url)));					
				}
				
				self.result = results;
				self.resultsCallback(results);
			});
			
			
		}
		
		
		
		function processResult(data, request) {
			var ds = request.dataSets;
			var pe = data.metaData.pe;
			var ou = data.metaData.ou;
						
			var names = ["Data Set", "Orgunit"];
			for (var i = 0; i < pe.length; i++) {
			
				var periodName;
				if (request.periodType === "Monthly") {
					periodName = periodService.shortMonthName(pe[i]);
				}
				else if (request.periodType === "Yearly") {
					periodName = pe[i].toString();
				}
				else periodName = data.metaData.names[pe[i]];
				
				names.push(periodName);
			}
			names.push("Rank");
			
			
			var columnDefs = [];
			columnDefs[0] = {'field': "Data Set", cellClass: "dataSetCell"};
			columnDefs[1] = {'field': "Orgunit", cellClass: "orgunitCell"}; 
			for (var i = 0; i < pe.length; i++) {
				columnDefs[i+2] = {'field': names[i+2], cellClass: 
					function(grid, row, col, rowRenderIndex, colRenderIndex) {
				    	if (grid.getCellValue(row,col) === '') {
				        	return 'noDataCell';
				        }
				        else if (parseFloat(grid.getCellValue(row,col)) < self.param.threshold) {
				        	return 'lowDataCell';
				        }
				        else {
				        	return 'highDataCell';
				        }
				    }
				};
			}
			columnDefs[names.length-1] = {
				'field': "Rank", 
				'sort': {
			    	'direction': uiGridConstants.ASC,
			        'priority': 0
			    }
			}; 
			
			var rows = [];
			for (var i = 0; i < ds.length; i++) {
				for (var j = 0; j < ou.length; j++) {
					var row = {};
					row[names[0]] = ds[i].name;		
					row[names[1]] = data.metaData.names[ou[j]];
					row[names[names.length-1]] = 0;
					
					for (var k = 0; k < pe.length; k++) {
						var value = getDataValue(ds[i], ou[j], pe[k], data.rows);				
						row[names[k+2]] = value;
						if (value == '') {
							row[names[names.length-1]] = row[names[names.length-1]] - 2;
						}
						else if (parseInt(value) < self.param.threshold) {
							row[names[names.length-1]] = row[names[names.length-1]] - 1;
						}					
					}
					rows.push(row);
				}
			}
			
			var resultObject = {
				'metadata': data.metaData,
				'columnDefs': columnDefs,
				'periodType': request.periodType,
				'data': rows,
				'dataSets': ds
			};
			
			return resultObject;
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
				
		
		
		function getDataValue(ds, ou, pe, rows) {
			
			
			for (var i = 0; i < rows.length; i++) {
				if (rows[i][0] === ds.id && rows[i][1] === ou && rows[i][2] === pe) return rows[i][3];
			}
			return "";
		
		}
		
		
		
		function orgunitsForAnalysis() {
			var orgunits = [];
			for (var i = 0; i < self.param.orgunits.length; i++) {
				if (self.param.includeChildren) {
					orgunits.push.apply(orgunits, metaDataService.orgunitChildrenFromParentID(self.param.orgunits[i]));
				}
				orgunits.push(metaDataService.orgunitFromID(self.param.orgunits[i]));
			}
			self.orgunitsToRequest = metaDataService.removeDuplicateObjects(orgunits);
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
				
		
				
		return self;
	});
	
	
	
})();

