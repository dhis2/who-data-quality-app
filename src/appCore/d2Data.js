/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

export default function (requestService, d2Utils, $q) {

	//Define factory API
	var service = {
		addRequest: addRequest,
		fetch: fetch,
		value: dataValue,
		values: dataValues,
		name: name
	};

	//Private variables
	var _newRequests = [];		//Store new requests
	let mergedData;


	/**
	 * === === === === === ===
	 * PUBLIC FUNCTIONS
	 * === === === === === ===
	 */


	/**
	 * Look up names based on ID.
	 */
	function name(id) {
		var items = mergedData.metaData.items;
		var name;
		//data element operand
		if (id.length === 23) {
			name = items[id.substr(0, 11)].name + " " + items[id.substr(12, 11)].name;
		}
		else {
			name = items[id].name;
		}
		return name;
	}



	/**
	 * Add request for data to be fetched
	 *
	 * @param dx			(Array of) data IDs - data element, indicator, data element operand, dataset
	 * @param pe			(Array of) periods in ISO format
	 * @param ouBoundary	(Array of) boundary orgunit IDs
	 * @param ouLevel		Optional - level (int) for orgunit disaggregation.
	 * @param ouGroup		Optional - group (id) for orgunit disaggregation
	 */
	function addRequest(dx, pe, ouBoundary, ouLevel, ouGroup, aggregationType) {

		_newRequests = d2Utils.arrayMerge(_newRequests,
			makeRequestURLs(
				d2Utils.toArray(dx),
				d2Utils.toArray(pe),
				d2Utils.toArray(ouBoundary),
				ouLevel,
				ouGroup,
				aggregationType
			));

	}


	/**
	 * Fetch data, based on requests that have already been added
	 *
	 * @returns {* promise}
	 */
	function fetch() {
		var newBatch = new Batch(_newRequests);
		_newRequests = [];

		newBatch.start();

		return newBatch.promise();
	}


	/**
	 * Look up individual data values from the current result.
	 *
	 * @param de, pe, ou, co	IDs
	 * @param aggregationType
	 * @returns float of datavalue, or null if not found
	 */
	function dataValue(de, pe, ou, co, at) {
		if (co === undefined) co = null;
		if (at === undefined) at = null;

		//Make it possible to work with both de and co separately, and in . format
		if (de.length === 23) {
			co = de.substr(12, 11);
			de = de.substr(0, 11);
		}

		var header = mergedData.headers;
		var dataValues = mergedData.rows;

		var dxi, pei, oui, coi, vali, ati;
		for (let i = 0; i < header.length; i++) {
			if (header[i].name === "dx" && !header[i].hidden) dxi = i;
			if (header[i].name === "ou" && !header[i].hidden) oui = i;
			if (header[i].name === "pe" && !header[i].hidden) pei = i;
			if (header[i].name === "co" && !header[i].hidden) coi = i;
			if (header[i].name === "value" && !header[i].hidden) vali = i;
			if (header[i].name === "at") ati = i;
		}

		var data;
		for (let i = 0; i < dataValues.length; i++) {
			data = dataValues[i];
			if (
				(dxi === undefined || data[dxi] === de) &&
				(pei === undefined || data[pei] === pe.toString()) &&
				(oui === undefined || data[oui] === ou) &&
				(co === undefined || coi === undefined || data[coi] === co) &&
				(at === undefined || ati === undefined || data[ati] === at)
			)
				return parseFloat(data[vali]);
		}

		return null;
	}


	/**
	 * Look up data values from the current result.
	 *
	 * @param de, pe, ou, co	IDs
	 * @returns float of datavalue, or null if not found
	 */
	function dataValues(de, pe, ou, co) {
		var value, values = [];

		de = d2Utils.toArray(de);
		pe = d2Utils.toArray(pe);
		ou = d2Utils.toArray(ou);
		co = co === undefined ? null : d2Utils.toArray(co);

		for (let i = 0; i < de.length; i++) {

			for (let j = 0; j < pe.length; j++) {

				for (var k = 0; k < ou.length; k++) {

					if (co && co.length > 0) {
						for (var l = 0; l < co.length; l++) {

							value = dataValue(de[i], pe[j], ou[k], co[l]);
						}
					}
					else {
						value = dataValue(de[i], pe[j], ou[k]);
					}

					if (value) values.push(value);
				}

			}

		}


		return values;
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
	 * @param aggregationType Aggregation type for the request. Null = default
	 * @returns {Array}		Array of requests
	 */
	function makeRequestURLs(dxAll, pe, ouBoundary, ouLevel, ouGroup, aggregationType) {

		var dx = [];
		var dxCo = [];
		for (let i = 0; i < dxAll.length; i++) {

			var dataID = dxAll[i];
			if (!dataID) {
				continue;
			}
			else if (dataID.length === 23) {
				dxCo.push(dataID.substr(0, 11));
			}
			else {
				dx.push(dataID);
			}
		}

		var ouDisaggregation = "";
		if (ouLevel) ouDisaggregation += ";LEVEL-" + ouLevel;
		else if (ouGroup) ouDisaggregation += ";OU_GROUP-" + ouGroup;

		var requestURL, requestURLs = [];
		if (dx.length > 0) {

			requestURL = "/analytics.json";
			requestURL += "?dimension=dx:" + dx.join(";");
			requestURL += "&dimension=ou:" + ouBoundary.join(";");
			requestURL += ouDisaggregation;
			requestURL += "&dimension=pe:" + pe.join(";");
			requestURL + "&displayProperty=NAME";
			if (aggregationType) {
				requestURL += "&aggregationType=" + aggregationType;
			}


			requestURLs.push(requestURL);
		}

		if (dxCo.length > 0) {
			requestURL = "/analytics.json";
			requestURL += "?dimension=dx:" + dxCo.join(";");
			requestURL += "&dimension=co";
			requestURL += "&dimension=ou:" + ouBoundary.join(";");
			requestURL += ouDisaggregation;
			requestURL += "&dimension=pe:" + pe.join(";");
			requestURL + "&displayProperty=NAME";
			if (aggregationType) requestURL += "&aggregationType=" + aggregationType;

			requestURLs.push(requestURL);
		}

		return requestURLs;
	}















	/**
	 * Call when data for the current batch has been fetched and merged.
	 * Resolves the data promise, clears the current batch, and calls for more data
	 */
	/*function resolveCurrentBatch() {
		//_currentBatch.resolve(_currentBatchMeta);
		//_currentBatch = null;
		fetchNextRequest();
	}*/



	/** === BATCH CLASS ===
	 * Class used to store "batches" of requests. Has an array of requests and a promise, with methods
	 * to query and access these.
	 */

	function Batch(requests) {
		this._requests = requests;
		this._deferred = $q.defer();
		this._receivedData = [];
		//this._mergedData = null;
		this._started = false;
		this._batchMeta = null;
	}

	Batch.prototype.promise = function () {
		return this._deferred.promise;
	};

	Batch.prototype.resolve = function () {
		this._deferred.resolve(this);
	};

	Batch.prototype.getMeta = function () {
		return this._batchMeta;
	};

	Batch.prototype.request = function () {
		return this._requests.pop();
	};

	Batch.prototype.done = function () {
		return this._requests.length === 0 ? true : false;
	};

	Batch.prototype.id = function () {
		return this._id;
	};

	Batch.prototype.start = function () {
		if (!this._started) {
			this._started = true;
			this._fetchNext();
		}
	};

	Batch.prototype._fetchNext = function () {

		//console.log("Batch::_fetchNext");
		let aggregationType = false;

		//Get next request in batch
		var request = this.request();
		if (!request) return;

		//TODO: temporary fix
		if (request.match("aggregationType=COUNT")) {
			aggregationType = "COUNT";
		}
		else {
			aggregationType = false;
		}

		var self = this;
		requestService.getSingleData(request).then(function (data) {

			if (data) {
				if (aggregationType) {
					data = self.addAggregationInfo(data, aggregationType);
				}
				self._receivedData.push(data);
			}


			//Current batch is done - merge the data we have so far, and fulfill the promise
			if (self.done()) {
				self.mergeBatchMetaData();
				self.mergeAnalyticsResults();
				self.resolve();
			}
			//We are not done, so fetch the next
			else {
				self._fetchNext();
			}

		});
	};

	/**
	 * Add info about aggregationtype to result
	 */
	Batch.prototype.addAggregationInfo = function (data, aggregationType) {

		data.headers.push({ "name": "at" });
		for (let i = 0; i < data.rows.length; i++) {
			data.rows[i].push(aggregationType);
		}

		return data;
	};


	/**
	* Merges the metadata from one or more request results into one result set.
	*/
	Batch.prototype.mergeBatchMetaData = function () {

		let receivedData = this._receivedData;

		//Create "skeleton" if it does not exist
		var meta = {
			co: [],
			dx: [],
			items: {},
			ou: [],
			pe: []
		};

		for (let i = 0; i < receivedData.length; i++) {
			var metaData = receivedData[i].metaData;

			//Transfer metadata
			meta.co.push.apply(meta.co, metaData.dimensions.co);
			meta.dx.push.apply(meta.dx, metaData.dimensions.dx);
			meta.ou.push.apply(meta.ou, metaData.dimensions.ou);
			meta.pe.push.apply(meta.pe, metaData.dimensions.pe);

			for (var key in metaData.items) {
				if (metaData.items.hasOwnProperty(key)) {
					meta.items[key] = metaData.items[key];
				}

			}
		}

		//Remove duplicates in metaData
		meta.co = d2Utils.arrayRemoveDuplicates(meta.co);
		meta.dx = d2Utils.arrayRemoveDuplicates(meta.dx);
		meta.ou = d2Utils.arrayRemoveDuplicates(meta.ou);
		meta.pe = d2Utils.arrayRemoveDuplicates(meta.pe);

		//Clear the data we have now merged
		this._batchMeta = meta;
	};

	/**
   * Merges the data from the one or more request results into one global result set, which will be used
   * for any subsequent requests for additional data.
   *
   * In cases where the format is different (e.g. one request is disaggergated and the other not),
   * the "maximum" will be used and the missing fields will be empty.
   */
	Batch.prototype.mergeAnalyticsResults = function () {

		//let mergedData = this._mergedData;
		let receivedData = this._receivedData;

		//Create "skeleton" if it does not exist
		if (!mergedData) {
			mergedData = {
				headers: [
					{ name: "dx" },
					{ name: "co" },
					{ name: "ou" },
					{ name: "pe" },
					{ name: "value" },
					{ name: "at" }
				],
				metaData: {
					co: [],
					dx: [],
					items: {},
					ou: [],
					pe: []
				},
				rows: []
			};
		}

		for (let i = 0; i < receivedData.length; i++) {
			var header = receivedData[i].headers;
			var metaData = receivedData[i].metaData;
			var rows = receivedData[i].rows;

			var dxi = null, pei = null, oui = null, coi = null, vali = null, ati = null;
			for (let j = 0; j < header.length; j++) {
				if (header[j].name === "dx" && !header[j].hidden) dxi = j;
				if (header[j].name === "ou" && !header[j].hidden) oui = j;
				if (header[j].name === "pe" && !header[j].hidden) pei = j;
				if (header[j].name === "co" && !header[j].hidden) coi = j;
				if (header[j].name === "value" && !header[j].hidden) vali = j;
				if (header[j].name === "at") ati = j;
			}

			//Transfer data to result object
			var transVal;
			for (let j = 0; j < rows.length; j++) {
				transVal = [];
				transVal[0] = rows[j][dxi];
				coi ? transVal[1] = rows[j][coi] : transVal[1] = null;
				ati ? transVal[5] = rows[j][ati] : transVal[5] = null;
				transVal[2] = rows[j][oui];
				transVal[3] = rows[j][pei];
				transVal[4] = rows[j][vali];

				mergedData.rows.push(transVal);
			}

			//Transfer metadata
			mergedData.metaData.co.push.apply(mergedData.metaData.co, metaData.dimensions.co);
			mergedData.metaData.dx.push.apply(mergedData.metaData.dx, metaData.dimensions.dx);
			mergedData.metaData.ou.push.apply(mergedData.metaData.ou, metaData.dimensions.ou);
			mergedData.metaData.pe.push.apply(mergedData.metaData.pe, metaData.dimensions.pe);

			for (var key in metaData.items) {
				if (metaData.items.hasOwnProperty(key)) {
					mergedData.metaData.items[key] = metaData.items[key];
				}

			}
		}

		//Remove duplicates in metaData
		mergedData.metaData.co = d2Utils.arrayRemoveDuplicates(mergedData.metaData.co);
		mergedData.metaData.dx = d2Utils.arrayRemoveDuplicates(mergedData.metaData.dx);
		mergedData.metaData.ou = d2Utils.arrayRemoveDuplicates(mergedData.metaData.ou);
		mergedData.metaData.pe = d2Utils.arrayRemoveDuplicates(mergedData.metaData.pe);

		//Clear the data we have now merged
		this._receivedData = [];
	};

	return service;
}