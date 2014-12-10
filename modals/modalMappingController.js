(function(){  
	/**Controller: Parameters*/
	angular.module('reportCard').controller("ModalMappingController", function($modalInstance, $scope, requestService, metaDataService, indicator) {
	    
	    var self = this; 
	    self.indicator = indicator;
	    
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
	    
	    metaDataService.getDataElementGroups().then(function(data) { 
	    	self.dataElementGroups = data;
	    });
	    
	    metaDataService.getIndicatorGroups().then(function(data) { 
	    	self.indicatorGroups = data;
	    });
	    
	    initWatchers();
	    
	    function updateDataElementList() {	    	
	    	if (self.dataDetails === 0) {	    	

		    	metaDataService.getDataElementGroupMembers(self.dataElementGroupsSelected.id)
		    	 	.then(function(data) { 
		    	       	self.dataElements = data;
		    	     });
	    	}
	    	else {
	    		metaDataService.getDataElementGroupMemberOperands(self.dataElementGroupsSelected.id)
	    		 	.then(function(data) { 
	    		       	self.dataElements = data;
	    		     });
	    	}
	    }
	    
	    
  	    function updateIndicatorList() {

  	    	metaDataService.getIndicatorGroupMembers(self.indicatorGroupsSelected.id)
  	    		.then(function(data) { 
  	    		   	self.indicators = data;
  	    		});
  	    }
  	    
  	    
  	    function updateDataSetList() {
  	    	self.dataSetsSelected = undefined;
  	    	
  	    	if (self.dataDisaggregation === 0) {
		    	metaDataService.getDataElementDataSets([self.dataElementsSelected.id])
		    		.then(function(data) {
		    			 
	    			   	self.dataSets = data.dataSets;
	    			});
	    	}
	    	else {
	    		//TODO: indicator
	    		metaDataService.getIndicatorDataElements([self.indicatorsSelected.id])
	    			.then(function(data) {
	    				 
	    			   	var dataIDs = [];
	    			   	for (var i = 0; i < data.dataElements.length; i++) {
	    			   		dataIDs.push(data.dataElements[i].id);	
	    			   	}
	    			   	metaDataService.getDataElementDataSets(dataIDs)
	    			   	.then(function(data) {
	    			   		 
	    			   	   	self.dataSets = data.dataSets;
	    			   	});
	    			   	
	    			   	
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
	    
	});
})();