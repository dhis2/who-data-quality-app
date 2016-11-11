(function(){  
	/**Controller: Parameters*/
	angular.module('admin').controller("ModalMappingController",
	['$uibModalInstance', '$scope', 'requestService', 'd2Meta', 'd2Map', 'indicator',
	function($uibModalInstance, $scope, requestService, d2Meta, d2Map, indicator) {
	    	    
	    var self = this; 

		self.groups = angular.copy(d2Map.groups());

		for (var i = 0; i < self.groups.length; i++) {
			self.groups[i]['displayName'] = self.groups[i]['name']
		}

		if (!indicator) {
			//Set up new indicator structure
			indicator = {
				'core': false,
				'custom': true,
				'name': '',
				'definition': '',
				'groupsSelected': [],
				'dataTypeSelected': 'dataElements',
				'dataSelected': null,
				'dataSetSelected': null
			}
		}

		//TODO: Could just assign self.indicator
		self.core = d2Map.numeratorIsCore(indicator.code);
		self.custom = indicator.custom;
		self.name = indicator.name;
		self.definition = indicator.definition;
		self.groupsSelected = d2Map.numeratorGroups(indicator.code);
		for (var i = 0; i < self.groupsSelected.length; i++) {
			self.groupsSelected[i]['displayName'] = self.groupsSelected[i]['name']
		}
		self.dataTypeSelected = 'dataElements';
		self.dataSelected = null;
		self.dataSetSelected = null;




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

  	    self.updateDataElementOperandList = function () {
			self.dataCompletenessSelected = undefined;

			//If data element, get operands
			if (self.dataTypeSelected === 'dataElements') {
				d2Meta.objects('dataElementOperands', null, 'displayName,id', 'dataElementId:eq:' + self.dataSelected.id.substr(0,11), false).then(
					function (data) {
						self.dataCompleteness = data;
					}
				);
			}

			//If indicator, get data elements, then operands
			else {
				d2Meta.indicatorDataElements(self.dataSelected.id).then(
					function (data) {

						var ids = [];
						for (var i = 0; i < data.length; i++) {
							ids.push(data[i].id);
						}

						d2Meta.objects('dataElementOperands', null, 'displayName,id', 'dataElementId:in:[' + ids.join(',') + ']', false).then(
							function (data) {
								self.dataCompleteness = data;
							}
						);
					}
				);
			}
		}

	    self.cancel = function () {
	        $uibModalInstance.close();
	    };
	    
	    self.save = function () {
			indicator.name = self.name;
			indicator.core = self.core;
			indicator.definition = self.definition;
			indicator.dataID = self.dataSelected.id;
			indicator.dataSetID = self.dataSetSelected.id;
			indicator.dataElementOperandID = self.dataCompletenessSelected.id;

			delete indicator.groupsSelected;
			delete indicator.dataTypeSelected;
			delete indicator.dataSelected;
			delete indicator.dataSetSelected;
			delete indicator.dataCompletenessSelected;

	        $uibModalInstance.close({'indicator': indicator, 'groups': self.groupsSelected, 'core': self.core});
	    };
	    
	}]);
})();