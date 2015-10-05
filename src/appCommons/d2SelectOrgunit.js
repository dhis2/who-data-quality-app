(function() {

	var app = angular.module('dataQualityApp');

	app.directive('d2SelectOrgunit', function () {
		return {
			scope: {
				'ngModel': '=',
				'onSelect': '&',
				'defaultLevel': '=',
				'maxLevel': '='
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

				self.levelPlaceholder = "Select level...";
				self.groupPlaceholder = "Select group...";

				self.ngModel = {};

				function init() {

					self.selectedOrgunit = null;
					self.selectedLevel = null;
					self.selectedGroup = null;

					var promises = [];
					promises.push(d2Meta.userOrgunits());
					promises.push(d2Meta.objects('organisationUnitLevels', null, 'name,id,level'));
					promises.push(d2Meta.objects('organisationUnitGroups'));
					$q.all(promises).then(
						function(data) {
							self.userOrgunits = data[0];
							self.orgunitLevels = data[1];
							self.orgunitGroups = data[2];

							self.selectionType = 0;
							self.selectedOrgunit = self.userOrgunits[0];

							filterLevels();
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
					var invalidMin = self.selectedLevel && self.selectedLevel.level < minLevel ? true: false;
					var invalidMax = self.selectedLevel && maxLevel && self.selectedLevel.level > maxLevel ? true : false;
					if (invalidMin || invalidMax) {
						self.selectedLevel = null;
					}

				}


				function defaultLevel() {
					var selectedLevel = self.selectedOrgunit.level;
					var defaultLevel = self.defaultLevel ? selectedLevel + self.defaultLevel : null;

					for (var i = 0; !self.selectedLevel && defaultLevel && i < self.filteredLevels.length; i++) {
						if (self.filteredLevels[i].level === defaultLevel) {
							self.selectedLevel = self.filteredLevels[i];
							break;
						}
					}
				}


				function orgunitSelect(orgunit) {
					if (self.selectionType === self.userOrgunits.length) {
						if (!orgunit) orgunit = self.treeSelection;
						self.selectedOrgunit = orgunit;
					}
					else {
						self.selectedOrgunit = self.userOrgunits[self.selectionType];
					}

					filterLevels();
					defaultLevel();

					self.ngModel = {
						boundary: self.selectedOrgunit,
						level: self.selectedLevel,
						group: self.selectedGroup
					};

					if (self.selectedOrgunit) self.onSelect({orgunit: self.ngModel});

				}


				init();


				return self;
			}]);

})();