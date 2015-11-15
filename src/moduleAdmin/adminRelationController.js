(function(){  
	/**Controller: Parameters*/
	angular.module('admin').controller("ModalAddEditRelationController",
	['$modalInstance', 'indicators', 'relation', 'd2Map', 'd2Utils',
	function($modalInstance, indicators, relation, d2Map, d2Utils) {
	    	    
	    var self = this;
    	self.aSelected = null;
    	self.bSelected = null;
    	
    	self.types = d2Map.dataRelationTypes();
    	self.typeSelected = null;

		//Make a dropdown list with numerator codes and DHIS names
		self.numeratorList = [];
		for (var i = 0; i < indicators.length; i++) {
			if (indicators[i].dataID) {
				self.numeratorList.push(
					{
						'name': d2Map.d2NameFromID(indicators[i].dataID),
						'id': indicators[i].dataID,
						'code': indicators[i].code
					}
				);
			}
		}
		d2Utils.arraySortByProperty(self.numeratorList, 'name', false);

    	    	
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
			for (var i = 0; i < self.numeratorList.length; i++) {
				if (self.numeratorList[i].code === dataCode) return self.numeratorList[i];
			}
		}
		
		function getType(typeCode) {
			d2Map.dataRelationType(typeCode);
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
	    
	}]);
})();