/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */


/**Controller: Parameters*/
angular.module("outlierGapAnalysis").controller("ModalGraphController",
	["$uibModalInstance", "requestService", "ouName", "dxName", "chartOptions", "chartData",
		function($uibModalInstance, requestService, ouName, dxName, chartOptions, chartData) {

			var self = this;

			self.dxName = dxName;
			self.ouName = ouName;
			self.chartOptions = chartOptions;
			self.chartData = chartData;



			self.close = function () {
				$uibModalInstance.close(self.text);
			};

		}]);
