
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
	    	
	    	self.userOrgunits = [];
	    	
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
			
			metaDataService.getUserOrgunits().then(function(data) { 
				self.userOrgunits = data;
			});
			
			metaDataService.getOrgunitLevels().then(function(data) { 
				self.orgunitLevels = data;
			});
			
			metaDataService.getOrgunitGroups().then(function(data) { 
				self.orgunitGroups = data;
			});

			//Options
			self.onlyNumbers = /^\d+$/;
			self.threshold = 90;
			self.stdDev = 3.0;
			self.analysisType = "outlier";
			
			
			//Date initialisation
			self.periodTypes = periodService.getPeriodTypes();
			self.periodTypeSelected = self.periodTypes[1];
			
			self.periodCounts = periodService.getPeriodCount();
			self.periodCountSelected = self.periodCounts[11];
			
			self.years = periodService.getYears();
			self.yearSelected = self.years[0];
					
			self.periodOption = "last";			
			self.datePickerOpts = {
	    		locale: {
    	            applyClass: 'btn-default',
    	            applyLabel: "Select",
	    	   	}
	    	};
	    	
	    	self.includeChildren = true;
	    	self.orgunitSelectionType = 'user';
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
		
		
		
		function getPeriodsForAnalysis() {
			
			var startDate, endDate;
			if (self.periodOption === "last") {
				endDate = moment().format("YYYY-MM-DD");
				if (self.periodTypeSelected.id === 'Weekly') {
					startDate = moment().subtract(self.periodCountSelected.value, 'weeks').format("YYYY-MM-DD");
				}
				else if (self.periodTypeSelected.id === 'Monthly') {
					startDate = moment().subtract(self.periodCountSelected.value, 'months').format("YYYY-MM-DD");
				}
				else if (self.periodTypeSelected.id === 'Quarterly') {
					startDate = moment().subtract(self.periodCountSelected.value, 'quarters').format("YYYY-MM-DD");
				}
				else if (self.periodTypeSelected.id === 'SixMonthly') {
					startDate = moment().subtract(self.periodCountSelected.value*2, 'quarters').format("YYYY-MM-DD");
				}
				else if (self.periodTypeSelected.id === 'Yearly') {
					startDate = moment().subtract(self.periodCountSelected.value, 'years').format("YYYY-MM-DD");
				}
			}
			else if (self.periodOption === "year") {
				
				if (self.yearSelected.name === moment().format('YYYY')) {
					endDate = moment().format('YYYY-MM-DD');
				}
				else {
					endDate = self.yearSelected.id + "-12-31";
				}
			
				startDate = self.yearSelected.id + "-01-01";
				
				console.log(startDate);
				console.log(endDate);
				
			}
			else {
				startDate = self.date.startDate;
				endDate = self.date.endDate;
			}
			
			return {'startDate': startDate, 'endDate': endDate, 'periodType': self.periodTypeSelected.id};
		
		}
		
		
		self.doAnalysis = function() {
			//Collapse open panels
			$('.panel-collapse').removeClass('in');
			
			
			var data = {
				'dataSets': self.dataSetsSelected, 
				'dataElements': self.dataElementsSelected,
				'indicators': self.indicatorsSelected
			};
						
			var period = getPeriodsForAnalysis();
			
			var orgunit = {
				'orgunits': self.orgunits,
				'userOrgunits': self.userOrgunits,
				'includeChildren': self.includeChildren,
				'level': self.orgunitLevelSelected,
				'group': self.orgunitGroup,
				'selectionType': self.orgunitSelectionType
			};
			
			var parameters = {
				'threshold': self.threshold,
				'stdDev': self.stdDev,
				'analysisType': self.analysisType
			};
							
						
			//Call service to get data
			completenessDataService.analyseData(data, period, orgunit, parameters);
				
		};
    
		return self;
		
	});
	
	
	/**Controller: Results*/	
	app.controller("ResultsController", function(completenessDataService, visualisationService) {
	    var self = this;
	    
	    self.results = [];
	    self.itemsPerPage = 10;
        self.outliersOnly = false;
        self.hasVisual = false;
        
        self.popoverText = "Loading...";
        
        //showDetails
        self.showDetails = function(row) {


			$('#detailedResult').html('<div class="chartHolder" id="detailChart"></div>');

        	var series = {}, category = {}, filter = {}, parameters = {};
        	
        	series.type = "dx"; 
        	series.data = [{'id': row.metaData.dx}];
        	
        	filter.type = "ou";
        	filter.data = [{'id': row.metaData.ou}];
        	
        	category.type = "pe";
        	category.data = [];
        	for (var i = 0; i < row.data.length; i++) {
        		category.data.push({
        			'id': row.data[i].pe        		
        		});
        	}
        	        	
        	// All following options are optional
    		parameters.width = $('#detailChart').innerWidth();
    		parameters.heigth = $('#detailChart').innerHeight();
    		parameters.showData = true;
    		parameters.hideLegend = true;
    		parameters.hideTitle = true;
    		if (row.metaData.highLimit) parameters.targetLineValue = Math.round(row.metaData.highLimit);
    		if (row.metaData.lowLimit) parameters.baseLineValue = Math.round(row.metaData.lowLimit);
    		
    		visualisationService.generateChart('detailChart', 'column', series, category, filter, parameters);
        };
        
        self.completeness = function(dx, ou, pe) {
            //self.popoverText = "Loading...";
        	self.popoverText = completenessDataService.getSingleCompleteness(dx, ou, pe);
        };
        

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
            
        }
        
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
      };
        
	    self.filterChanged = function(result) {
	    	if (self.outliersOnly) {
	    		result.pages = paginateRows(filterOutlierRows(result.rows));	
	    	}
	    	else {
	    		result.pages = paginateRows(result.rows);	
	    	}
	    	
	    	result.currentPage = 0;
	    	result.n = 0;
	    	
	    	console.log(result);
	    	
	    	return result;
	    	
	    };
	    	    	    
	    var receiveResult = function(result) {		    
	    
	    	var latest = self.results.length;	
		    self.results.push(self.filterChanged(result));
		    self.results[latest].active = true;
	    };
   	    completenessDataService.resultsCallback = receiveResult;
   	    

			                   	   	
	   	return self;
	});
	 
	 
	/**Service: Completeness data*/
	app.service('completenessDataService', function (mathService, metaDataService, periodService, requestService) {
		
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

