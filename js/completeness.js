
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

			completenessDataService.setParameters(self.dataSetsSelected, self.dataElementsSelected, self.indicatorsSelected, self.date.startDate, self.date.endDate,
				self.orgunits, self.threshold, self.includeChildren);
				
			completenessDataService.fetchData();
		}
		
		
		return self;
		
	});
	
	
	app.controller("ResultsController", function($http) {
	    var self = this;
	   
	   	return self;
	});
	 
	
	
	app.service('completenessDataService', function (metaDataService, BASE_URL, $http, $q) {
		
		var self = this;
		
		self.metaData = {};
		
		self.periodTool = new PeriodType();
		self.dataSetsToCheck = [];
		self.orgunitsToCheck = [];
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
		self.analysisObjects = [];
		self.requestList = [];
		
		
		self.setParameters = function (dataSets, dataElements, indicators, startDate, endDate, orgunits, threshold, includeChildren) {
			
			resetParameters();
			
			self.param.dataSets = dataSets; 
			self.param.dataElements = dataElements; 
			self.param.indicators = indicators; 
			self.param.startDate = startDate;
			self.param.endDate = endDate;
			self.param.orgunits = orgunits;
			self.param.threshold = threshold;
			self.param.includeChildren = includeChildren;
			
			
		}
		
		
		self.fetchData = function () {
			
			processMetaData();	
			prepareRequests();
			
		
			for (var i = 0; i < self.requestList.length; i++) {
				var response = $http.get(self.requestList[i]);
				response.success(function(data) {
					console.log(data);
				});
				response.error(function() {
					console.log("Error fetching data");
				});	
			}
		}
		
		
		function resetParameters() {
			self.dataSetsToCheck = [];
			self.analysisObjects = [];
			self.requestList = [];
		}
		
		
		//Need to make one request per periodtype
		function prepareRequests() {
			
			
			var periodTypes = {};
			for (var i = 0; i < self.dataSetsToCheck.length; i++) {
				periodTypes[self.dataSetsToCheck[i].periodType] = true;
			}
			
			
			var periods, dataSets;
			for (var pType in periodTypes) {
			    if (periodTypes.hasOwnProperty(pType)) {
					periods = getISOPeriods(self.param.startDate, self.param.endDate, pType);
					dataSets = getDataSetsWithPeriodType(pType);
					
					var requestURL = BASE_URL + "/api/analytics.json?";
					requestURL += "dimension=dx:" + getIDsFromArray(dataSets).join(";");
					requestURL += "&dimension=ou:" + self.param.orgunits.join(";");
					requestURL += "&dimension=pe:" + periods.join(";");
					
					self.requestList.push(requestURL);				
				}
			}
		
		}

		
		function processMetaData() {
			self.param.startDate = moment(self.param.startDate).format('YYYY-MM-DD');
			self.param.endDate = moment(self.param.endDate).format('YYYY-MM-DD');
			
			if (metaDataService.metaDataReady()) {
				self.metaData = metaDataService.allMetaData();				
			}
			else {
				console.log("To-Do: wait for metadata");
			}	
			
			var orgunits = [];
			for (var i = 0; i < self.param.orgunits.length; i++) {
				console.log(self.param);
				if (self.param.includeChildren) {
					orgunits.push.apply(orgunits, getOrgunitChildren(self.param.orgunits[i]));
				}
				orgunits.push(getOrgunit(self.param.orgunits[i]));
			}
			self.orgunitsToCheck = getIDsFromArray(removeDuplicateIDs(orgunits));
			console.log(self.orgunitsToCheck.length);
					
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
					'dataSets': getDataSetFromDataElement(self.param.dataElements[i])
				};
				
				self.analysisObjects.push(analysisObject);
							
			}
			
			
			for (var i = 0; i < self.param.indicators.length; i++) {
				
				var dataElements = removeDuplicateIDs(getDataElementsFromIndicator(self.param.indicators[i]));
				var dataSets = [];
				for (var j = 0; j < dataElements.length; j++) {
					dataSets.push.apply(dataSets, getDataSetFromDataElement(dataElements[j]));
				}
				
				
				analysisObject = {
					'type': 'indicator',
					'id': self.param.indicators[i].id,
					'dataElements': dataElements,
					'dataSets': removeDuplicateIDs(dataSets)
				};
				
				self.analysisObjects.push(analysisObject);
							
			}
			
			getAllDataSetIDs();
		}
		
		
		function dataSetFromID(dataSetID) {
			for (var j = 0; j < self.metaData.dataSets.length; j++) {
				if (dataSetID === self.metaData.dataSets[j].id) {
					return self.metaData.dataSets[j];
				}			
			}
						
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
			
			self.dataSetsToCheck = removeDuplicateIDs(dataSets);
		
		}
		
		function getDataSetsWithPeriodType(periodType) {
			
			var matches = [];
			for (var i = 0; i < self.dataSetsToCheck.length; i++) {
				if (self.dataSetsToCheck[i].periodType === periodType) {
					matches.push(self.dataSetsToCheck[i]);
				}
			}
			
			return matches;
		
		}
		
		function getDataSetFromDataElement(dataElement) {
			
			var dataSets = [];
			
			if (dataElement.dataSets) {
				for (var j = 0; j < dataElement.dataSets.length; j++) {
					
					dataSets.push(dataSetFromID(dataElement.dataSets[j].id));
				}			
			}
			return dataSets;
		}
		
		
		function getDataElementsFromIndicator(indicator) {
						
			var dataElementIDs = [];			
			dataElementIDs.push.apply(dataElementIDs, formulaToID(indicator.numerator));
			dataElementIDs.push.apply(dataElementIDs, formulaToID(indicator.denominator));				
			
			
			var dataElements = [];
			for (var i = 0; i < dataElementIDs.length; i++) {
				
				for (var j = 0; j < self.metaData.dataElements.length; j++) {
					if (self.metaData.dataElements[j].id === dataElementIDs[i]) {
						dataElements.push(self.metaData.dataElements[j]);
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
			
			//To-do: yearly = duplicates
			return isoPeriods;
		}
		
		//Returns array of orgunit child objects based on parent ID
		function getOrgunitChildren(parentID) {
			
			console.log("Parent: " + parentID);
			var children = [];
			for (var i = 0; i < self.metaData.orgunits.length ; i++) {
				if (self.metaData.orgunits[i].id === parentID) {
					children.push.apply(children, self.metaData.orgunits[i].children);
				}
			}
			console.log(children.length + " children");
			return children;
		
		}
		
		
		//Returns orgunit-object based on ID (string)
		function getOrgunit(orgunitID) {
			
			for (var i = 0; i < self.metaData.orgunits.length ; i++) {
				if (self.metaData.orgunits[i].id === orgunitID) {
					return self.metaData.orgunits[i];
				}
			}
		
		}
		
				
		return self;
	});
	
	
	
})();

