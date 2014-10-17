
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
	
	
	
	app.controller("ParamterController", function(commService, completenessDataService, $http, $sce) {
	    
	    var self = this;
	    
	    initSelects();
	    
	    //Initialisation
	    function initSelects() {
	    	self.onlyNumbers = /^\d+$/;
	    	self.threshold = 80;
	    	
	    	self.dataSets = [];
	    	self.dataSetsSelected = [];
	    	
	    	self.dataElements = [];
	    	self.dataElementsSelected = [];
	    	
	    	self.indicators = [];
	    	self.indicatorsSelected = [];
	    	
	    	self.orgunits = [];
	    	
	    	self.date = {
	    		"startDate": "", 
	    		"endDate": ""
	    		};
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
	    	
	    	self.isoPeriods = [];
	    		    	
	    	initOrgunitTree();
	    	getDataSets();
	    	getDataElements();
	    	getIndicators();
	    }
	    
	    
	    //Get list of of data sets
	    function getDataSets() {
	    
			//request dataSets. To-do: decide what should be selected
		    var requestURL = commService.baseURL + '/api/dataSets.json?'; 
		    requestURL += 'fields=id,name&paging=false';
		    
		    var response = $http.get(requestURL);
			response.success(function(data) {
				self.dataSets = [];
				self.dataSets.push.apply(self.dataSets, data.dataSets);
				console.log("Got " + self.dataSets.length + " data sets");
			});
			response.error(function() {
				console.log("Error fetching data set list");
			});
		};
		
		
		//Get list of of data elements
		function getDataElements() {
		
			//request dataSets. To-do: decide what should be selected
		    var requestURL = commService.baseURL + '/api/dataElements.json?'; 
		    requestURL += 'fields=id,name,dataSets[name,id]&paging=false';
		    
		    var response = $http.get(requestURL);
			response.success(function(data) {
				self.dataElements = [];
				self.dataSets.push.apply(self.dataElements, data.dataElements);
				console.log("Got " + self.dataElements.length + " data elements");
			});
			response.error(function() {
				console.log("Error fetching data element list");
			});
		};
		
		
		//Get list of of data indicators
		function getIndicators() {
		
			//request dataSets. To-do: decide what should be selected
		    var requestURL = commService.baseURL + '/api/indicators.json?'; 
		    requestURL += 'fields=id,name,numerator,denominator&paging=false';
		    
		    var response = $http.get(requestURL);
			response.success(function(data) {
				self.indicators = [];
				self.dataSets.push.apply(self.indicators, data.indicators);
				console.log("Got " + self.indicators.length + " indicators");
			});
			response.error(function() {
				console.log("Error fetching indicatr list");
			});
		};
		
		
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
				
				periodsInYear = periodTool.get($('#periodType').val()).generatePeriods({'offset': startYear - currentYear, 'filterFuturePeriods': true, 'reversePeriods': false});
				
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
		            		var requestURL = commService.baseURL + "/api/organisationUnits.json?filter=level:eq:1&fields=id,name,children[id,name]";
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
	                		var requestURL = commService.baseURL + "/api/organisationUnits/" + node.id + ".json?fields=children[id,name]";
	                		
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
	
	
	
	app.controller("ResultsController", function(commService, $http) {
	    var self = this;
	   
	   	return self;
	});
	 
	
	
	app.factory('completenessDataService', function (commService, $http, $q) {
		
		var self = this;
		
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
			
			var startDateISO = moment(self.analysisParameters.startDate).format('YYYY-MM-DD');
			var endDateISO = moment(self.analysisParameters.endDate).format('YYYY-MM-DD');
			
			//To-Do: need to get periodicity of dataset
			var periods = getISOPeriods(startDateISO, endDateISO, 'Monthly');
			
			//To-do: need to get children of orgunits if true.
			
			var requestURL = commService.baseURL + "/api/analytics.json?";
			requestURL += "dimension=dx:" + getIDsFromArray(self.analysisParameters.dataSets).join(";");
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
		
		function getDataSetFromDataElements(dataElements) {
			var dataSets = [];
			
			for (var i = 0; i < dataElements.length; i++) {
				
				if (dataElements[0].dataSets) {
					for (var j = 0; j < dataElements[i].dataSets.length; i++) {
						dataSets.push(dataElements[i].dataSets[j]);
						console.log("Data element " + dataElements[i].name + " from " + dataElements[i].dataSets[j].name);
					}			
				}
			}
			
			return dataSets;
		}
		
		
		function getDataSetsFromIndicators(indicators, allDataElements) {
		
			var dataElementIDs = [];
			var dataElements = [];
		
		
		
		}
		
		
		function getIDsFromArray(array) {
			
			var idArray = [];
			for (var i = 0; i < array.length; i++) {
				idArray.push(array[i].id);
			}
			
			return idArray;
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

