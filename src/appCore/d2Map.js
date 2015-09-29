(function(){

	angular.module('d2').factory('d2Map',
		['requestService', 'd2Meta', 'd2Utils', '$q',
			function (requestService, d2Meta, d2Utils, $q) {

				//Define factory API
				var service = {
					ready: ready,
					mapping: mapping,
					admin: admin
				};

				var _ready = false;
				var _map;
				var _d2Objects;

				/**
				 * Check if mapping is "ready", e.g. has been downloaded from server
				 *
				 * @returns {boolean}
				 */
				function ready() {
					return _ready;
				}


				function mapping() {
					var deferred = $q.defer();

					requestService.getSingleData('/api/systemSettings/DQAmapping').then(
						function(data) {
							_map = data;

							var dataIDs;
							for (var i = 0; i < _map.data.length; i++) {
								if (_map.data[i].localData && _map.data[i].localData.id) {
									dataIDs.push(_map.data[i].localData.id);
								}
							}
							for (var i = 0; i < _map.dataSets.length; i++) {
								dataIDs.push(_map.dataSets[i].id);
							}
							for (var i = 0; i < _map.dataSets.length; i++) {
								dataIDs.push(_map.dataSets[i].id);
							}
							var promises = [];
							promises.push(d2Meta.object('dataElement', dataIDs));
							promises.push(d2Meta.object('indicator', dataIDs));
							promises.push(d2Meta.object('dataSet', dataIDs, 'name,id,periodType'));
							$q.all(promises).then(
								function(datas) {
									for (var i = 0; i < datas.length; i++) {
										for (var j = 0; j < datas[i].length; j++) {
											_d2Objects[datas[i][j].id] = datas[i][j];
										}
									}
									_ready = true;
									deferred.resolve(true);
								}
							);

						},
						function(error) {
							console.log('Error in getMapping()');
							console.log('Error');
						}
					);

					return deferred.promise;
				}


				function group() {

					return _map.groups;
				}



				function indicator(code) {
					if (code) {
						for (var i = 0; i < _map.data.length; i++) {
							if (data[i].code === dataCode) return data[i];
						}
					}
					else {
						return _map.data;
					}
				}



				function indicatorDataSet(code) {
					var indicator = indicator(code);
					return dataSet(indicator.dataSetID);

				}


				function dataSet(id) {
					if (id) {
						for (var i = 0; i < _map.dataSets.length; i++) {
							if (datasets[i].id === id) {
								return datasets[i];
							}
						}
					}
					else {
						return _map.dataSets;
					}
				}


				function groupData(code) {
					var dataCodes;
					if (!code) {
						return _map.data;
					}
					else if (groupCode != 'core') {
						for (var i = 0; i < _map.groups.length; i++) {
							if (_map.groups[i].code === groupCode) {
								dataCodes = groups[i].members;
								break;
							}
						}
					}
					else {
						dataCodes = self.getCoreData();
					}

					var dataInGroup = [];
					for (var i = 0; i < dataCodes.length; i++) {
						for (var j = 0; j < _map.data.length; j++) {
							if (data[j].localData && (dataCodes[i] === data[j].code)) {
								dataInGroup.push(data[j]);
								break;
							}
						}
					}

					return dataInGroup;
				}



				function groupDataSet(code) {

					var dataSets = [];
					var data = groupData(code);
					for (var i = 0; i < data.length; i++ ) {
						dataSets.push(dataSet(data[i].dataSetID));
					}

					d2Utils.arrayRemoveDuplicates(dataSets);
					return dataSets;
				}



				function relations(code) {
					if (code) {
						var relations = [];
						for (var i = 0; i < _map.relations.length; i++) {
							if (indicatorIsRelevant(_map.relations[i].A, groupCode) ||
								indicatorIsRelevant(_map.relations[i].B, groupCode)) {
								relations.push(_map.relations[i]);
							}
						}
					}
					else {
						return _map.relations;
					}

					return relations;
				}


				function admin() {
					var deferred = $q.defer();
					requestService.getSingle('/api/currentUser.json?fields=userCredentials[userRoles]').then(
						function(response) { //success
							var data = response.data.userCredentials.userRoles;
							var IDs = [];
							for (var i = 0; i < data.length; i++) {
								IDs.push(data[i].id);
							}

							requestService.getSingle('/api/userRoles.json?fields=authorities&filter=id:in:[' + IDs.join(',') + ']')
								.then(function(response) {
									var authorized = false;

									var data = response.data.userRoles;
									for (var i = 0; !authorized && i < data.length; i++) {
										for (var j = 0; !authorized && j < data[i].authorities.length; j++) {
											if (data[i].authorities[j] === 'M_dhis-web-maintenance-settings') {
												authorized = true;
											}
											if (data[i].authorities[j] === 'ALL') {
												authorized = true;
											}
										}
									}

									deferred.resolve(authorized);
								});



						}
					);

					return deferred.promise;
				}


				/** UTILITIES **/
				function indicatorIsRelevant(dataCode, groupCode) {

					var data = indicator(groupCode);

					for (var i = 0; i < data.length; i++) {
						if (data[i].code === dataCode) return true
					}

					return false;
				}




				return service;

			}]);

})();
