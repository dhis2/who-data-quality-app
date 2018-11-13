/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */


angular.module("admin", ["d2"]);

require("./adminDenominatorController.js");
require("./adminDenominatorRelationController.js");
require("./adminExternalRelationController.js");
require("./adminNumeratorController.js");
require("./adminNumeratorGroupController.js");
require("./adminNumeratorGroupDeleteController.js");
require("./adminNumeratorRelationController.js");


/**Controller: Parameters*/

angular.module("admin").controller("AdminController",
	["$uibModal", "notificationService", "d2Map", "d2Meta",
		function($uibModal, notificationService, d2Map, d2Meta) {

			var self = this;

			d2Map.load().then(
				function() {
					init();
				},
				function() {
					console.log("Unable to get mapping");
				}
			);

			function init() {
				self.activeTab = true;
				self.outlierOptionsModerate = makeOutlierOptions();
				self.outlierOptionsExtreme = makeOutlierOptions();
				self.outlierOptionsExtreme.shift();

				self.groupSelect = {};

				self.isAdmin = false;
				d2Map.admin().then(function(data) {
					self.isAdmin = data;
					if (!data) {
						notificationService.notify("Info", "You do not have the required authorities to change the " +
							"configuration of the Data Quality Tool. However, you can use this module to look at " +
							"the existing data quality parameters.");
					}
					else {
						d2Map.versionUpgrade();
					}
				});

				d2Meta.objects("organisationUnitLevels", null, "displayName,id,level", null, false).then(function(data) {
					self.orgunitLevels = data;
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

				var modalInstance = $uibModal.open({
					template: require("./adminNumerator.html"),
					controller: "ModalMappingController",
					controllerAs: "mapCtrl",
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
						if (!indicator.hasOwnProperty("code")) {
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
				var firstGroup = groups.split(",")[0];

				return firstGroup + indicator.name;
			};


			self.numeratorToggleCore = function (code) {

				if (self.isCore(code)) {
					d2Map.numeratorRemoveCore(code);
				}
				else {
					d2Map.numeratorMakeCore(code);
				}

			};


			/** ===== NUMERATOR GROUPS ===== **/

			self.groupAdd = function () {

				var modalInstance = $uibModal.open({
					template: require("./adminNumeratorGroup.html"),
					controller: "ModalAddIndicatorGroupController",
					controllerAs: "addCtrl"
				});

				modalInstance.result.then(function (result) {
					if (result) {

						d2Map.groupAdd(result.name);

					}
				});
			};


			self.groupDelete = function () {

				var modalInstance = $uibModal.open({
					template: require("./adminNumeratorGroupDelete.html"),
					controller: "ModalDeleteIndicatorGroupController",
					controllerAs: "addCtrl",
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
				d2Map.groupAddNumerator(groupCode, self.groupSelect[groupCode].code);
			};


			self.groupRemoveNumerators = function(groupCode, dataCode) {
				d2Map.groupRemoveNumerator(groupCode, dataCode);
			};


			self.groupFilterNumerators = function (currentMembers) {
				return function(item) {

					for (let i = 0; i < currentMembers.length; i++) {
						if (currentMembers[i] === item.code) return false;
					}
					return true;
				};
			};



			/** ===== NUMERATOR RELATIONS ===== **/


			self.editRelation = function(relation) {

				var modalInstance = $uibModal.open({
					template: require("./adminNumeratorRelation.html"),
					controller: "ModalAddEditRelationController",
					controllerAs: "addCtrl",
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
			};


			self.relationType = function (typeCode) {
				return d2Map.dataRelationType(typeCode);
			};


			/** ===== DENOMINATORS ===== */

			self.editDenominator = function(denominator) {

				var modalInstance = $uibModal.open({
					template: require("./adminDenominator.html"),
					controller: "ModalAddEditDenominatorController",
					controllerAs: "addCtrl",
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
			};

			/** ===== DENOMINATOR RELATIONS ===== */

			self.editDenominatorRelation = function(denominatorRelation) {

				var modalInstance = $uibModal.open({
					template: require("./adminDenominatorRelation.html"),
					controller: "ModalAddEditDenominatorRelationController",
					controllerAs: "addCtrl",
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
			};


			/** ===== EXTERNAL RELATIONS ===== */

			self.editExternalRelation = function(externalRelation) {

				var modalInstance = $uibModal.open({
					template: require("./adminExternalRelation.html"),
					controller: "ModalAddEditExternalRelationController",
					controllerAs: "addCtrl",
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
			};



			/** ==== D2META WRAPPERS FOR PRESENTATION ==== **/
			self.d2OrgunitLevelNameFromLevel = function(level) {

				for (let i = 0; self.orgunitLevels && i < self.orgunitLevels.length; i++) {
					if (self.orgunitLevels[i].level === level) {
						return self.orgunitLevels[i].displayName;
					}
				}
				return "Level " + level;
			};



			/** ===== D2MAP WRAPPERS FOR PRESENTATION ===== **/

			self.dataGroups = function(code) {
				var groups = d2Map.numeratorGroups(code);
				var groupNames = [];
				for (let i = 0; i < groups.length; i++) {
					groupNames.push(groups[i].name);
				}
				return groupNames.sort().join(", ");
			};


			self.isCore = function(code) {
				return d2Map.numeratorIsCore(code);
			};


			self.d2NameFromID = function(id) {
				if (id) return d2Map.d2NameFromID(id);
				else return "";
			};


			self.d2NameFromCode = function(code) {
				if (!code) return "";

				//Numerator
				var data = d2Map.numerators(code);
				if (data && data.dataID) return d2Map.d2NameFromID(data.dataID);

				//Denominator
				data = d2Map.denominators(code);
				if (data && data.dataID) return d2Map.d2NameFromID(data.dataID);

				else return "";
			};


			self.denominatorNameFromCode = function (code) {
				if (!code) return "";
				return d2Map.denominatorType(code);
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
				opts.push({"val": -1, "label": "Ignore"});
				for (let i = 1.5; i <= 4.05; i += 0.1) {
					opts.push({"val": (Math.round(10*i)/10), "label": (Math.round(10*i)/10).toString()});
				}
				return opts;
			}



			return self;

		}]);
