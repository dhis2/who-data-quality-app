(function() {

	var app = angular.module('dataQualityApp');

	app.directive('d2SelectOrgunit', function () {
		return {
			scope: {
				'ngModel': '=',
				'onSelect': '&',
				'defaultLevel': '=',
				'maxLevel': '=',
				'hideGroup': '=',
				'hideLevel': '='
			},
			bindToController: true,
			controller: "d2SelectOUController",
			controllerAs: 'd2sCtrl',
			templateUrl: 'appCommons/d2SelectOrgunit.html'
		};
	});
	
	app.controller("d2SelectOUController",
		['d2Meta', 'd2Utils', '$q',
			function(d2Meta, d2Utils, $q) {
				var self = this;

				self.orgunitSelect = orgunitSelect;
				self.selectLevel = selectLevel;
				self.selectGroup = selectGroup;

				self.levelPlaceholder = "Select level...";
				self.groupPlaceholder = "Select group...";
				self.selectionType = 0;

				self.ngModel = {};

				function init() {

					self.selectedOrgunit = null;
					self.selectedLevel = null;
					self.selectedGroup = null;
					self.treeSelection = null;

					var promises = [];
					promises.push(d2Meta.userOrgunits());
					promises.push(d2Meta.objects('organisationUnitLevels', null, 'displayName,id,level'));
					promises.push(d2Meta.objects('organisationUnitGroups'));
					$q.all(promises).then(
						function(data) {
							self.userOrgunits = data[0];
							self.orgunitLevels = d2Utils.arraySortByProperty(data[1], 'level', true, true);
							self.orgunitGroups = d2Utils.arraySortByProperty(data[2], 'displayName', false);

							self.selectionType = 0;
							self.selectedOrgunit = self.userOrgunits[0];
							orgunitSelect(self.selectedOrgunit);
						}
					);
				}


				function filterLevels() {
					if (!self.selectedOrgunit) {
						self.filteredLevels = self.orgunitLevels;
						return;
					}
					var minLevel = self.selectedOrgunit.level;
					var maxLevel = self.maxLevel ? minLevel + self.maxLevel: null;


					self.filteredLevels = [];
					var level;
					for (var i = 0; i < self.orgunitLevels.length; i++) {
						var level = self.orgunitLevels[i].level;

						var minOK = level > minLevel ? true : false;
						var maxOK = !maxLevel || level <= maxLevel ? true : false;
						if (minOK && maxOK) self.filteredLevels.push(self.orgunitLevels[i]);
					}

					//Remove currently selected level if not among the valid (filtered) ones
					var invalidMin = self.selectedLevel && self.selectedLevel.level <= minLevel ? true: false;
					var invalidMax = self.selectedLevel && maxLevel && self.selectedLevel.level > maxLevel ? true : false;
					if (invalidMin || invalidMax) {
						self.selectedLevel = null;
						self.ngModel.level = self.selectedLevel;
					}

				}


				function defaultLevel() {
					//If we have a group, don't set level
					if (self.selectedGroup) return;
					//If we don't have an orgunit, don't set level
					if (!self.selectedOrgunit) return;

					var selectedLevel = self.selectedOrgunit.level;
					var defaultLevel = self.defaultLevel ? selectedLevel + self.defaultLevel : null;

					for (var i = 0; !self.selectedLevel && defaultLevel && i < self.filteredLevels.length; i++) {
						if (self.filteredLevels[i].level === defaultLevel) {
							self.selectedLevel = self.filteredLevels[i];
							break;
						}
					}
					self.ngModel.level = self.selectedLevel;
				}


				function orgunitSelect(orgunit) {

					if (self.userOrgunits && self.selectionType === self.userOrgunits.length) {
						if (!orgunit) orgunit = self.treeSelection;
						self.selectedOrgunit = orgunit;
					}
					else {
						if (!d2Utils.isNumber(self.selectionType)) console.log("No selectionType");
						if (!self.userOrgunits) {
							console.log("No userOrgunits");
							return;
						}
						self.selectedOrgunit = self.userOrgunits[self.selectionType];
					}

					filterLevels();
					defaultLevel();

					self.ngModel = {
						boundary: self.selectedOrgunit,
						level: self.selectedLevel,
						group: self.selectedGroup
					};

					triggerOnSelect();

				}

				function selectLevel(object) {
					self.selectedLevel = object;
					self.ngModel.level = self.selectedLevel;

					triggerOnSelect();
				}


				function selectGroup(object) {
					self.selectedGroup = object;
					self.ngModel.group = self.selectedGroup;

					triggerOnSelect();
				}


				function triggerOnSelect() {
					if (self.ngModel && self.ngModel.boundary) {
						self.onSelect({'object': self.ngModel});
					}
				}

				init();


				return self;
			}]);

})();