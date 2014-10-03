
(function(){
	var app = angular.module('completenessAnalysis', ['daterangepicker']);
	
	app.directive("completenessParameters", function() {
		return {
			restrict: "E",
	        templateUrl: "directives/completenessParameters.html"
		};
      
	});
	
	
	
	app.controller("ParamterController", function(commService, $http) {
	    
	    var self = this;
	    
	    initSelects();
	    
	    //Initialisation
	    function initSelects() {
	    	self.dataOptions = [{
	    		'id':0, 
	    		'name': '  Loading...  '
	    		}];
	    	self.dataSelected = self.dataOptions[0];
	    	
	    	self.orgunits = [{
	    		'id':0, 
	    		'name': '  Loading...  '
	    		}];
	    	self.orgunitSelected = self.orgunits[0];
	    	
	    	self.date = {
	    		"startDate": "2014-01-01", 
	    		"endDate": "2014-07-01"
	    		};
	    	self.datePickerOpts = {
	    		locale: {
    	            applyClass: 'btn-green',
    	            applyLabel: "Select",
	    	   	},
	    	    ranges: {
	    	    	'Last half year': [moment().subtract(6, 'months'), moment()],
	    	      	'Last year': [moment().subtract(12, 'months'), moment()]
	    	    }
	    	};
	    	
	    	self.isoPeriods = [];
	    	
	    	getDataElements();
	    	getOrgunits();
	    }
	    
	    
	    //Get list of of data element - currently just some random DEs
	    function getDataElements() {
	    
			//request dataElements. To-do: decide what should be selected
		    var requestURL = commService.baseURL + '/api/dataElements.json?'; 
		    requestURL += 'fields=id,name&paging=false&filter=name:like:ANC';
		    
		    var response = $http.get(requestURL);
			response.success(function(data) {
			
				
				self.dataOptions = [{'id':0, 'name': '[Select]'}];
				self.dataOptions.push.apply(self.dataOptions, data.dataElements);
			});
			response.error(function() {
				console.log("Error fetching data element list");
			});
		};
		
		
		//Get list of orgunits - currently just three top levels
		function getOrgunits() {
			//request dataElements. To-do: decide what should be selected
			var requestURL = commService.baseURL + '/api/organisationUnits.json?';
			requestURL += 'fields=id,name&paging=false&filter=level:lte:3';
			
			var response = $http.get(requestURL);
			response.success(function(data) {
				self.orgunits = [{'id':0, 'name': '[Select]'}];
				self.orgunits.push.apply(self.orgunits, data.organisationUnits);
			});
			response.error(function() {
				console.log("Error fetching data element list");
			});
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
		
		
		function updateDateDisplay() {
			console.log(self.date);
		}
		
		return self;
		
	});
})();

