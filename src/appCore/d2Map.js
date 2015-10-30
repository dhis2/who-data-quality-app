(function(){

	angular.module('d2').factory('d2Map',
		['requestService', 'd2Meta', 'd2Utils', '$q',
			function (requestService, d2Meta, d2Utils, $q) {

				//Define factory API
				var service = {
					ready: ready,
					load: load,
					save: save,
					admin: admin,
					groups: groups,
					configuredGroups: configuredGroups,
					groupDelete: deleteGroup,
					groupAdd: addGroup,
					groupDataSets: groupDataSets,
					groupNumerators: groupIndicators,
					groupRelations: groupRelations,
					groupAddNumerator: addToGroup,
					groupRemoveNumerator: removeFromGroup,
					groupsRemoveNumerator: removeFromGroups,
					numerators: indicators,
					numeratorsConfigured: configuredIndicators,
					numeratorGroups: indicatorGroups,
					numeratorClear: clearIndicator,
					numeratorAdd: addIndicator,
					numeratorDelete: numeratorDelete,
					numeratorUpdate: updateIndicator,
					denominators: denominators,
					denominatorsConfigured: denominatorsConfigured,
					denominatorAddEdit: addEditDenominator,
					denominatorDelete: deleteDenominator,
					dataSets: dataSets,
					dataSetPeriodType: dataSetPeriodType,
					relations: relations,
					relationAddEdit: addEditRelation,
					relationDelete: deleteRelation,
					dataRelationTypes: dataRelationTypes,
					dataRelationType: dataRelationType,
					d2NameFromID: d2NameFromID
				};

				var _ready = false;
				var _map;
				var _d2Objects = {};
				var _dataIDs;

				/**
				 * Check if mapping is "ready", e.g. has been downloaded from server
				 *
				 * @returns {boolean}
				 */
				function ready() {
					return _ready;
				}


				function load() {
					var deferred = $q.defer();

					requestService.getSingleData('/api/systemSettings/DQAmapping').then(
						function(data) {
							_map = data;
							if (_map) {
								d2CoreMeta();
								_ready = true;
								deferred.resolve(true);
							}
							else {
								console.log("No map exists");

								//Try to load template
								template().then(
									function (result) {
										if (result) {
											deferred.resolve(false);
											_ready = false;
										}
										else {
											deferred.resolve(true);
											_ready = true;
										}

									}
								);

							}
						},
						function(error) {
							console.log('Error in getMapping()');
							console.log('Error');
						}
					);

					return deferred.promise;
				}


				function save() {


					//Check if we have new DHIS 2 ids to fetch;
					var currentIDs = d2IDs().join('');
					var previousIDs = _dataIDs.join('');
					if (currentIDs != previousIDs) d2CoreMeta();

					return requestService.post('/api/systemSettings/', {'DQAmapping': angular.toJson(_map)});
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


				function template() {
					var deferred = $q.defer();

					//Check if user is authorized
					admin().then(
						function (authorized) {
							if (authorized) {

								//If authorized, get json tempalte
								requestService.getSingleLocal('data/metaData.json').then(function(response) {

									_map = response.data;

									//Save template to systemSettings
									requestService.post('/api/systemSettings/', {'DQAmapping': angular.toJson(_map)}).then(
										function (data) {

											_ready = true;
											deferred.resolve(true);
										},
										function (data) {
											_ready = false;
											deferred.resolve(false);
										}
									);
								});
							}
							deferred.resolve(false);
						}
					);

					return deferred.promise;
				}



				/** ===== GROUPS ===== **/

				/**
				 * Return specified group, or all if no group is specified
				 *
				 * @param code
				 * @returns {*}
				 */
				function groups(code) {
					if (code) {
						for (var i = 0; i < _map.groups.length; i++) {
							if (_map.groups[i].code === code) return _map.groups[i];
						}
					}
					else {
						return _map.groups;
					}

				}


				function configuredGroups() {
					var groups = [];
					for (var i = 0; i < _map.groups.length; i++) {
						var indicators = groupIndicators(_map.groups[i].code, true);
						if (indicators.length > 0) groups.push(_map.groups[i]);
					}
					return groups;
				}


				function deleteGroup(code) {
					for (var i = 0; i < _map.groups.length; i++) {
						if (_map.groups[i].code === code) {
							_map.groups.splice(i, 1);
							break;
						}
					}

					save();
				}


				function addGroup(name) {

					var code = getNewIndicatorGroupCode();

					//Add indicator
					_map.groups.push({
						"name": name,
						"code": code,
						"members": []
					});

					//Save
					save();

				}


				function groupIndicators(code, configuredOnly) {
					configuredOnly = configuredOnly || false;

					var data = [], dataCodes = [];
					if (code != 'core') {
						for (var i = 0; i < _map.groups.length; i++) {
							if (_map.groups[i].code === code) {
								dataCodes = d2Utils.arrayMerge(dataCodes, _map.groups[i].members);
							}
						}
					}
					else {
						dataCodes = _map.coreIndicators;
					}

					for (var i = 0; i < dataCodes.length; i++) {

						if (configuredOnly) {
							if (configuredIndicators(dataCodes[i])) {
								data.push(indicators(dataCodes[i]));
							}
						}
						else {
							data.push(indicators(dataCodes[i]));
						}
					}

					return data;
				}


				function groupDataSets(code) {

					var dataSets = [];
					var data = groupIndicators(code, true);
					for (var i = 0; i < data.length; i++ ) {
						dataSets.push(indicatorDataSet(data[i].code));
					}

					dataSets = d2Utils.arrayRemoveDuplicates(dataSets, 'id');
					return dataSets;
				}

				function groupRelations(code, both) {
					var relevantRelations = [];
					var indicators = groupIndicators(code, false);
					var relations = configuredRelations();
					for (var i = 0; i < relations.length; i++) {
						var aFound = false, bFound = false;
						for (var j = 0; j < indicators.length; j++) {
							if (relations[i].A === indicators[j].code) aFound = true;
							if (relations[i].B === indicators[j].code) bFound = true;
						}

						if (both && (aFound && bFound)) {
							relevantRelations.push(relations[i]);
						}
						else if (!both && (aFound || bFound)) {
							relevantRelations.push(relations[i]);
						}
					}

					return relevantRelations;


				}


				function addToGroup(groupCode, dataCode) {
					groups(groupCode).members.push(dataCode);

					return save();
				}


				function removeFromGroup(groupCode, dataCode) {
					var members = groups(groupCode).members;
					for (var i = 0; i < members.length; i++) {
						if (members[i] === dataCode) {
							members.splice(i, 1);
						}
					}

					return save();
				}


				function removeFromGroups(code) {
					for (var i = 0; i < _map.groups.length; i++) {
						for (var j = 0; j < _map.groups[i].members.length; j++) {
							if (_map.groups[i].members[j] === code) _map.groups[i].members.splice(j, 1);
						}
					}

					return save();
				}


				function getNewIndicatorGroupCode() {

					//Get and return next possible code
					var current, found;
					for (var i = 0; i <= _map.groups.length; i++) {

						current = "G" + parseInt(i+1);
						existing = false;

						for (var j = 0; j < _map.groups.length; j++) {
							if (_map.groups[j].code === current) existing = true;
						}

						if (!existing) return current;
					}
				}




				/** ===== INDICATORS ===== **/

				function indicators(code) {
					if (code) {
						for (var i = 0; i < _map.data.length; i++) {
							if (_map.data[i].code === code) return _map.data[i];
						}
					}
					else {
						return _map.data;
					}
				}


				function addIndicator(name, definition, groupCode) {
					//Add indicator
					var code = getNewIndicatorCode();
					_map.data.push({
						"name": name,
						"definition": definition,
						"code": code,
						"extremeOutlier": 3,
						"localData": {},
						"matched": false,
						"moderateOutlier": 2,
						"consistency": 33,
						"custom": true,
						"trend": "constant",
						"missing": 90,
						"dataSetID": ''
					});

					//Add to group membership
					addToGroup(groupCode, code);

					//Save
					save();
				}


				function configuredIndicators(code) {
					if (code) {
						for (var i = 0; i < _map.data.length; i++) {
							if (_map.data[i].code === code) {
								if (_map.data[i].localData.id) {
									return true;
								}
								else return false;
							}
						}
						return false;
					}
					else {
						var configured = [];
						for (var i = 0; i < _map.data.length; i++) {
							if (_map.data[i].localData.id) {
								configured.push(indicators(_map.data[i].code));
							}
						}
						return configured;
					}


				}


				function clearIndicator(code) {

					var indicator = indicators(code);
					var dataSetID = indicator.dataSetID;

					indicator.id = null;
					indicator.dataSetID = null;

					indicator.localData = {};
					indicator.matched = false;


					deleteDataset(dataSetID);
				}


				function numeratorDelete(code) {
					var dataSetID;
					for (var i = 0; i < _map.data.length; i++) {
						if (_map.data[i].code === code) {
							dataSetID = _map.data[i].dataSetID;
							_map.data.splice(i, 1);
						}
					}
					removeFromGroups(code);
					removeFromRelations(code);
					deleteDataset(dataSetID);
				}


				function updateIndicator(indicator) {
					var original = indicators(indicator.code);

					//Check if we need to add or update the related dataset
					if (original.dataSetID && original.dataSetID != indicator.dataSetID) {
						var dataSetID = original.dataSetID;
						original.dataSetID === null;
						deleteDataset(dataSetID);
					}
					else {
						addDataset(indicator.dataSetID);
					}


					for (var i = 0; i < _map.data.length; i++) {
						if (_map.data[i].code === indicator.code) {
							_map.data[i] = indicator;
							break;
						}
					}


					save();
				}


				function indicatorDataSet(code) {
					var indicator = indicators(code);
					return dataSets(indicator.dataSetID);

				}


				function indicatorGroups(code) {
					var groups = [];
					for (var i = 0; i < _map.groups.length; i++) {
						for (var j = 0; j < _map.groups[i].members.length; j++) {
							if (_map.groups[i].members[j] === code) {
								groups.push(_map.groups[i]);
								break;
							}
						}
					}

					return groups;
				}


				function getNewIndicatorCode() {

					//Get and return next possible code
					var current, found;
					for (var i = 0; i <= _map.data.length; i++) {

						current = "C" + parseInt(i+1);
						existing = false;

						for (var j = 0; j < _map.data.length; j++) {
							if (_map.data[j].code === current) existing = true;
						}

						if (!existing) return current;
					}
				}

				

				/** ===== RELATIONS ===== **/

				function relations(code) {
					if (code) {
						var relations = [];
						for (var i = 0; i < _map.relations.length; i++) {
							if (_map.relations[i].code === code) {
								return _map.relations[i];
							}
						}
					}
					else {
						return _map.relations;
					}
				}


				function configuredRelations(code) {
					var confRel = []
					for (var i = 0; i < _map.relations.length; i++) {
						var rel = _map.relations[i];

						if (code && rel.code === code) {
							if (rel.A && configuredIndicators(rel.A) && rel.B && configuredIndicators(rel.B)) {
								return true;
							}
						}
						else {
							if (rel.A && configuredIndicators(rel.A) && rel.B && configuredIndicators(rel.B)) {
								confRel.push(rel);
							}
						}
					}
					if (code) return false;
					else return confRel;
				}


				function addEditRelation(relation) {
					if (relation.code != null) {
						for (var i = 0; i < _map.relations.length; i++) {
							if (_map.relations[i].code === relation.code) {
								_map.relations[i] = relation;
							}
						}
					}
					else {
						relation.code = relationCode();
						_map.relations.push(relation);
					}

					return save();
				}


				function deleteRelation(code) {
					for (var i = 0; i < _map.relations.length; i++) {
						if (_map.relations[i].code === code) {
							_map.relations.splice(i, 1);
						}
					}

					return save();
				}


				function removeFromRelations(code) {
					for (var i = 0; i < _map.relations.length; i++) {
						if (_map.relations[i].A === code) _map.relations[i].A;
					 	if (_map.relations[i].B === code) _map.relations[i].B;
					}

					return save();
				}


				function relationCode() {
					var current, found;
					for (var i = 0; i <= _map.relations.length; i++) {

						current = "R" + parseInt(i+1);
						existing = false;

						for (var j = 0; j < _map.relations.length; j++) {
							if (_map.relations[j].code === current) existing = true;
						}

						if (!existing) return current;
					}
				}



				/** ===== DATASETS ===== **/
				function dataSets(id) {
					if (id) {
						for (var i = 0; i < _map.dataSets.length; i++) {
							if (_map.dataSets[i].id === id) {
								return _map.dataSets[i];
							}
						}
					}
					else {
						return _map.dataSets;
					}
				}

				function dataSetPeriodType(id) {
					return dataSets(id).periodType;
				}


				function addDataset(id) {
					//Check if it exists
					for (var i = 0; i < _map.dataSets.length; i++) {

						if (_map.dataSets[i].id === id) return;

					}

					d2Meta.object('dataSets', id, 'name,id,periodType').then(
						function(data) {
							var ds = data;

							//Add default parameters
							ds.threshold =  90;
							ds.consistencyThreshold = 33;
							ds.trend = "constant";
							_map.dataSets.push(ds);
							save();
						}
					);
				}


				function deleteDataset(id) {

					// 1 check that no remaining indicators still use it
					for (var i = 0; i < _map.data.length; i++) {
						if (_map.data[i].localData.id && _map.data[i].localData.id === id) {
							return;
						}
					}

					// 2 if not used by other indicators, remove
					for (var i = 0; i < _map.dataSets.length; i++) {
						if (_map.dataSets[i].id === id) {
							_map.dataSets.slice(i, 1);
							break;
						}
					}

					return save();
				}



				/** ====== DENOMINATOR ===== **/

				function denominators(code) {
					if (code) {
						var relations = [];
						for (var i = 0; i < _map.denominators.length; i++) {
							if (_map.denominators[i].code === code) {
								return _map.denominators[i];
							}
						}
					}
					else {
						return _map.denominators;
					}
				}


				function denominatorsConfigured(code) {
					if (code) {
						for (var i = 0; i < _map.denominators.length; i++) {
							if (_map.denominators[i].code === code) {
								if (_map.denominators[i].idA && _map.denominators[i].idB) return true;
								else return false;
							}
						}
						return false;
					}
					else {
						var configured = [];
						for (var i = 0; i < _map.denominators.length; i++) {
							if (_map.denominators[i].idA && _map.denominators[i].idB) {
								configured.push(_map.denominators[i]);
							}
						}
						return configured;
					}
				}


				function addEditDenominator(denominator) {
					if (denominator.code != null) {
						for (var i = 0; i < _map.denominators.length; i++) {
							if (_map.denominators[i].code === denominator.code) {
								_map.denominators[i] = denominator;
							}
						}
					}
					else {
						denominator.code = denominatorCode();
						_map.denominators.push(denominator);
					}

					return save();
				}


				function deleteDenominator(code) {
					for (var i = 0; i < _map.denominators.length; i++) {
						if (_map.denominators[i].code === code) {
							_map.denominators.splice(i, 1);
						}
					}

					return save();
				}


				function denominatorCode() {

					//Get and return next possible code
					var current, found;
					for (var i = 0; i <= _map.denominators.length; i++) {

						current = "R" + parseInt(i + 1);
						existing = false;

						for (var j = 0; j < _map.denominators.length; j++) {
							if (_map.denominators[j].code === current) existing = true;
						}

						if (!existing) return current;
					}
				}


				/** ANALYSIS TYPES **/
				function dataRelationTypes() {
					return [
						{
							'name': 'A ≈ B',
							'code': 'eq',
							'description':  "A and B should be roughly equal.",
							'thresholdDescription': '% difference between A and B.'
						},
						{
							'name': 'A > B',
							'code': 'aGTb',
							'description':  "A should be greater than B.",
							'thresholdDescription': '% that B can be greater than A.'
						},
						{
							'name': 'Dropout from A to B',
							'code': 'do',
							'description':  "Dropout rate. A should be greater than B.",
							'thresholdDescription': 'Should not be negative'
						},
						{
							'name': 'Equal across orgunits',
							'code': 'level',
							'description':  "Ratio between indicators should be similar between parent orgunit and sub-orgunits.",
							'thresholdDescription': '% difference of subunits to the parent orgunit that is accepted.'
						}
					];
				}


				function dataRelationType(code) {
					var types = dataRelationTypes();
					for (var i = 0; i < types.length; i++) {
						if (types[i].code === code) return types[i];
					}
				}


				/** UTILITIES **/
				function indicatorIsRelevant(dataCode, groupCode) {

					var data = groupIndicators(groupCode);
					for (var i = 0; i < data.length; i++) {
						if (data[i].code === dataCode) return true
					}

					return false;
				}


				function d2IDs() {
					var dataIDs = [];
					for (var i = 0; i < _map.data.length; i++) {
						if (_map.data[i].localData && _map.data[i].localData.id) {
							dataIDs.push(_map.data[i].localData.id);
						}
					}
					for (var i = 0; i < _map.dataSets.length; i++) {
						dataIDs.push(_map.dataSets[i].id);
					}
					for (var i = 0; i < _map.denominators.length; i++) {
						if (_map.denominators[i].idA != '') dataIDs.push(_map.denominators[i].idA);
						if (_map.denominators[i].idB != '') dataIDs.push(_map.denominators[i].idB);
					}
					return dataIDs.sort();
				}


				function d2CoreMeta() {
					var deferred = $q.defer();

					console.log("Getting names");

					var dataIDs = d2IDs();
					_dataIDs = dataIDs;

					var promises = [];
					promises.push(d2Meta.objects('dataElements', dataIDs));
					promises.push(d2Meta.objects('indicators', dataIDs));
					promises.push(d2Meta.objects('dataSets', dataIDs, 'name,id,periodType'));
					promises.push(d2Meta.dataElementOperands(dataIDs));
					$q.all(promises).then(
						function(datas) {
							_d2Objects = {};
							for (var i = 0; i < datas.length; i++) {
								for (var j = 0; j < datas[i].length; j++) {
									_d2Objects[datas[i][j].id] = datas[i][j];
								}
							}
							deferred.resolve(true);
						}
					);

					return deferred.promise;
				}


				function d2NameFromID(id) {
					if (!_d2Objects.hasOwnProperty(id)) return '';
					return _d2Objects[id].name;
				}


				return service;

			}]);

})();
