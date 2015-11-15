
(function(){
	
	angular.module('admin', []);
	
	/**Controller: Parameters*/
	angular.module('admin').controller("AdminController",
	['$modal', 'notificationService', 'd2Map',
	function($modal, notificationService, d2Map) {
	    	    
	    var self = this;

		d2Map.load().then(
			function(data) {
				init();
			},
			function(error) {
				console.log("Unable to get mapping");
			}
		);
	    
	    function init() {
   		    self.activeTab = true;
	    	self.outlierOptions = makeOutlierOptions();
	    	
	    	self.groupSelect = {};

			self.isAdmin = false;
			d2Map.admin().then(function(data) {
				self.isAdmin = data;
				if (!data) {
					notificationService.notify('Info', "You do not have the required authorities to change the " +
						"configuration of the Data Quality Tool. However, you can use this module to look at " +
						"the existing data quality parameters.");
				}
				else {
					d2Map.versionUpgrade();
				}
			});

			self.numerators = d2Map.numerators();
			self.denominators = d2Map.denominators();
			self.relations = d2Map.relations();
			self.groups = d2Map.groups();
			self.dataSets = d2Map.dataSets();
	    }



		/** ===== NUMERATORS ===== **/

		self.numeratorAdd = function () {

			var modalInstance = $modal.open({
				templateUrl: "moduleAdmin/adminIndicator.html",
				controller: "ModalAddIndicatorController",
				controllerAs: 'addCtrl',
				resolve: {
					groups: function () {
						return d2Map.groups();
					}
				}
			});

			modalInstance.result.then(function (result) {
				if (result) {
					d2Map.numeratorAdd(result.name, result.definition, result.group);
				}
			});
		};


		self.numeratorMap = function(code) {

			var modalInstance = $modal.open({
				templateUrl: "moduleAdmin/adminMapping.html",
				controller: "ModalMappingController",
				controllerAs: 'mapCtrl',
				resolve: {
					indicator: function () {
						return angular.copy(d2Map.numerators(code));
					},
					groups: function () {
						return self.dataGroups(code);
					}
				}
			});

			modalInstance.result.then(function (result) {
				console.log(result);

				if (result) {
					d2Map.numeratorUpdate(result);
				}
			});
		};


		self.numeratorClear = function(code) {
			d2Map.numeratorClear(code);
		};


		self.numeratorDelete = function(code) {
			d2Map.numeratorDelete(code);
		};


		self.numeratorSort = function(indicator) {

			var groups = self.dataGroups(indicator.code);
			var firstGroup = groups.split(',')[0];

			return firstGroup + indicator.name;
		};



		/** ===== NUMERATOR GROUPS ===== **/

		self.groupAdd = function () {

			var modalInstance = $modal.open({
				templateUrl: "moduleAdmin/adminIndicatorGroup.html",
				controller: "ModalAddIndicatorGroupController",
				controllerAs: 'addCtrl'
			});

			modalInstance.result.then(function (result) {
				if (result) {

					d2Map.groupAdd(result.name);

				}
			});
		};


		self.groupDelete = function () {

			var modalInstance = $modal.open({
				templateUrl: "moduleAdmin/adminIndicatorGroupDelete.html",
				controller: "ModalDeleteIndicatorGroupController",
				controllerAs: 'addCtrl',
				resolve: {
					groups: function () {
						return self.groups;
					}
				}
			});

			modalInstance.result.then(function (result) {
				if (result) {

					d2Map.groupDelete(result.group);

				}
			});
		};


		self.groupAddNumerators = function(groupCode) {
			d2Map.groupAddNumerator(groupCode, self.groupSelect[groupCode].code)
		};


		self.groupRemoveNumerators = function(groupCode, dataCode) {
			d2Map.groupRemoveNumerator(groupCode, dataCode);
		};


		self.groupFilterNumerators = function (currentMembers) {
			return function(item) {

				for (var i = 0; i < currentMembers.length; i++) {
					if (currentMembers[i] === item.code) return false;
				}
				return true;
			}
		};



		/** ===== NUMERATOR RELATIONS ===== **/


		self.editRelation = function(relation) {

			var modalInstance = $modal.open({
				templateUrl: "moduleAdmin/adminRelation.html",
				controller: "ModalAddEditRelationController",
				controllerAs: 'addCtrl',
				resolve: {
					indicators: function () {
						return d2Map.numeratorsConfigured();
					},
					relation: function () {
						return angular.copy(relation);
					}
				}
			});

			modalInstance.result.then(function (result) {
				if (result) {
					//check if new or existing (= has code already)
					d2Map.relationAddEdit(result.relation);
				}
			});

		};


		self.deleteRelation = function(code) {
			d2Map.relationDelete(code);
		}


		self.relationType = function (typeCode) {
			return d2Map.dataRelationType(typeCode);
		};


		/** ===== DENOMINATORS ===== */

		self.editDenominator = function(denominator) {


			var modalInstance = $modal.open({
				templateUrl: "moduleAdmin/adminDenominator.html",
				controller: "ModalAddEditDenominatorController",
				controllerAs: 'addCtrl',
				resolve: {
					denominator: function () {
						return denominator;
					}
				}
			});

			modalInstance.result.then(function (result) {
				if (result) {

					d2Map.denominatorAddEdit(result.denominator);

				}
			});

		};


		self.deleteDenominator = function(code) {

			d2Map.denominatorDelete(code);

		}



		/** ===== D2MAP WRAPPERS FOR PRESENTATION ===== **/

		self.dataGroups = function(code) {
			var groups = d2Map.numeratorGroups(code);
			var groupNames = [];
			for (var i = 0; i < groups.length; i++) {
				groupNames.push(groups[i].name);
			}
			return groupNames.sort().join(', ');
		};


		self.isCore = function(code) {
			var core = d2Map.groupNumerators('core');
			for (var i = 0; i < core.length; i++) {
				if (core[i].code === code) return true;
			}
			return false;
		}


		self.d2NameFromID = function(id) {
			if (id) return d2Map.d2NameFromID(id);
			else return '';
		};


		self.d2NameFromCode = function(code) {
			if (!code) return '';

			var data = d2Map.numerators(code);
			if (data && data.dataID) return d2Map.d2NameFromID(data.dataID);
			else return '';
		};


		self.getIndicatorsInGroup = function(code) {

			return d2Map.groupNumerators(code);

		};


		self.saveParameterChanges = function () {
			d2Map.save();
		};



		/** ===== UTILITIES ===== **/
		function makeOutlierOptions() {
			var opts = [];
			for (var i = 1.5; i <= 4.05; i += 0.1) {
				opts.push({'val': (Math.round(10*i)/10), 'label': (Math.round(10*i)/10).toString()});
			}
			return opts;
		}



		return self;
		
	}]);
	
})();

