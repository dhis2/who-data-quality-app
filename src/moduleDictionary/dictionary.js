(function(){

	angular.module('dictionary', []);

	/**Controller: Parameters*/
	angular.module('dictionary').controller("DictController",
		['d2Meta', 'd2Utils', 'dqAnalysisDictionary', function(d2Meta, d2Utils, dqDict) {
			var self = this;
			init();

			//"Public"
			self.updateGroups = updateGroups;
			self.updateElements = updateElements;
			self.updateElement = updateElement;


			/** USER INTERFACE **/
			function updateGroups() {
				if (!self.meta.type) return;

				self.loading = true;

				self.meta.group = null;
				self.meta.groups = null;
				self.meta.elements = null;

				switch (self.meta.type.id) {

					case 'ds':
						d2Meta.objects('dataSets').then(function(datasets) {
							self.loading = false;
							self.meta.groups = datasets;
						});
						break;

					case 'de':
						d2Meta.objects('dataElementGroups').then(function(datasets) {
							self.loading = false;
							self.meta.groups = datasets;
						});
						break;

					case 'in':
						d2Meta.objects('indicatorGroups').then(function(datasets) {
							self.loading = false;
							self.meta.groups = datasets;
						});
						break;
				}
			}

			/** USER INTERFACE **/
			function updateElements() {
				if (!self.meta.group) return;

				self.loading = true;
				self.meta.elements = null;

				switch (self.meta.type.id) {
					case 'ds':
						d2Meta.object('dataSets', self.meta.group.id, 'dataElements[displayName,id]').then(
							function(dataSet) {
								self.loading = false;
								self.meta.elements = d2Utils.arraySortByProperty(dataSet.dataElements, 'displayName', false);
						});
						break;

					case 'de':
						d2Meta.object('dataElementGroups', self.meta.group.id, 'dataElements[displayName,id]').then(
							function(dataElementGroup) {
								self.loading = false;
								self.meta.elements = d2Utils.arraySortByProperty(dataElementGroup.dataElements, 'displayName', false);
						});
						break;

					case 'in':
						d2Meta.object('indicatorGroups', self.meta.group.id, 'indicators[displayName,id]').then(
							function(indicatorGroup) {
								self.loading = false;
								self.meta.elements = d2Utils.arraySortByProperty(indicatorGroup.indicators, 'displayName', false);
							});
						break;
				}
			}


			function updateElement() {
				if (!self.meta.element) return;

				self.result = null;
				self.loading = true;

				switch (self.meta.type.id) {
					case 'ds':
						dqDict.dataElement(self.meta.element.id).then(function(data) {
							self.loading = false;
							self.result = data;
						});
						break;

					case 'de':
						dqDict.dataElement(self.meta.element.id).then(function(data) {
							self.loading = false;
							self.result = data;
						});
						break;

					case 'in':
						dqDict.indicator(self.meta.element.id).then(function(data) {
							self.loading = false;
							self.result = data;
						});
						break;
				}
			}


			/** INITIALISATION **/
			function init() {
				self.meta = {
					types: [
						{displayName: "Data set", id: 'ds'},
						{displayName: "Data elements", id: 'de'},
						{displayName: "Indicators", id: 'in'}
					],
					type: null,
					groups: null,
					group: null,
					elements: null,
					element: null
				};

				self.result;

			}

			return self;

		}]);

})();