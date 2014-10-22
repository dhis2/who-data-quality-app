
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
	    		"startDate": "", 
	    		"endDate": ""
	    	};
	    }
	    
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
		
		
		function sortNodeByName(a, b) {
			var aName = a.text.toLowerCase();
			var bName = b.text.toLowerCase(); 
			return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
		
		}
		
		self.doAnalysis = function() {

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
	
	
	app.controller("ResultsController", function($http) {
	    var self = this;
	   
	   	return self;
	});
	 
	
	app.service('completenessDataService', function (metaDataService, periodService, requestService) {
		
		var self = this;
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
			
			
			requestService.getMultiple(requestURLs).then(function(data) { 
				console.log(data.length);
				console.log(data);
			});
			
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

