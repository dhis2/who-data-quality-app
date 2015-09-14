(function(){

	angular.module('d2').factory('d2Data',
		['requestService', 'd2Utils', '$q',
			function (requestService, d2Utils, $q) {

				//Define factory API
				var service = {
					reset: reset,
					addRequest: addRequest,
					fetch: fetch,
					value: dataValue,
					name: name,
					data: data
				};

				//Private variables
				var requests = [];
				var receivedData = [];
				var mergedData = {};
				var deferred;
				var remaining;

				/**
				 * === === === === === ===
				 * PUBLIC FUNCTIONS
				 * === === === === === ===
				 */

				/**
				 * Reset all parameters and the result, so that the factory can be re-used.
				 */
				function reset() {
					requests = [];
					receivedData = [];
					mergedData = {};
					deferred = null;
					remaining = 0;
				};


				/**
				 * Add request for data to be fetched
				 *
				 * @param dx			(Array of) data IDs - data element, indicator, data element operand, dataset
				 * @param pe			(Array of) periods in ISO format
				 * @param ouBoundary	(Array of) boundary orgunit IDs
				 * @param ouLevel		Optional - level (int) for orgunit disaggregation.
				 * @param ouGroup		Optional - group (id) for orgunit disaggregation
				 */
				function addRequest(dx, pe, ouBoundary, ouLevel, ouGroup) {

					var newRequests = makeRequestURLs(
						d2Utils.toArray(dx),
						d2Utils.toArray(pe),
						d2Utils.toArray(ouBoundary),
						ouLevel,
						ouGroup
					);

					requests.push.apply(requests, newRequests);

				};


				/**
				 * Fetch data, based on requests that have already been added
				 *
				 * @returns {* promise}
				 */
				function fetch() {
					remaining = requests.length;
					if (remaining === 0) return null;

					deferred = $q.defer();

					fetchNextRequest();

					return deferred.promise;
				};


				/**
				 * Look up individual data values from the current result.
				 *
				 * @param de, pe, ou, co	IDs
				 * @returns float of datavalue, or null if not found
				 */
				function dataValue(de, pe, ou, co) {

					//Make it possible to work with both de and co separately, and in . format
					if (de.length > 11) {
						co = de.substr(12,11);
						de = de.substr(0,11);
					}

					var header = mergedData.headers;
					var dataValues = mergedData.rows;

					var dxi, pei, oui, coi, vali;
					for (var i = 0; i < header.length; i++) {
						if (header[i].name === 'dx' && !header[i].hidden) dxi = i;
						if (header[i].name === 'ou' && !header[i].hidden) oui = i;
						if (header[i].name === 'pe' && !header[i].hidden) pei = i;
						if (header[i].name === 'co' && !header[i].hidden) coi = i;
						if (header[i].name === 'value' && !header[i].hidden) vali = i;
					}

					var data;
					for (var i = 0; i < dataValues.length; i++) {
						data = dataValues[i];
						if (
							(dxi === undefined || data[dxi] === de) &&
							(pei === undefined || data[pei] === pe.toString()) &&
							(oui === undefined || data[oui] === ou) &&
							(coi === undefined || data[coi] === co)
						) return parseFloat(data[vali]);
					}

					return null;
				}


				/**
				 * Look up names based on ID.
				 */
				function name(id) {
					var names = mergedData.metaData.names;
					var name;
					//data element operand
					if (id.length === 23) {
						name = names[id.substr(0,11)] + ' ' + names[id.substr(12,11)];
					}
					else {
						name = names[id];
					}
					return name;
				}


				/**
				 * Get all orgunits. Accepts options "exception" parameter to exclude certain orgunits
				 *
				 * @param exception 	(Array of) orgunit IDs not to include, typically boundary orgunit IDs
				 */
				function orgunits(exceptions) {
					exceptions = d2Utils.toArray(exceptions);

					var filteredOrgunits = [];
					var orgunits = mergedData.metaData.ou;
					for (var i = 0; i < orgunits.length; i++) {

						var include = true;
						for (var j = 0; j < exceptions.length; j++) {
							if (orgunits[i] === exceptions[j]) {
								include = false;
							}
						}

						if (include) filteredOrgunits.push(orgunits[i]);
					}

					return filteredOrgunits;

				}


				/**
				 * Get result set (all data)
				 *
				 * @returns {Object} 	Result set
				 */
				function data() {
					return mergedData;
				}


				/**
				 * === === === === === ===
				 * PRIVATE FUNCTIONS
				 * === === === === === ===
				 */

				/**
				 * Makes DHIS 2 analytics request based on the given parameters.
				 *
				 * @param dxAll			Array of data IDs
				 * @param pe			Array of ISO periods
				 * @param ouBoundary	Array of boundary orgunit IDs
				 * @param ouLevel		Orgunit level for disaggregation
				 * @param ouGroup		Orgunit group for disaggregation
				 * @returns {Array}		Array of requests
				 */
				function makeRequestURLs(dxAll, pe, ouBoundary, ouLevel, ouGroup) {

					var dx = [];
					var dxCo = [];
					for (var i = 0; i < dxAll.length; i++) {
						var dataID = dxAll[i];
						if (dataID.length != 11) {
							dxCo.push(dataID.substr(0, 11));
						}
						else {
							dx.push(dataID);
						}
					}

					var ouDisaggregation = '';
					if (ouLevel) ouDisaggregation += ';LEVEL-' + ouLevel;
					else if (ouGroup) ouDisaggregation += ';OU_GROUP-' + ouGroup;

					var requestURLs = [];
					if (dx.length > 0) {

						var requestURL = '/api/analytics.json';
						requestURL += '?dimension=dx:' + dx.join(';');
						requestURL += '&dimension=ou:' + ouBoundary.join(';');
						requestURL += ouDisaggregation;
						requestURL += '&dimension=pe:' + pe.join(';');
						requestURL + '&displayProperty=NAME';

						requestURLs.push(requestURL);
					}

					if (dxCo.length > 0) {
						var requestURL = '/api/analytics.json';
						requestURL += '?dimension=dx:' + dxCo.join(';');
						requestURL += '&dimension=co';
						requestURL += '&dimension=ou:' + ouBoundary.join(';');
						requestURL += ouDisaggregation;
						requestURL += '&dimension=pe:' + pe.join(';');
						requestURL + '&displayProperty=NAME';

						requestURLs.push(requestURL);
					}

					return requestURLs;
				}


				/**
				 * Fetch next request from the queue of requests.
				 */
				function fetchNextRequest() {

					var request = requests.pop();
					requestService.getSingleData(request).then( function(data) {

						if (data) receivedData.push(data);

						if (--remaining === 0) {
							mergeAnalyticsResults();
						}
						else {
							fetchNextRequest();
						}

					});
				}


				/**
				 * Merges the data from the one or more request results into one result set.  In case where the format
				 * is different (e.g. one request is disaggergated and the other not),the "maximum" will be used and
				 * the missing fields will be empty.
				 */
				function mergeAnalyticsResults() {

					mergedData = {
						headers: [
							{name: 'dx'},
							{name: 'co'},
							{name: 'ou'},
							{name: 'pe'},
							{name: 'value'}
						],
						metaData: {
							co: [],
							dx: [],
							names: {},
							ou: [],
							pe: []
						},
						rows: []
					}

					for (var i = 0; i < receivedData.length; i++) {
						var header = receivedData[i].headers;
						var metaData = receivedData[i].metaData;
						var rows = receivedData[i].rows;

						var dxi = null, pei = null, oui = null, coi = null, vali = null;
						for (var j = 0; j < header.length; j++) {
							if (header[j].name === 'dx' && !header[j].hidden) dxi = j;
							if (header[j].name === 'ou' && !header[j].hidden) oui = j;
							if (header[j].name === 'pe' && !header[j].hidden) pei = j;
							if (header[j].name === 'co' && !header[j].hidden) coi = j;
							if (header[j].name === 'value' && !header[j].hidden) vali = j;
						}

						//Transfer data to result object
						var transVal;
						for (var j = 0; j < rows.length; j++) {
							transVal = [];
							transVal[0] = rows[j][dxi];
							coi ? transVal[1] = rows[j][coi] : transVal[1] = null;
							transVal[2] = rows[j][oui];
							transVal[3] = rows[j][pei];
							transVal[4] = rows[j][vali];

							mergedData.rows.push(transVal);
						}

						//Transfer metadata
						mergedData.metaData.co.push.apply(mergedData.metaData.co, metaData.co);
						mergedData.metaData.dx.push.apply(mergedData.metaData.dx, metaData.dx);
						mergedData.metaData.ou.push.apply(mergedData.metaData.ou, metaData.ou);
						mergedData.metaData.pe.push.apply(mergedData.metaData.pe, metaData.pe);

						for (key in metaData.names) {
							if (metaData.names.hasOwnProperty(key)) {
								mergedData.metaData.names[key] = metaData.names[key];
							}

						}
					}

					//Remove duplicates in metaData
					mergedData.metaData.co = d2Utils.arrayRemoveDuplicates(mergedData.metaData.co);
					mergedData.metaData.dx = d2Utils.arrayRemoveDuplicates(mergedData.metaData.dx);
					mergedData.metaData.ou = d2Utils.arrayRemoveDuplicates(mergedData.metaData.ou);
					mergedData.metaData.pe = d2Utils.arrayRemoveDuplicates(mergedData.metaData.pe);

					//We are done here, and can return the result.
					deferred.resolve(mergedData);
				}


				return service;

			}]);

})();
