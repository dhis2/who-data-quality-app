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
					versionUpgrade: versionUpgrade,
					dhisVersion: dhisVersion,
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
					numeratorOutlierCriteria: indicatorOutlierCriteria,
					numeratorIsCore: numeratorIsCore,
					numeratorMakeCore: makeIndicatorCore,
					numeratorRemoveCore: removeIndicatorCore,
					denominators: denominators,
					denominatorsConfigured: denominatorsConfigured,
					denominatorAddEdit: addEditDenominator,
					denominatorDelete: deleteDenominator,
					denominatorTypes: denominatorTypes,
					denominatorType: denominatorType,
					denominatorRelations: denominatorRelations,
					denominatorRelationDenominators: denominatorRelationDenominators,
					denominatorRelationAddEdit: addEditDenominatorRelation,
					denominatorRelationDelete: deleteDenominatorRelation,
					externalRelations: externalRelations,
					externalRelationAddEdit: addEditExternalRelation,
					externalRelationDelete: deleteExternalRelation,
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
				var _version;

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

					//requestService.getSingle('/api/systemSettings/dq').then(
					requestService.getSingle('/api/dataStore/dataQualityTool/settings').then(
						function(response) {
							_map = response.data;
							if (_map && _map != '') {
								d2CoreMeta().then(
									function (data) {
										_ready = true;
										editMap();
										deferred.resolve(true);

									}
								);
							}
						},
						function(response) {
							if (response.status == 404) {

								console.log("No map exists");

								//Try to load template
								template().then(
									function (result) {
										if (result) {
											deferred.resolve(true);
											_ready = true;
										}
										else {
											deferred.resolve(false);
											_ready = false;
										}

									}
								);
							}
							else {
								console.log("Unknown error when getting settings");
								console.log(error);
							}
						}
					);



					return deferred.promise;
				}


				function editMap() {
					

				}


				function save() {

					//Check if we have new DHIS 2 ids to fetch;
					var currentIDs = d2IDs().join('');
					var previousIDs = _dataIDs.join('');
					if (currentIDs != previousIDs) d2CoreMeta();
					//requestService.post('/api/systemSettings', {'dq': angular.toJson(_map)});
					return requestService.put('/api/dataStore/dataQualityTool/settings', angular.toJson(_map));
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
											if (data[i].authorities[j] === 'F_INDICATOR_PUBLIC_ADD') {
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

				/**
				 * Upgrade metadata version
				 */
				function versionUpgrade() {
					var currentVersion = 0.9;
					if (_map.metaDataVersion != currentVersion) {


						//Do whatever upgrades are needed here
						for (var i = 0; i < _map.numerators.length; i++) {
							if (_map.numerators[i].dataElementOperand) {
								_map.numerators[i].dataElementOperandID = _map.numerators[i].dataElementOperand;
								delete _map.numerators[i].dataElementOperand;
							}
						}


						_map.metaDataVersion = currentVersion;
						return save();
					}

				}


				/**
				 * DHIS version
				 * TODO: does not belong here?
				 */
				function dhisVersion() {
					return _version;

				}


				function template() {
					var deferred = $q.defer();

					//Check if user is authorized
					admin().then(
						function (authorized) {
							if (authorized) {

								//If authorized, get json template
								requestService.getSingleLocal('data/metaData.json').then(function(response) {

									_map = response.data;

									//Save template to systemSettings
									requestService.post('/api/dataStore/dataQualityTool/settings', angular.toJson(_map)).then(
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
							else {
								deferred.resolve(false);
							}
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

					//check if already in group
					var current = groups(groupCode).members;
					for (var i = 0; i < current.length; i++) {
						if (current[i] === dataCode) return;
					}

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
						for (var i = 0; i < _map.numerators.length; i++) {
							if (_map.numerators[i].code === code) return _map.numerators[i];
						}
					}
					else {
						return _map.numerators;
					}
				}


				function addIndicator(indicator, groups, core) {
					//Add indicator
					indicator.code = getNewIndicatorCode();

					//Add default quality parameters
					indicator.extremeOutlier = 3;
					indicator.moderateOutlier = 2;
					indicator.consistency = 33;
					indicator.trend = 'constant';
					indicator.missing = 90;
					indicator.comparison = 'ou';

					//Add to map
					_map.numerators.push(indicator);

					//Add to group membership
					setIndicatorGroups(indicator, groups);

					//Check if core
					if (core) makeIndicatorCore(indicator.code);
					else removeIndicatorCore(indicator.code);

					//Save
					save();
				}


				function configuredIndicators(code) {
					if (code) {
						for (var i = 0; i < _map.numerators.length; i++) {
							if (_map.numerators[i].code === code) {
								if (_map.numerators[i].dataID) {
									return true;
								}
								else return false;
							}
						}
						return false;
					}
					else {
						var configured = [];
						for (var i = 0; i < _map.numerators.length; i++) {
							if (_map.numerators[i].dataID) {
								configured.push(indicators(_map.numerators[i].code));
							}
						}
						return configured;
					}


				}


				function clearIndicator(code) {

					var indicator = indicators(code);
					var dataSetID = indicator.dataSetID;

					indicator.dataSetID = null;
					indicator.dataID = null;

					deleteDataset(dataSetID);
				}


				function numeratorDelete(code) {
					var dataSetID;
					for (var i = 0; i < _map.numerators.length; i++) {
						if (_map.numerators[i].code === code) {
							dataSetID = _map.numerators[i].dataSetID;
							_map.numerators.splice(i, 1);
						}
					}
					removeFromGroups(code);
					removeFromRelations(code);
					deleteDataset(dataSetID);
				}


				function numeratorIsCore(code) {

					var core = _map.coreIndicators;
					for (var i = 0; i < core.length; i++) {
						if (core[i] === code) return true;
					}

					return false;
				}


				function makeIndicatorCore(code) {

					var core = _map.coreIndicators;
					for (var i = 0; i < core.length; i++) {
						if (core[i] === code) return;
					}

					_map.coreIndicators.push(code);
					save();
				}


				function removeIndicatorCore(code) {
					var core = _map.coreIndicators;
					for (var i = 0; i < core.length; i++) {
						if (core[i] === code) {
							_map.coreIndicators.splice(i, 1);
							break;
						}
					}

					save();
				}


				function updateIndicator(indicator, groups, core) {
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


					for (var i = 0; i < _map.numerators.length; i++) {
						if (_map.numerators[i].code === indicator.code) {
							_map.numerators[i] = indicator;
							break;
						}
					}

					if (groups) {
						setIndicatorGroups(indicator, groups);
					}

					if (core) makeIndicatorCore(indicator.code);
					else removeIndicatorCore(indicator.code);

					save();
				}


				function indicatorDataSet(code) {
					var indicator = indicators(code);
					return dataSets(indicator.dataSetID);

				}

				function indicatorOutlierCriteria(dataID) {
					var criteria = {};
					var numerators = indicators(null);
					for (var i = 0; i < numerators.length; i++) {
						if (numerators[i].dataID == dataID) {

							criteria.moderate = numerators[i].moderateOutlier;
							criteria.extreme = numerators[i].extremeOutlier;
							return criteria;
						}
					}

					return false;

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
					for (var i = 0; i <= _map.numerators.length; i++) {

						current = "C" + parseInt(i+1);
						existing = false;

						for (var j = 0; j < _map.numerators.length; j++) {
							if (_map.numerators[j].code === current) existing = true;
						}

						if (!existing) return current;
					}
				}


				function setIndicatorGroups(indicator, groups) {
					if (!groups) return;

					//Remove existing group membership
					removeFromGroups(indicator.code);

					//Add to specified groups
					for (var i = 0; i < groups.length; i++) {
						addToGroup(groups[i].code, indicator.code );
					}

				}

				

				/** ===== RELATIONS ===== **/

				function relations(code) {
					if (code) {
						var relations = [];
						for (var i = 0; i < _map.numeratorRelations.length; i++) {
							if (_map.numeratorRelations[i].code === code) {
								return _map.numeratorRelations[i];
							}
						}
					}
					else {
						return _map.numeratorRelations;
					}
				}


				function configuredRelations(code) {
					var confRel = []
					for (var i = 0; i < _map.numeratorRelations.length; i++) {
						var rel = _map.numeratorRelations[i];

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
						for (var i = 0; i < _map.numeratorRelations.length; i++) {
							if (_map.numeratorRelations[i].code === relation.code) {
								_map.numeratorRelations[i] = relation;
							}
						}
					}
					else {
						relation.code = relationCode();
						_map.numeratorRelations.push(relation);
					}

					return save();
				}


				function deleteRelation(code) {
					for (var i = 0; i < _map.numeratorRelations.length; i++) {
						if (_map.numeratorRelations[i].code === code) {
							_map.numeratorRelations.splice(i, 1);
						}
					}

					return save();
				}


				function removeFromRelations(code) {
					for (var i = 0; i < _map.numeratorRelations.length; i++) {
						if (_map.numeratorRelations[i].A === code) _map.numeratorRelations[i].A;
					 	if (_map.numeratorRelations[i].B === code) _map.numeratorRelations[i].B;
					}

					return save();
				}


				function relationCode() {
					var current, found;
					for (var i = 0; i <= _map.numeratorRelations.length; i++) {

						current = "R" + parseInt(i+1);
						existing = false;

						for (var j = 0; j < _map.numeratorRelations.length; j++) {
							if (_map.numeratorRelations[j].code === current) existing = true;
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
							ds.timelinessThreshold = 75;
							ds.consistencyThreshold = 33;
							ds.trend = "constant";
							ds.comparison = "ou";
							_map.dataSets.push(ds);
							save();
						}
					);
				}


				function deleteDataset(id) {

					// 1 check that no remaining indicators still use it
					for (var i = 0; i < _map.numerators.length; i++) {
						if (_map.numerators[i].dataID && _map.numerators[i].dataID === id) {
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
								if (_map.denominators[i].dataID != '') return true;
								else return false;
							}
						}
						return false;
					}
					else {
						var configured = [];
						for (var i = 0; i < _map.denominators.length; i++) {
							if (_map.denominators[i].dataID != '') {
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

				function denominatorTypes() {
					return [
						{'displayName': 'Total Population', 'code': 'total'},
						{'displayName': 'Live births', 'code': 'lb'},
						{'displayName': 'Children < 1 year', 'code': 'lt1'},
						{'displayName': 'Expected pregnancies', 'code': 'ep'},
						{'displayName': 'Other', 'code': 'other'},
						{'displayName': 'UN population projection', 'code': 'un'}
					];
				}

				function denominatorType(code) {
					var types = denominatorTypes();
					for (var i = 0; i < types.length; i++) {
						if (types[i].code === code) return types[i];
					}

					return false;


				}

				function denominatorCode() {

					//Get and return next possible code
					var current, found;
					for (var i = 0; i <= _map.denominators.length; i++) {

						current = "P" + parseInt(i + 1);
						existing = false;

						for (var j = 0; j < _map.denominators.length; j++) {
							if (_map.denominators[j].code === current) existing = true;
						}

						if (!existing) return current;
					}
				}


				/** ====== DENOMINATOR RELATIONS ===== **/
				function denominatorRelations(code) {
					if (code) {
						for (var i = 0; i < _map.denominatorRelations.length; i++) {
							if (_map.denominatorRelations[i].code === code) {
								return _map.denominatorRelations[i];
							}
						}
					}
					else {
						return _map.denominatorRelations;
					}
				}


				function denominatorRelationDenominators(code) {
					if (code) {
						for (var i = 0; i < _map.denominatorRelations.length; i++) {
							if (_map.denominatorRelations[i].code === code) {
								return {
									'a': denominators(_map.denominatorRelations[i].A),
									'b': denominators(_map.denominatorRelations[i].B)
								}
							}
						}
					}
					else {
						null;
					}
				}


				function addEditDenominatorRelation(denominatorRelation) {
					if (denominatorRelation.code != null) {
						for (var i = 0; i < _map.denominatorRelations.length; i++) {
							if (_map.denominatorRelations[i].code === denominatorRelation.code) {
								_map.denominatorRelations[i] = denominatorRelation;
							}
						}
					}
					else {
						denominatorRelation.code = denominatorRelationCode();
						_map.denominatorRelations.push(denominatorRelation);
					}

					return save();
				}


				function deleteDenominatorRelation(code) {
					for (var i = 0; i < _map.denominatorRelations.length; i++) {
						if (_map.denominatorRelations[i].code === code) {
							_map.denominatorRelations.splice(i, 1);
						}
					}

					return save();
				}


				function denominatorRelationCode() {

					//Get and return next possible code
					var current, found;
					for (var i = 0; i <= _map.denominatorRelations.length; i++) {

						current = "PR" + parseInt(i + 1);
						existing = false;

						for (var j = 0; j < _map.denominatorRelations.length; j++) {
							if (_map.denominatorRelations[j].code === current) existing = true;
						}

						if (!existing) return current;
					}
				}



				/** ====== EXTERNAL RELATIONS ===== **/
				function externalRelations(code) {
					if (code) {
						for (var i = 0; i < _map.externalRelations.length; i++) {
							if (_map.externalRelations[i].code === code) {
								return _map.externalRelations[i];
							}
						}
					}
					else {
						return _map.externalRelations;
					}
				}


				function addEditExternalRelation(externalRelation) {
					if (externalRelation.code != null) {
						for (var i = 0; i < _map.externalRelations.length; i++) {
							if (_map.externalRelations[i].code === externalRelation.code) {
								_map.externalRelations[i] = externalRelation;
							}
						}
					}
					else {
						externalRelation.code = externalRelationCode();
						_map.externalRelations.push(externalRelation);
					}

					return save();
				}


				function deleteExternalRelation(code) {
					for (var i = 0; i < _map.externalRelations.length; i++) {
						if (_map.externalRelations[i].code === code) {
							_map.externalRelations.splice(i, 1);
						}
					}

					return save();
				}


				function externalRelationCode() {

					//Get and return next possible code
					var current, found;
					for (var i = 0; i <= _map.externalRelations.length; i++) {

						current = "ER" + parseInt(i + 1);
						existing = false;

						for (var j = 0; j < _map.externalRelations.length; j++) {
							if (_map.externalRelations[j].code === current) existing = true;
						}

						if (!existing) return current;
					}
				}



				/** ANALYSIS TYPES **/
				function dataRelationTypes() {
					return [
						{
							'displayName': 'A ≈ B',
							'code': 'eq',
							'description':  "A and B should be roughly equal.",
							'thresholdDescription': '% difference between A and B.'
						},
						{
							'displayName': 'A > B',
							'code': 'aGTb',
							'description':  "A should be greater than B.",
							'thresholdDescription': '% that B can be greater than A.'
						},
						{
							'displayName': 'Dropout rate',
							'code': 'do',
							'description':  "Dropout rate. A should be greater than B.",
							'thresholdDescription': 'Should not be negative'
						},
						{
							'displayName': 'Equal across orgunits',
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
					for (var i = 0; i < _map.numerators.length; i++) {
						if (_map.numerators[i].dataID) {
							dataIDs.push(_map.numerators[i].dataID);
						}
					}
					for (var i = 0; i < _map.dataSets.length; i++) {
						dataIDs.push(_map.dataSets[i].id);
					}
					for (var i = 0; i < _map.denominators.length; i++) {
						if (_map.denominators[i].dataID != '') dataIDs.push(_map.denominators[i].dataID);
					}
					for (var i = 0; i < _map.externalRelations.length; i++) {
						if (_map.externalRelations[i].externalData != '') dataIDs.push(_map.externalRelations[i].externalData);
					}
					return dataIDs.sort();
				}


				function d2CoreMeta() {
					var deferred = $q.defer();

					var dataIDs = d2IDs();
					_dataIDs = dataIDs;

					var promises = [];
					promises.push(d2Meta.objects('dataElements', dataIDs));
					promises.push(d2Meta.objects('indicators', dataIDs));
					promises.push(d2Meta.objects('dataSets', dataIDs, 'displayName,id,periodType'));

					//Remove non-operands, to speed things up
					var operands = [];
					for (var i = 0; i < dataIDs.length; i++) {
						if (dataIDs[i].length === 23) { //11 + . + 11
							operands.push(dataIDs[i]);
						}
					}
					if (operands.length > 0) {
						promises.push(d2Meta.objects('dataElementOperands', operands));
					}

					promises.push(d2Meta.version());

					$q.all(promises).then(
						function(datas) {
							_d2Objects = {};
							for (var i = 0; i < datas.length; i++) {
								for (var j = 0; j < datas[i].length; j++) {
									_d2Objects[datas[i][j].id] = datas[i][j];
								}
							}

							_version = datas[datas.length-1];

							deferred.resolve(true);
						}
					);

					return deferred.promise;
				}


				function d2NameFromID(id) {
					if (!_d2Objects.hasOwnProperty(id)) return '';
					return _d2Objects[id].displayName;
				}


				return service;

			}]);

})();
