
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
			self.denominatorRelations = d2Map.denominatorRelations();
			self.externalRelations = d2Map.externalRelations();
			self.relations = d2Map.relations();
			self.groups = d2Map.groups();
			self.dataSets = d2Map.dataSets();
	    }



		/** ===== NUMERATORS ===== **/

		self.numeratorMap = function(code) {

			var modalInstance = $modal.open({
				templateUrl: "moduleAdmin/adminMapping.html",
				controller: "ModalMappingController",
				controllerAs: 'mapCtrl',
				resolve: {
					indicator: function () {
						return code ? d2Map.numerators(code) : null;
					}
				}
			});

			modalInstance.result.then(function (result) {

				if (result) {
					var indicator = result.indicator;
					var groups = result.groups;
					var core = result.core;

					//new
					if (indicator.code === null) {
						d2Map.numeratorAdd(indicator, groups, core);
					}

					//update
					else {
						d2Map.numeratorUpdate(indicator, groups, core);
					}

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


		self.numeratorToggleCore = function (code) {

			if (isCore(code)) {
				d2Map.numeratorRemoveCore(code);
			}
			else {
				d2Map.numeratorMakeCore(code);
			}

		}


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

		/** ===== DENOMINATOR RELATIONS ===== */

		self.editDenominatorRelation = function(denominatorRelation) {

			var modalInstance = $modal.open({
				templateUrl: "moduleAdmin/adminDenominatorRelation.html",
				controller: "ModalAddEditDenominatorRelationController",
				controllerAs: 'addCtrl',
				resolve: {
					denominatorRelation: function () {
						return denominatorRelation;
					}
				}
			});

			modalInstance.result.then(function (result) {
				if (result) {
					d2Map.denominatorRelationAddEdit(result.denominatorRelation);
				}
			});
		};


		self.deleteDenominatorRelation = function(code) {

			d2Map.denominatorRelationDelete(code);
		}


		/** ===== EXTERNAL RELATIONS ===== */

		self.editExternalRelation = function(externalRelation) {

			var modalInstance = $modal.open({
				templateUrl: "moduleAdmin/adminExternalRelation.html",
				controller: "ModalAddEditExternalRelationController",
				controllerAs: 'addCtrl',
				resolve: {
					externalRelation: function () {
						return externalRelation;
					}
				}
			});

			modalInstance.result.then(function (result) {
				if (result) {
					d2Map.externalRelationAddEdit(result.externalRelation);
				}
			});
		};


		self.deleteExternalRelation = function(code) {

			d2Map.externalRelationDelete(code);
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
			return d2Map.numeratorIsCore(code);
		}


		self.d2NameFromID = function(id) {
			if (id) return d2Map.d2NameFromID(id);
			else return '';
		};


		self.d2NameFromCode = function(code) {
			if (!code) return '';

			//Numerator
			var data = d2Map.numerators(code);
			if (data && data.dataID) return d2Map.d2NameFromID(data.dataID);

			//Denominator
			data = d2Map.denominators(code);
			if (data && data.dataID) return d2Map.d2NameFromID(data.dataID);

			else return '';
		};


		self.denominatorNameFromCode = function (code) {
			if (!code) return '';
			return d2Map.denominatorType(code);
		}


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

