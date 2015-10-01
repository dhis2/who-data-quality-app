(function(){  
	/**Controller: Parameters*/
	angular.module('admin').controller("ModalMappingController",
	['$modalInstance', '$scope', 'requestService', 'd2Meta', 'indicator', 'groups',
	function($modalInstance, $scope, requestService, d2Meta, indicator, groups) {
	    	    
	    var self = this; 
	    self.indicator = indicator;
	    self.groups = groups;
	    
	    self.dataDisaggregation = 0;
	    self.dataDetails = 0;
	    
	    self.dataElementGroups = [];
	    self.dataElementGroupsSelected = undefined;
	    
	    self.dataElements = [];
	    self.dataElementPlaceholder = "";
	    self.dataElementsSelected = undefined;
	    
	    self.indicatorGroups = [];
	    self.indicatorGroupsSelected = undefined;
	    
	    self.indicators = [];
	    self.indicatorPlaceholder = "";
	    self.indicatorsSelected = undefined;
	    
	    self.dataSets = [];
	    self.dataSetsSelected = undefined;


		d2Meta.objects('dataElementGroups').then(function(data) {
	    	self.dataElementGroups = data;
	    });

		d2Meta.objects('indicatorGroups').then(function(data) {
	    	self.indicatorGroups = data;
	    });
	    
	    initWatchers();
	    
	    function updateDataElementList() {	    	
	    	if (self.dataDetails === 0) {	    	

				d2Meta.object('dataElementGroups', self.dataElementGroupsSelected.id, 'dataElements[name,id]')
		    	 	.then(function(data) { 
		    	       	self.dataElements = data.dataElements;
		    	     });
	    	}
	    	else {
				var filter = 'dataElement.dataElementGroups.id:eq:' + self.dataElementGroupsSelected.id;
				var fields = 'name,id,dataElementId,optionComboId';
				d2Meta.objects('dataElementOperands', null, fields, filter)
	    			.then(function(data) {
	    		       	self.dataElements = data;
	    		     });
	    	}
	    }
	    
	    
  	    function updateIndicatorList() {

			d2Meta.object('indicatorGroups', self.indicatorGroupsSelected.id, 'indicators[name,id]')
  	    		.then(function(data) { 
  	    		   	self.indicators = data.indicators;
  	    		});
  	    }
  	    
  	    
  	    function updateDataSetList() {
  	    	self.dataSetsSelected = undefined;
  	    	
  	    	if (self.dataDisaggregation === 0) {

				var id;
				if (self.dataDetails === 0) {
					id = self.dataElementsSelected.id
				}
				else {
					id = self.dataElementsSelected.dataElementId;
				}
				d2Meta.object('dataElements', id, 'dataSets[name,id,periodType]')
		    		.then(function(data) {
		    			 
	    			   	self.dataSets = data.dataSets;
	    			});
	    	}
	    	else {

				d2Meta.indicatorDataSets(self.indicatorsSelected.id)
	    			.then(function(data) {
						self.dataSets = data;
	    			});
	    	}
  	    }
  	    
  	    		
		
		function initWatchers() {
		
			$scope.$watchCollection(function() { return self.dataElementGroupsSelected; }, 
				function() {
					
					if (self.dataElementGroupsSelected) {
						updateDataElementList();	
					}
					
				}
			);
			
			$scope.$watchCollection(function() { return self.indicatorGroupsSelected; }, 
				function() {
					
					if (self.indicatorGroupsSelected) {
						updateIndicatorList();
						
			  		}     
				}
			);
			
			$scope.$watchCollection(function() { return self.indicatorsSelected; }, 
				function() {
					
					if (self.indicatorsSelected) {
						updateDataSetList();
						
			  		}     
				}
			);
			
			$scope.$watchCollection(function() { return self.dataElementsSelected; }, 
				function() {
					
					if (self.dataElementsSelected) {
						updateDataSetList();
			  		}     
				}
			);
			
			
			$scope.$watchCollection(function() { return self.dataDetails; }, 
				function() {
					if (self.dataElementGroupsSelected) {
						self.dataElementsSelected = undefined;
						updateDataElementList();	
					}   
				}
			);
		}
	    
	    	    
	    self.cancel = function () {
	        $modalInstance.close();
	    };
	    
	    self.save = function () {
	    	
	    	if (self.dataDisaggregation === 0) {
	    		self.indicator.localData = self.dataElementsSelected;
	    		self.indicator.localData.type = "dataElement";
	    		if (self.dataDetails === 1) self.indicator.localData.co = true;
	    		else self.indicator.localData.co = false;
	    	}
	    	else {
	    		self.indicator.localData = self.indicatorsSelected;
	    		self.indicator.localData.type = "indicator";
	    		self.indicator.localData.co = false;
	    	}
	    	self.indicator.dataSetID = self.dataSetsSelected.id;
	    	self.indicator.matched = true;
	    	
	        $modalInstance.close(self.indicator);
	    };
	    
	}]);
})();