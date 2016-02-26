(function(){  
	/**Controller: Parameters*/
	angular.module('admin').controller("ModalMappingController",
	['$modalInstance', '$scope', 'requestService', 'd2Meta', 'd2Map', 'indicator',
	function($modalInstance, $scope, requestService, d2Meta, d2Map, indicator) {
	    	    
	    var self = this; 

		self.groups = d2Map.groups();
		//TODO: decide what to use
		for (var i = 0; i < self.groups.length; i++) {
			self.groups[i]['displayName'] = self.groups[i]['name']
		}

		if (!indicator) {
			self.custom = true;
			self.name = '';
			self.definition = '';
			self.groupsSelected = [];
			self.dataTypeSelected = 'dataElements';
			self.dataSelected = null;
			self.dataSetSelected = null;
		}
		else {
			self.custom = indicator.custom;
			self.name = indicator.name;
			self.definition = indicator.definition;
			self.groupsSelected = d2Map.numeratorGroups(indicator.code);
			self.dataTypeSelected = 'dataElements';
			self.dataSelected = null;
			self.dataSetSelected = null;
		}

		self.updateDataSetList = function (data) {
  	    	self.dataSetSelected = undefined;

  	    	if (!data) return;
			else self.dataSelected = data;

  	    	if (self.dataTypeSelected === 'dataElements') {

				var id = self.dataSelected.id.substr(0,11);
				d2Meta.object('dataElements', id, 'dataSets[displayName,id,periodType]')
		    		.then(function(data) {
	    			   	self.dataSets = data.dataSets;
	    			});
	    	}
	    	else {
				d2Meta.indicatorDataSets(self.dataSelected.id)
	    			.then(function(data) {
						self.dataSets = data;
	    			});
	    	}
  	    }

	    self.cancel = function () {
	        $modalInstance.close();
	    };
	    
	    self.save = function () {
			var updatedIndicator = {
				"name": self.name,
				"custom": self.custom,
				"definition": self.definition,
				"dataID": self.dataSelected.id,
				"dataSetID": self.dataSetSelected.id,
				"code": indicator && indicator.code ? indicator.code : null
			};

	        $modalInstance.close({'indicator': updatedIndicator, 'groups': self.groupsSelected});
	    };
	    
	}]);
})();