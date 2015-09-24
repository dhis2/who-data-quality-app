(function(){

	angular.module('dictionary', []);

	/**Controller: Parameters*/
	angular.module('dictionary').controller("DictController",
		['d2Meta', function(d2Meta) {
			var self = this;
			init();

			self.updateGroups = updateGroups;
			self.updateElements = updateElements;






			/** USER INTERFACE **/
			function updateGroups() {
				if (!self.meta.type) return;
				switch (self.meta.type.id) {

					case 'ds':
						self.meta.elements = null;
						self.meta.groups = null;
						d2Meta.datasets().then(function(datasets) {
							self.meta.groups = datasets;
						});
						break;

					case 'de':
						self.meta.elements = null;
						self.meta.groups = null;
						d2Meta.dataElementGroups().then(function(datasets) {
							self.meta.groups = datasets;
						});
						break;

					case 'in':
						self.meta.elements = null;
						self.meta.groups = null;
						d2Meta.indicatorGroups().then(function(datasets) {
							self.meta.groups = datasets;
						});
						break;
				}
			}

			/** USER INTERFACE **/
			function updateElements() {
				if (!self.meta.type) return;
				switch (self.meta.type.id) {

					case 'ds':
						self.meta.elements = null;
						d2Meta.datasetDataElements(self.meta.group.id).then(function(dataElements) {
							self.meta.elements = dataElements;
						});
						break;

					case 'de':
						self.meta.elements = null;
						d2Meta.dataElementGroupDataElements(self.meta.group.id).then(function(dataElements) {
							self.meta.elements = dataElements;
						});
						break;

					case 'in':
						self.meta.elements = null;
						d2Meta.indicatorGroupIndicators(self.meta.group.id).then(function(indicators) {
							self.meta.elements = indicators;
						});
						break;
				}
			}


			function updateElement() {
				if (!self.meta.type) return;
				switch (self.meta.type.id) {

					case 'ds':
						self.meta.elements = null;
						d2Meta.datasetDataElements(self.meta.group.id).then(function(dataElements) {
							self.meta.elements = dataElements;
						});
						break;

					case 'de':
						self.meta.elements = null;
						d2Meta.dataElementGroupDataElements(self.meta.group.id).then(function(dataElements) {
							self.meta.elements = dataElements;
						});
						break;

					case 'in':
						self.meta.elements = null;
						d2Meta.indicatorGroupIndicators(self.meta.group.id).then(function(indicators) {
							self.meta.elements = indicators;
						});
						break;
				}
			}


			/** INITIALISATION **/
			function init() {
				self.meta = {
					types: [
						{name: "Data set", id: 'ds'},
						{name: "Data elements", id: 'de'},
						{name: "Indicators", id: 'in'}
					],
					type: null,
					groups: null,
					group: null,
					elements: null,
					element: null
				};
			}

			return self;

		}]);

})();