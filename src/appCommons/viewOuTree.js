/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

(function() {

	var app = angular.module("appCommons");

	app.directive("ouTree", function () {
		return {
			scope: {
				"onSelect": "&",
				"ngModel": "=?"
			},
			bindToController: true,
			controller: "ouTreeController",
			controllerAs: "ouCtrl",
			template: require("./viewOuTree.html")
		};
	});


	app.controller("ouTreeController",
		["d2Meta", "d2Utils",
			function(d2Meta, d2Utils) {
				var self = this;

				function ouTreeInit() {

					self.ouTreeData = [];
					self.ouTreeControl = {};

					//Get initial batch of orgunits and populate
					d2Meta.userAnalysisOrgunits().then(function(data) {

						//Iterate in case of multiple roots
						for (let i = 0; i < data.length; i++) {
							var ou = data[i];
							var root = {
								label: ou.displayName,
								data: {
									ou: ou
								},
								children: []
							};


							d2Utils.arraySortByProperty(ou.children, "displayName", false);

							for (let j = 0; ou.children && j < ou.children.length; j++) {

								var child = ou.children[j];

								root.children.push({
									label: child.displayName,
									data: {
										ou: child
									},
									noLeaf: child.children
								});
							}


							self.ouTreeData.push(root);
							self.ouTreeControl.select_first_branch();
							self.ouTreeControl.expand_branch(self.ouTreeControl.get_selected_branch());

						}
					});

				}

				self.ouTreeSelect = function (orgunit) {
					if (orgunit.noLeaf && orgunit.children.length < 1) {

						//Get children
						d2Meta.object("organisationUnits", orgunit.data.ou.id, "children[displayName,id,level,children::isNotEmpty]").then(
							function (data) {
								var children = data.children;
								d2Utils.arraySortByProperty(children, "displayName", false);
								for (let i = 0; i < children.length; i++) {
									var child = children[i];
									if (!orgunit.children) orgunit.children = [];
									orgunit.children.push({
										label: child.displayName,
										data: {
											ou: child
										},
										noLeaf: child.children
									});

								}
							}
						);
					}
					self.ngModel = orgunit.data.ou;
					self.onSelect({"object": orgunit.data.ou});

				};

				ouTreeInit();

				return self;
			}]);

})();