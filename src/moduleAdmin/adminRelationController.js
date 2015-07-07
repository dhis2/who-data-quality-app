(function(){  
	/**Controller: Parameters*/
	angular.module('admin').controller("ModalAddEditRelationController", function($modalInstance, $scope, indicators, relation) {
	    	    
	    var self = this; 
	    self.indicators = indicators;
    	self.aSelected = null;
    	self.bSelected = null;
    	
    	self.types = [{'name': 'A ≈ B', 'code': 'eq'},{'name': 'A > B', 'code': 'aGTb'},{'name': 'Dropout from A to B', 'code': 'do'}];
    	self.typeSelected = null;
    	    	
	    //Add
	    if (relation === null) {
	    	self.title = "Add relation";
	    	self.relation = {
	    		"A": null,
	    		"B": null,
	    		"type": null,
	    		"criteria": 10,
	    		"name": null,
	    		"code": null
	    	};	
	    }
	    
	    //Edit
	    else {
	    	self.title = "Edit relation";
	    	
	    	self.title = "Add relation";
	    	self.relation = {
	    		"A": relation.A,
	    		"B": relation.B,
	    		"type": relation.type,
	    		"criteria": relation.criteria,
	    		"name": relation.name,
	    		"code": relation.code
	    	};	
	    	
		   	self.aSelected = getData(self.relation.A);
		   	self.bSelected = getData(self.relation.B);
		   	self.typeSelected = getType(self.relation.type);
		}
	   	
		function getData(dataCode) {
			for (var i = 0; i < self.indicators.length; i++) {
				if (self.indicators[i].code === dataCode) return self.indicators[i];
			}
		}
		
		function getType(typeCode) {
			for (var i = 0; i < self.types.length; i++) {
				if (self.types[i].code === typeCode) return self.types[i];
			}
		}

	   	
	   	
	    self.cancel = function () {
	        $modalInstance.close();
	    };
	    
	    self.save = function () {
	    
	    	self.relation.A = self.aSelected.code;
	    	self.relation.B = self.bSelected.code;
	    	self.relation.type = self.typeSelected.code;
	    	
	    	if (self.relation.type === 'do') self.relation.criteria = null;
	    	
	    		    	
	        $modalInstance.close({'relation': self.relation});
	    };
	    
	});
})();