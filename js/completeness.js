
(function(){
	
	var app = angular.module('completenessAnalysis', ['daterangepicker']);
	
	
	app.directive("completenessParameters", function() {
		return {
			restrict: "E",
	        templateUrl: "directives/completenessParameters.html"
		};
      
	});
	
	
	
	app.directive("completenessResult", function() {
		return {
			restrict: "E",
	        templateUrl: "directives/completenessResult.html"
		};
	  
	});
	
	
	
	app.controller("ParamterController", function(completenessDataService, metaDataService, BASE_URL, $http, $q, $sce) {
	    
	    var self = this;
	    
	    self.dataSets = [];
	    self.dataSetsSelected = [];
	    
	    self.dataElements = [];
	    self.dataElementsSelected = [];
	    	    
	    self.indicators = [];
	    self.indicatorsSelected = [];
	    
	    self.orgunits = [];
	    
	    self.isoPeriods = [];
	    
	    self.date = {
	    	"startDate": "", 
	    	"endDate": ""
	    };
	    

	    
	    initSelects();	 
    	initOrgunitTree();  	
	    
	    //Initialisation
	    function initSelects() {

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
	    	
	    	self.includeChildren = false;
	    }
	    
	    
    	function sortNodeByName(a, b) {
    		var aName = a.text.toLowerCase();
    		var bName = b.text.toLowerCase(); 
    		return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
    	
    	}
	   		
		
		function getAnalysisPeriods() {
		
			var periodType = "Monthly";
			var startDate = $('#startDatePicker').val();
			var endDate = $('#endDatePicker').val();
		
			var startDateParts = startDate.split('-');
			var endDateParts = endDate.split('-');
			var currentYear = new Date().getFullYear();
			
			var periods = [];
			var periodsInYear;
			for (var startYear = startDateParts[0]; startYear <= endDateParts[0] && currentYear; startYear++) {
				
				periodsInYear = periodTool.get(periodType).generatePeriods({
					'offset': startYear - currentYear,
					'filterFuturePeriods': true,
					'reversePeriods': false
				});
				
				for (var i = 0; i < periodsInYear.length; i++) {
					if (periodsInYear[i].endDate >= startDate && periodsInYear[i].endDate <= endDate) {
						periods.push(periodsInYear[i]);
					}
				}
			}
			
			return periods;
		}
				

		function initOrgunitTree() {
			console.log("Tree loading");
			$('#orgunitTree').jstree({
				"plugins" : [ "wholerow", "ui"],
			    'core': {
		            'data': function (node, callback) {
		            	
		            	//Tree is empty - get first two levels right away
		            	if (node.parent === null) {
		            		var requestURL = BASE_URL + "/api/organisationUnits.json?filter=level:eq:1&fields=id,name,children[id,name]";
		            		console.log("Empty tree");
		            		$.ajax({
		            			type: "GET",
		            			url: requestURL,
		            			cache: false,
		            			success: function(data){
																	
									var orgunits = data.organisationUnits;
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
		            				
		            			},
		            			error: function (xhr, ajaxOptions, thrownError) {
		            				console.log("Error fetching root orgunit");	
		            			}
		            		});
		            	}
			                	
	                	//A leaf was clicked, need to get the next level
	                	else {
	                		var requestURL = BASE_URL + "/api/organisationUnits/" + node.id + ".json?fields=children[id,name]";
	                		
	                		console.log("Fetching children");
	                		                		
	                		$.ajax({
	                			type: "GET",
	                			url: requestURL,
	                			cache: false,
	                			success: function(data){
	                			  
	                			  var children = [];
	                			  for (var i = 0; i < data.children.length; i++) {
	                			  	children.push({
	                			  		'id': data.children[i].id,
	                			  		'text': data.children[i].name,
	                			  		'children': true //should probably add a check for number of levels, and avoid this for facilities
	                			  	});
	                			  }
	                			 	
	                			 	children.sort(sortNodeByName);
	                			 	
	                				callback(children);
	                				
	                			},
	                			error: function (xhr, ajaxOptions, thrownError) {
	                				console.log("Error fetching root orgunit");	
	                			}
	                		});
	                		
	                	} //end else
	                }//end data
		        }//end core
		   	}).bind("select_node.jstree", function (NODE, REF_NODE) {
		   		self.orgunits = $('#orgunitTree').jstree('get_selected');        
		   		//self.$apply();
		   	});
		}
		
		
		self.doAnalysis = function() {
			
			completenessDataService.setParameters(self.dataElements, self.dataSetsSelected, self.dataElementsSelected, self.indicatorsSelected, self.date.startDate, self.date.endDate,
				self.orgunits, self.includeChildren);
				
			completenessDataService.fetchData();
		}
		
		
		return self;
		
	});
	
	
	
	app.controller("ResultsController", function($http) {
	    var self = this;
	   
	   	return self;
	});
	 
	
	
	app.factory('completenessDataService', function ($http, $q) {
		
		var self = this;
		
		self.analysisObjects = [];
		self.dataSetIDs = [];
		self.analysisParameters = {
			'allDataElements': [],
			'dataSets': [],
			'dataElements': [],
			'indicators': [],
			'startDate': "",
			'endDate:': "",
			'orgunits': [],
			'threshold': 0,
			'includeChildren': false
		};
		self.periodTool = new PeriodType();
		
				
		self.setParameters = function (allDataElements, dataSets, dataElements, indicators, startDate, endDate, orgunits, threshold, includeChildren) {
			self.analysisParameters.allDataElements = allDataElements;
			self.analysisParameters.dataSets = dataSets; 
			self.analysisParameters.dataElements = dataElements; 
			self.analysisParameters.indicators = indicators; 
			self.analysisParameters.startDate = startDate;
			self.analysisParameters.endDate = endDate;
			self.analysisParameters.orgunits = orgunits;
			self.analysisParameters.threshold = threshold;
			self.analysisParameters.includeChildren = includeChildren;
		}
		
		
		self.fetchData = function () {

			prepareData();
			
			var startDateISO = moment(self.analysisParameters.startDate).format('YYYY-MM-DD');
			var endDateISO = moment(self.analysisParameters.endDate).format('YYYY-MM-DD');
			
			//To-Do: need to get periodicity of dataset
			var periods = getISOPeriods(startDateISO, endDateISO, 'Monthly');
			
			//To-do: need to get children of orgunits if true.
			
			

			var requestURL = instanceURL + "/api/analytics.json?";
			requestURL += "dimension=dx:" + self.dataSetIDs.join(";");
			requestURL += "&dimension=ou:" + self.analysisParameters.orgunits.join(";");
			requestURL += "&dimension=pe:" + periods.join(";");
			
			
			var response = $http.get(requestURL);
			response.success(function(data) {
				console.log(data);
			});
			response.error(function() {
				console.log("Error fetching data");
			});	
			
		}
		
		
		function prepareData() {
						
			var analysisObject;
			for (var i = 0; i < self.analysisParameters.dataSets.length; i++) {
				
				analysisObject = {
					'type': 'dataset',
					'id': self.analysisParameters.dataSets[i].id,
					'dataElements': [],
					'dataSets': [self.analysisParameters.dataSets[i]]
				};

				self.analysisObjects.push(analysisObject);
							
			}
			
			for (var i = 0; i < self.analysisParameters.dataElements.length; i++) {
				
				analysisObject = {
					'type': 'dataelement',
					'id': self.analysisParameters.dataElements[i].id,
					'dataElements': [self.analysisParameters.dataElements[i]],
					'dataSets': getDataSetFromDataElement(self.analysisParameters.dataElements[i])
				};
				
				self.analysisObjects.push(analysisObject);
							
			}
			
			
			for (var i = 0; i < self.analysisParameters.indicators.length; i++) {
				
				var dataElements = removeDuplicateIDs(getDataElementsFromIndicator(self.analysisParameters.indicators[i]));
				var dataSets = [];
				for (var j = 0; j < dataElements.length; j++) {
					dataSets.push.apply(dataSets, getDataSetFromDataElement(dataElements[j]));
				}
				
				
				analysisObject = {
					'type': 'indicator',
					'id': self.analysisParameters.indicators[i].id,
					'dataElements': dataElements,
					'dataSets': removeDuplicateIDs(dataSets)
				};
				
				self.analysisObjects.push(analysisObject);
							
			}
			
			getAllDataSetIDs();
			
		}
			
		
		function getAllDataSetIDs() {
			var dataSets = [];
			var analysisObj;
			for (var i = 0; i < self.analysisObjects.length; i++) {
				analysisObj = self.analysisObjects[i];
				
				for (var j = 0; j < analysisObj.dataSets.length; j++) {
					
					dataSets.push(analysisObj.dataSets[j]);
					
				}
				
			}
			
			var uniqueDataSets = removeDuplicateIDs(dataSets);
			self.dataSetIDs = getIDsFromArray(uniqueDataSets);
		
		}
		
		
		function getDataSetFromDataElement(dataElement) {
			
			var dataSets = [];
			
			if (dataElement.dataSets) {
				for (var j = 0; j < dataElement.dataSets.length; j++) {
					dataSets.push(dataElement.dataSets[j]);
				}			
			}
			
			console.log(dataSets);
			return dataSets;
		}
		
		
		function getDataElementsFromIndicator(indicator) {
		
			var dataElementIDs = [];			
			dataElementIDs.push.apply(dataElementIDs, formulaToID(indicator.numerator));
			dataElementIDs.push.apply(dataElementIDs, formulaToID(indicator.denominator));				
			
			
			var dataElements = [];
			for (var i = 0; i < dataElementIDs.length; i++) {
				
				for (var j = 0; j < self.analysisParameters.allDataElements.length; j++) {
					if (self.analysisParameters.allDataElements[j].id === dataElementIDs[i]) {
						dataElements.push(self.analysisParameters.allDataElements[j]);
						break;
					}
				}
			}
					
			return dataElements;
		}
		
		
		function formulaToID(indicatorFormula) {
		
			var IDs = [];
			var matches = indicatorFormula.match(/#{(.*?)}/g);
						
			for (var i = 0; i < matches.length; i++) {
				IDs.push(matches[i].slice(2, -1).split('.')[0]);
			}
			
			return IDs;		
		
		}
		
		
		function getIDsFromArray(array) {
			
			var idArray = [];
			for (var i = 0; i < array.length; i++) {
				idArray.push(array[i].id);
			}
			
			return idArray;
		}
	
		
		function removeDuplicateIDs(identifiableObjectsArray) {
		
			var uniqueObjects = [];
			var existingIDs = {};	
		
			for (var i = 0; i < identifiableObjectsArray.length; i++) {
				if (!existingIDs[identifiableObjectsArray[i].id]) {
					uniqueObjects.push(identifiableObjectsArray[i]);
					existingIDs[identifiableObjectsArray[i].id] = true;
				}
			}
			
			return uniqueObjects;
		
		}
	
		
		function getISOPeriods(startDate, endDate, periodType) {
				
			var startDateParts = startDate.split('-');
			var endDateParts = endDate.split('-');
			var currentYear = new Date().getFullYear();
			
			var periods = [];
			var periodsInYear;
			for (var startYear = startDateParts[0]; startYear <= endDateParts[0] && currentYear; startYear++) {
				
				periodsInYear = self.periodTool.get(periodType).generatePeriods({'offset': startYear - currentYear, 'filterFuturePeriods': true, 'reversePeriods': false});
				
				for (var i = 0; i < periodsInYear.length; i++) {
					if (periodsInYear[i].endDate >= startDate && periodsInYear[i].endDate <= endDate) {
						periods.push(periodsInYear[i]);
					}
				}
			}
			
			var isoPeriods = [];
			for (var i = 0; i < periods.length; i++) {
				isoPeriods.push(periods[i].iso);
			}
			
			return isoPeriods;
		}
		
				
		return self;
	});
	
	
	
})();

