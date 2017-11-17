/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

export default function (d2Data, d2Meta, d2Utils, mathService, $q) {

	var service = {
		dataElement: dataElement,
		indicator: indicator
	};

	//Private variables
	var _id;
	var _type;
	var _meta;
	var _data;
	var _deferred;
	var _result;


	/** === DATA ELEMENT === **/
	function dataElement(id) {
		_deferred = $q.defer();
		_id = id;
		_type = "de";

		dataElementMeta().then(function(data) {
			if (_result.domainType === "Tracker") {
				_deferred.resolve(_result);
			}
			else {
				dataElementData().then(function(data) {
					_deferred.resolve(_result);
				});
			}
		});

		return _deferred.promise;
	}


	function dataElementMeta() {
		var deferred = $q.defer();

		var fields = "displayName,id,shortName,code,description,domainType,valueType,aggregationType,zeroIsSignificant,";
		fields += "dataSets[displayName,id,periodType,organisationUnits::size],";
		fields += "categoryCombo[displayName,categories[displayName,categoryOptions[displayName]]]";
		d2Meta.object("dataElements", _id, fields).then(
			function(meta) {
				_meta = meta;
				processDataElementMeta();
				deferred.resolve(true);
			}
		);

		return deferred.promise;
	}


	function dataElementData() {
		var deferred = $q.defer();

		//TODO: change after re-writing period service
		var pe = [];
		for (var i = 0; i < 3; i++) {
			pe.push(new moment().subtract(i, "Year").format("YYYY"));
		}
		pe.sort();


		var dx = [_id];
		for (var i = 0; i < _meta.dataSets.length; i++) {
			dx.push(_meta.dataSets[i].id);
		}


		d2Meta.userOrgunit().then(function(data) {
			var ou = data.id;
			d2Data.addRequest(dx, pe, ou);
			d2Data.fetch().then(function(data) {

				processDataElementData(dx, pe, ou);
				deferred.resolve(data);

			});
		});

		return deferred.promise;
	}


	function processDataElementMeta() {

		//Put options in basic array for categories
		_result = {
			type: _type,
			uid: _meta.id,
			displayName: _meta.displayName,
			shortName: _meta.shortName,
			code: _meta.code,
			description: _meta.description,
			domainType: _meta.domainType === "AGGREGATE" ? "Aggregate" : "Tracker",
			valueType: valueType(_meta.valueType),
			aggregationType: aggregationType(_meta.aggregationType),
			zeroSignificant: _meta.zeroIsSignificant ? "Yes" : "No",
			categories: categories(_meta.categoryCombo),
			datasets: _meta.dataSets
		};

	}


	function processDataElementData(dx, pe, ou) {

		var data = {
			pe: pe,
			ou: ou,
			ouName: d2Data.name(ou)
		};

		data.rows = [];
		for (var i = 0; i < dx.length; i++) {
			var row = {
				displayName: d2Data.name(dx[i]),
				type: dataType(dx[i]),
				p1: d2Data.value(dx[i], pe[0], ou),
				p2: d2Data.value(dx[i], pe[1], ou),
				p3: d2Data.value(dx[i], pe[2], ou)
			};

			data.rows.push(row);
		}

		_result.data = data;
	}


	function categories(categoryCombo) {
		var categories = [];
		for (var i = 0; i < _meta.categoryCombo.categories.length; i++) {
			var ct = _meta.categoryCombo.categories[i];

			if (ct.displayName === "default") continue;

			var category = {
				"displayName": ct.displayName,
				"options": []
			};

			for (var j = 0; j < ct.categoryOptions.length; j++) {
				category.options.push(ct.categoryOptions[j].displayName);
			}

			categories.push(category);
		}

		return categories;
	}


	function aggregationType(type) {

		switch (type) {
		case "SUM":
			return "Sum";
		case "AVERAGE":
			return "Average";
		case "AVG_SUM_ORG_UNIT":
			return "Average over time, sum in orgunit hierarhcy";
		default:
			return "Unknown";
		}
	}


	function valueType (type) {

		switch (type) {
		case "BOOLEAN":
			return "Boolean";
		case "TRUE_ONLY":
			return "Yes only";
		case "TEXT":
			return "Text";
		case "LONG_TEXT":
			return "Long text";
		case "DATE":
			return "Date";
		case "NUMBER":
			return "Real number";
		case "INTEGER":
			return "Integer";
		case "INTEGER_ZERO_OR_POSITIVE":
			return "Zero or positive integer";
		case "INTEGER_POSITIVE":
			return "Positive integer";
		default:
			return "Unknown";
		}
	}



	/** === INDICATOR === **/
	function indicator(id) {
		_deferred = $q.defer();
		_id = id;
		_type = "in";

		indicatorMeta().then(function(data) {

			processIndicatorMeta();
			indicatorData().then(function(data) {
				_deferred.resolve(_result);
			});
		});

		return _deferred.promise;
	}


	function indicatorMeta() {
		var deferred = $q.defer();

		var promises = [];

		var fields = "displayName,id,shortName,code,description,indicatorType[displayName,factor],";
		fields += "denominator,denominatorDescription,numerator,numeratorDescription";
		promises.push(d2Meta.object("indicators", _id, fields));
		promises.push(d2Meta.indicatorDataElements(_id));
		promises.push(d2Meta.indicatorDataSets(_id));

		$q.all(promises).then(
			function(datas) {
				_meta = datas[0];
				_meta.dataElements = datas[1];
				_meta.datasets = datas[2];

				var promises = [];
				promises.push(d2Meta.indicatorFormulaText(_meta.numerator));
				promises.push(d2Meta.indicatorFormulaText(_meta.denominator));
				$q.all(promises).then(
					function(data) {
						_meta.numerator = data[0];
						_meta.denominator = data[1];
						deferred.resolve(true);
					}
				);
			});

		return deferred.promise;
	}


	function indicatorData() {
		var deferred = $q.defer();

		var pe = [];
		for (var i = 0; i < 3; i++) {
			pe.push(new moment().subtract(i, "Year").format("YYYY"));
		}
		pe.sort();


		var dx = [_id];
		for (var i = 0; i < _meta.dataElements.length; i++) {
			dx.push(_meta.dataElements[i].id);
		}
		for (var i = 0; i < _meta.datasets.length; i++) {
			dx.push(_meta.datasets[i].id);
		}

		d2Meta.userOrgunit().then(function(data) {
			var ou = data.id;
			d2Data.addRequest(dx, pe, ou);
			d2Data.fetch().then(function(data) {

				processIndicatorData(dx, pe, ou);
				deferred.resolve(data);

			});
		});

		return deferred.promise;
	}



	function processIndicatorMeta() {

		//Put options in basic array for categories
		_result = {
			type: _type,
			uid: _meta.id,
			displayName: _meta.displayName,
			shortName: _meta.shortName,
			code: _meta.code,
			description: _meta.description,
			numeratorDescription: _meta.numeratorDescription,
			numerator: _meta.numerator,
			denominatorDescription: _meta.denominatorDescription,
			denominator: _meta.denominator,
			indicatorType: _meta.indicatorType,
			dataElements: _meta.dataElements,
			datasets: _meta.datasets
		};

	}


	function processIndicatorData(dx, pe, ou) {

		var data = {
			pe: pe,
			ou: ou,
			ouName: d2Data.name(ou)
		};

		data.rows = [];
		for (var i = 0; i < dx.length; i++) {
			var row = {
				displayName: d2Data.name(dx[i]),
				type: dataType(dx[i]),
				p1: d2Data.value(dx[i], pe[0], ou),
				p2: d2Data.value(dx[i], pe[1], ou),
				p3: d2Data.value(dx[i], pe[2], ou)
			};

			data.rows.push(row);
		}

		_result.data = data;
	}




	/** === UTILITIES === **/
	function dataType(dxID) {
		if (dxID === _id) {
			return _type === "de" ? "Data element" : "Indicator";
		}
		for (var i = 0; _result.datasets &&  i < _result.datasets.length; i++) {
			if (_result.datasets[i].id === dxID) return "Data set";
		}
		for (var i = 0; _result.dataElements && i < _result.dataElements.length; i++) {
			if (_result.dataElements[i].id === dxID) return "Data element";
		}

		return "Unknown";
	}



	return service;

}
