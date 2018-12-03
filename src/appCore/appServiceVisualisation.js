/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

export default function (periodService, requestService, mathService, $q, d2Data, $i18next) {


	var self = this;
	var maxScatterPoints = 1000;

	/** NG-NVD3 Line */
	/*
		Takes IDs as parameters, returns chartData and chartOptions for use with angular-nvd3
		*/
	self.lineChart = function (callback, dataIDs, periodIDs, orgunitIDs, type) {
		var deferred = $q.defer();
		d2Data.addRequest(dataIDs, periodIDs, orgunitIDs);
		d2Data.fetch().then(
			function (batch) {
				let metadata = batch.getMeta();

				orgunitIDs = metadata.ou;

				var maxY = 0;

				var chartData = [];
				var chartOptions;
				if (type === "dataOverTime") {

					if (orgunitIDs.length > 1) console.log("Warning: more than one orgunit for dataOverTime chart");


					var yLen = 0, xLen = 0;
					for (let i = 0; i < dataIDs.length; i++) {
						var chartSerie = {
							"key": d2Data.name(dataIDs[i]),
							"values": []
						};

						for (let j = 0; j < periodIDs.length; j++) {
							var value = d2Data.value(dataIDs[i], periodIDs[j], orgunitIDs[0], null);
							var y = mathService.round(value, 2);
							chartSerie.values.push({
								"x": j,
								"y": y
							});

							if (y > maxY) maxY = y;

							//For the first two, check if we have very long x-axis labels that interfere with y axis
							if (y && j < 2) xLen = Math.max(xLen, y.toString().length);
							if (y) yLen = Math.max(yLen, y.toString().length);


						}

						chartData.push(chartSerie);
					}


					//Get XAxis labels = periods from series[0]
					var periodNames = [];
					for (let i = 0; i < periodIDs.length; i++) {
						var name = periodService.shortPeriodName(periodIDs[i].toString());
						periodNames.push(name);
						xLen = Math.max(xLen, name.length);
					}


					var labelSizes = estimateLabelSize(xLen, yLen, true);

					//Chart options
					chartOptions = {
						"chart": {
							"type": "lineChart",
							"margin": {
								"top": 25,
								"right": 25,
								"bottom": 25 + labelSizes.x,
								"left": 25 + labelSizes.y
							},
							"forceY": [0, getRange(maxY)],
							"xAxis": {
								"rotateLabels": -45,
								"tickFormat": function(d) {
									return periodNames[d];
								}
							},
							"tooltip": {
								"enabled": true
							},
							"showLegend": true,
							"transitionDuration": 100
						},
						"parameters": {
							"dataIDs": dataIDs,
							"periods": periodIDs,
							"orgunitIDs": orgunitIDs,
							"type": type
						}
					};

				}
				if (callback) {
					callback(chartData, chartOptions);
				}
				else {
					deferred.resolve({
						data: chartData,
						opts: chartOptions
					});
				}
			}
		);
		return deferred.promise;
	};


	/** NG-NVD3 Multibar */
	/*
		Takes IDs as parameters, returns chartData and chartOptions for use with angular-nvd3
		*/
	self.multiBarChart = function (callback, dataIDs, periodIDs, orgunitIDs, type) {
		var deferred = $q.defer();
		var requestURL = "/analytics.json?";
		requestURL += "dimension=dx:" + dataIDs.join(";");
		requestURL += "&dimension=pe:" + periodIDs.join(";");
		requestURL += "&dimension=ou:" + orgunitIDs.join(";");

		requestService.getSingle(requestURL).then(function (response) {

			var data = response.data.rows;
			var header = response.data.headers;
			var items = response.data.metaData.items;

			orgunitIDs = response.data.metaData.dimensions.ou; //Replace for "USER ORGUNIT" etc

			var maxY;

			var chartData = [];
			var chartOptions;
			if (type === "dataOverTime") {

				if (orgunitIDs.length > 1) console.log("Warning: more than one orgunit for dataOverTime chart");

				for (let i = 0; i < dataIDs.length; i++) {
					var chartSerie = {
						"key": items[dataIDs[i]].name,
						"values": []
					};

					for (let j = 0; j < periodIDs.length; j++) {
						var value = dataValue(header, data, dataIDs[i], periodIDs[j], orgunitIDs[0], null);

						if (isNaN(value)) value = null;
						else value = mathService.round(value, 2);

						chartSerie.values.push({
							"x": j,
							"y": value
						});

						if (value > maxY) maxY = value;

					}

					chartData.push(chartSerie);
				}


				//Get XAxis labels = periods from series[0]
				var periodNames = [];
				for (let i = 0; i < periodIDs.length; i++) {
					periodNames.push(periodService.shortPeriodName(periodIDs[i].toString()));
				}

				//Chart options
				chartOptions = {
					"chart": {
						"type": "multiBarChart",
						"height": 400,
						"margin": {
							"top": 140,
							"right": 20,
							"bottom": 100,
							"left": 100
						},
						"forceY": [0, getRange(maxY)],
						"xAxis": {
							"rotateLabels": -45,
							"tickFormat": function(d) {
								return periodNames[d];
							}
						},
						"tooltip": {
							"enabled": true
						},
						"showLegend": true,
						"transitionDuration": 100
					},
					"parameters": {
						"dataIDs": dataIDs,
						"periods": periodIDs,
						"orgunitIDs": orgunitIDs,
						"type": type
					}
				};

			}
			if (callback) {
				callback(chartData, chartOptions);
			}
			else {
				deferred.resolve({
					data: chartData,
					opts: chartOptions
				});
			}
		});
		return deferred.promise;
	};


	/** NG-NVD3 Bar */
	/*
		Takes IDs as parameters, returns chartData and chartOptions for use with angular-nvd3
		*/
	self.barChart = function (callback, dataIDs, periodIDs, orgunitIDs, type, orgunitLevel) {
		var deferred = $q.defer();

		d2Data.addRequest(dataIDs, periodIDs, orgunitIDs, orgunitLevel, null);
		d2Data.fetch().then(
			function (batch) {
				let metadata = batch.getMeta();

				orgunitIDs = metadata.ou;

				var maxY;

				var chartData = [];
				var chartOptions;
				if (type === "ou") {

					if (dataIDs.length > 1) console.log("Warning: more than one data item for ou bar chart");
					if (periodIDs.length > 1) console.log("Warning: more than one period item for ou bar chart");


					var xLen = 0, yLen = 0;

					var dx = dataIDs[0];
					var pe = periodIDs[0];

					for (let i = 0; i < dataIDs.length; i++) {
						var chartSerie = {
							"key": d2Data.name(dx),
							"values": []
						};

						for (let j = 0; j < orgunitIDs.length; j++) {
							var value = d2Data.value(dx, pe, orgunitIDs[j], null);

							if (isNaN(value)) value = null;
							else value = mathService.round(value, 0);

							var name = d2Data.name(orgunitIDs[j]);
							chartSerie.values.push({
								"label": name,
								"value": value
							});

							if (value > maxY) maxY = value;

							if (name) xLen = Math.max(xLen, name.length);
							if (value) yLen = Math.max(yLen, value.toString().length);

						}

						chartData.push(chartSerie);
					}

					var labelSizes = estimateLabelSize(xLen, yLen, true);

					//Chart options
					chartOptions = {
						"chart": {
							"type": "discreteBarChart",
							"margin": {
								"top": 25,
								"right": 25,
								"bottom": 25 + labelSizes.x,
								"left": 25 + labelSizes.y
							},
							"tooltip": {
								"enabled": true
							},
							"showLegend": true,
							"forceY": [0, getRange(maxY)],
							"x": function(d){return d.label;},
							"y": function(d){return d.value;},
							"transitionDuration": 100,
							"xAxis": {
								"rotateLabels": -45
							}
						},
						"parameters": {
							"dataIDs": dataIDs,
							"periods": periodIDs,
							"orgunitIDs": orgunitIDs,
							"type": type
						}
					};

				}
				deferred.resolve({
					data: chartData,
					opts: chartOptions
				});
				if (callback) {
					callback(chartData, chartOptions);
				}
				else {
					deferred.resolve({
						data: chartData,
						opts: chartOptions
					});
				}
			}
		);
		return deferred.promise;
	};


	/** NG-NVD3 YY line chart */
	/*Year over year line chart - parameter-based
	@param elementID	html element to place chart in
	@param periods		array of array of ISO period, one set for each series. Same period in each year.
	@param dataIDs		data ID
	@param ouID			orgunit ID
	*/
	self.yyLineChart = function (callback, periods, dataID, ouID) {

		var deferred = $q.defer();

		for (let i = 0; i < periods.length; i++) {
			d2Data.addRequest(dataID, periods[i], ouID, null, null);
		}


		//TODO: why isn't the loaded data used??
		// eslint-disable-next-line no-unused-vars
		d2Data.fetch().then(function (batch) {
			// eslint-disable-next-line no-unused-vars
			let metadata = batch.getMeta();

			var yLen = 0, xLen = 0;

			//Get XAxis labels = periods from series[0]
			var periodNames = [];
			for (let i = 0; i < periods[0].length; i++) {
				var name = periodService.shortPeriodName(periods[0][i]).split(" ")[0];
				periodNames.push(name);
				xLen = Math.max(xLen, name.length);
			}

			var maxY = 0;

			var minRange = 0, maxRange = 0;
			var chartData = [], chartSeries, values;
			for (let i = 0; i < periods.length; i++) {

				values = [];
				chartSeries = {};

				if (periods[i][0].substring(0, 4) === periods[i][periods[i].length-1].substring(0, 4)) {
					chartSeries.key = periods[i][0].substring(0, 4);
				}
				else {
					chartSeries.key = periods[i][0].substring(0, 4) + " - " + periods[i][periods[i].length-1].substring(0, 4);
				}

				var value;
				values = [];
				for (let j = 0; j < periods[i].length; j++) {
					var pe = periods[i][j];
					value = parseFloat(d2Data.value(dataID, pe, ouID, null));
					if (isNaN(value)) value = null;

					values.push({
						"x": j,
						"y": value
					});

					if (value > maxY) maxY = value;

					if (value) yLen = Math.max(yLen, value.toString().length);

					if (value < minRange) {
						minRange = value;
					}
					if (value > maxRange) {
						maxRange = value;
					}
				}

				chartSeries.values = values;
				chartSeries.periods = periods[i];

				chartData.push(chartSeries);
			}

			
			var toolTip = function(point) {
				//TODO: find what's supposed to be used instead of undefined e variable below. This isn't used right now

				// eslint-disable-next-line no-undef
				return "<h3>" + periodService.shortPeriodName(e.series.periods[point.point.point.x]) + "</h3>" +
					"<p>" + point.point.point.y + "</p>";
			};

			var labelSizes = estimateLabelSize(xLen, yLen, true);
			//Chart options
			var chartOptions = {
				"chart": {
					"x": function(d){ return d.x; },
					"y": function(d){ return d.y; },
					"type": "lineChart",
					"margin": {
						"top": 25,
						"right": 25,
						"bottom": 25 + labelSizes.x,
						"left": 25 + labelSizes.y
					},
					"forceY": [0, getRange(maxY)],
					"xAxis": {
						"rotateLabels": -45,
						"tickFormat": function(d) {return periodNames[d];}
					},
					"tooltip": {
						enabled: true,
						contentGenerator: toolTip
					},
					"showLegend": true,
					"useInteractiveGuideline": true,
					"transitionDuration": 100
				},
				"parameters": {
					"dataID": dataID,
					"periods": periods,
					"orgunitIDs": ouID
				}
			};

			//TODO: callback is right now never passed in (always null), but when we want to use it, verify and test all functionality above regarding the tooltip and chart options etc.
			if (callback) {
				callback(chartData, chartOptions);
			}
			else {
				deferred.resolve({
					data: chartData,
					opts: chartOptions
				});
			}

		});

		return deferred.promise;
	};




	/** -- PROCESSING ANALYSED DATA -- */


	/** Time consistency */
	/*
		@param callback 	callback function, takes chartData and chartOptions as parameters. If null, options and data are stored in reference result object
		@param result		result as returned from data analysis service (timeConsistency function)
		*/
	self.makeTimeConsistencyChart = function (callback, result, includeTitle) {
		var datapoints = result.subunitDatapoints;
		var boundaryRatio = result.boundaryRatio;
		var consistency = result.criteria;

		var toolTip = function(point) {
			var data = result.subunitDatapoints;
			var ouID = point.point.z;
			var ouName;
			for (let i = 0; i < data.length; i++) {
				if (data[i].id === ouID) {
					ouName = data[i].name;
					break;
				}
			}

			var toolTipHTML = "<h3>" + ouName + "</h3>";

			var yVal = point.point.y != null ? point.point.y : "No data";
			var xVal = point.point.x != null ? point.point.x : "No data";

			toolTipHTML += "<p style=\"margin-bottom: 0px\">" + periodService.shortPeriodName(result.pe) + ": " + yVal + "</p>";
			if (result.subType === "constant") {
				toolTipHTML += "<p>Average: " + xVal + "</p>";
			}
			else {
				toolTipHTML += "<p>Forecasted: " + xVal + "</p>";
			}
			return toolTipHTML;
		};

		var chartSeries;
		var maxX;
		var maxY;

		//Only relevant if there is subunit data
		if (datapoints.length > 0) {
			var scatterData = scatterPoints(datapoints);

			chartSeries = scatterData.chartSeries;
			maxX = getRange(scatterData.maxX);
			maxY = getRange(scatterData.maxY);

			var ratio, key;

			//national = subunit
			if (result.comparison === "ou") {
				ratio = boundaryRatio;
				key = result.boundaryName;
			}
			//else current = average/forecast
			else {
				ratio = 1;
				key = result.subType === "constant" ? $i18next.t("Current = Average") : $i18next.t("Current = Forecast");
			}
			chartSeries.push(scatterLine(ratio, key, "#000000", maxX, maxY));

			if (consistency > 0) {
				chartSeries.push(scatterLine(ratio * (1 + (consistency / 100)), "+ " + consistency + "%", "#B0B0B0", maxX, maxY));
				chartSeries.push(scatterLine(ratio * (1 - (consistency / 100)), "- " + consistency + "%", "#B0B0B0", maxX, maxY));
			}
		}

		var xAxisLabel;
		if (result.subType === "constant") xAxisLabel = $i18next.t("Average of ") + result.peRef.length  + $i18next.t(" previous periods");
		else xAxisLabel = $i18next.t("Forecasted value");



		var chartOptions = {
			"chart": {
				"type": "scatterChart",
				"margin": {
					"top": 10,
					"right": 30,
					"bottom": 80,
					"left": 100
				},
				"xDomain": [0, maxX],
				"yDomain": [0, maxY],
				"xAxis": {
					"axisLabel": xAxisLabel,
					"axisLabelDistance": 30,
					"tickFormat": d3.format("d")
				},
				"yAxis": {
					"axisLabel": periodService.shortPeriodName(result.pe),
					"axisLabelDistance": 30,
					"tickFormat": d3.format("d")
				},
				"tooltip": {
					enabled: true,
					contentGenerator: toolTip
				},
				"transitionDuration": 100

			}
		};
		if (includeTitle) {
			chartOptions.title = {
				"enable": true,
				"text": result.dxName
			};
			chartOptions.subtitle = {
				"enable": false
			};

		}

		if (callback) {
			callback(chartSeries, chartOptions);
		}
		else {
			result.chartOptions = chartOptions;
			result.chartData = chartSeries;
		}
	};


	/** Data consistency */
	self.makeDataConsistencyChart = function (callback, result) {

		var datapoints = result.subunitDatapoints;
		var boundaryRatio = result.boundaryRatio;
		var consistency = result.criteria;

		var toolTip = function(point) {
			var data = result.subunitDatapoints;
			var ouID = point.point.z;
			var ouName;
			for (let i = 0; i < data.length; i++) {
				if (data[i].id === ouID) {
					ouName = data[i].name;
					break;
				}
			}
			return "<h3>" + ouName + "</h3>" +
				"<p style=\"margin-bottom: 0px\">" + result.dxNameA + ": " + point.point.y + "</p>" +
				"<p>" + result.dxNameB + ": " + point.point.x + "</p>";
		};

		var maxX = 0;
		var maxY = 0;
		var chartSeries = [];


		if (datapoints.length > 0) {


			var scatterData = scatterPoints(datapoints);

			chartSeries = scatterData.chartSeries;
			maxX = getRange(scatterData.maxX);
			maxY = getRange(scatterData.maxY);

			var ratio, key;

			//national = subunit
			if (result.subType === "level") {
				ratio = boundaryRatio;
				key = result.boundaryName;
			}
			//else current = expected
			else {
				ratio = 1;
				key = "A = B";
			}
			chartSeries.push(scatterLine(ratio, key, "#000000", maxX, maxY));

			if (consistency > 0) {
				if (result.subType === "eq" || result.subType === "level") {
					chartSeries.push(scatterLine(ratio * (1 + (consistency / 100)), "+ " + consistency + "%", "#B0B0B0", maxX, maxY));
				}
				chartSeries.push(scatterLine(ratio * (1 - (consistency / 100)), "- " + consistency + "%", "#B0B0B0", maxX, maxY));
			}
		}

		var chartOptions = {
			"chart": {
				"type": "scatterChart",
				"margin": {
					"top": 10,
					"right": 30,
					"bottom": 80,
					"left": 100
				},
				"xDomain": [0, maxX],
				"yDomain": [0, maxY],
				"xAxis": {
					"axisLabel": result.dxNameB,
					"axisLabelDistance": 30,
					"tickFormat": d3.format("d")
				},
				"yAxis": {
					"axisLabel": result.dxNameA,
					"axisLabelDistance": 30,
					"tickFormat": d3.format("d")
				},
				"tooltip": {
					enabled: true,
					contentGenerator: toolTip
				},
				"transitionDuration": 100
			}
		};


		if (callback) {
			callback(chartSeries, chartOptions);
		}
		else {
			result.chartOptions = chartOptions;
			result.chartData = chartSeries;
		}
	};

	/** Data consistency */
	self.makeExternalConsistencyChart = function (callback, result) {

		var datapoints = result.subunitDatapoints;
		var names = [];

		var toolTip = function(point) {

			var data = result.subunitDatapoints;
			var ouID = point.point.z;
			var ouName;
			for (let i = 0; i < data.length; i++) {
				if (data[i].id === ouID) {
					ouName = data[i].name;
					data = data[i];
					break;
				}
			}

			if (!ouName) ouName = result.boundaryName;
			var survey = data.value, routine = data.refValue;
			if (!survey) survey = result.boundaryValue;
			if (!routine) routine = result.boundaryRefValue;

			return "<h3>" + ouName + "</h3>" +
				"<p style=\"margin-bottom: 0px\">Survey: " + survey + "%</p>"+
				"<p style=\"margin-bottom: 0px\">Routine: " + routine + "%</p>";
		};

		var maxY = 0;
		var chartSeries = [], tickValues = [0, 1], chartOptions = {};
		if (datapoints.length > 0) {

			var externalSeries = {
				"key": "Survey",
				"color": "red",
				"values": [{"x": 0, "y": -100}]
			};
			var routineSeries = {
				"key": "Routine",
				"color": "blue",
				"values": [{"x": 0, "y": -100}]
			};

			var externalShape = "circle", routineShape = "cross";
			if (result.boundaryRatio > (1 + 0.01*result.criteria) ||result.boundaryRatio < (1 - 0.01*result.criteria)) {
				if (result.boundaryValue > result.boundaryRefValue ) {
					externalShape = "triangle-down";
					routineShape = "triangle-up";
				}
				else {
					routineShape = "triangle-down";
					externalShape = "triangle-up";
				}
			}

			//Add national first
			externalSeries.values.push({
				"x": 1,
				"y": result.boundaryValue,
				"shape": externalShape,
				"size": 1,
				"z": result.boundaryID
			});
			if (result.boundaryValue > maxY) maxY = result.boundaryValue;

			routineSeries.values.push({
				"x": 1,
				"y": result.boundaryRefValue,
				"shape": routineShape,
				"size": 1,
				"z": result.boundaryID
			});
			if (result.boundaryValue > maxY) maxY = result.boundaryRefValue;

			names.push(result.boundaryName);

			var i, j;
			for (j = 0; j < datapoints.length; j++) {

				externalShape = "circle";
				routineShape = "cross";

				if (datapoints[j].violation) {
					if (datapoints[j].value > datapoints[j].refValue) {
						externalShape = "triangle-down";
						routineShape = "triangle-up";
					}
					else {
						routineShape = "triangle-down";
						externalShape = "triangle-up";
					}
				}

				i = j+2;
				externalSeries.values.push({
					"x": i,
					"y": datapoints[j].value,
					"z": datapoints[j].id,
					"shape": externalShape,
					"size": 1
				});
				if (datapoints[j].value > maxY) maxY = datapoints[j].value;


				routineSeries.values.push({
					"x": i,
					"y": datapoints[j].refValue,
					"z": datapoints[j].id,
					"shape": routineShape,
					"size": 1
				});
				if (datapoints[j].refValue > maxY) maxY = datapoints[j].refValue;

				names.push(datapoints[j].name);
				tickValues.push(i);
			}

			++i;
			externalSeries.values.push({
				"x": i,
				"y": -100
			});
			routineSeries.values.push({
				"x": i,
				"y": -100
			});
			tickValues.push(i);

			chartSeries.push(routineSeries, externalSeries);

			chartOptions = {
				chart: {
					type: "scatterChart",
					margin : {
						top: 30,
						right: 30,
						bottom: 100,
						left: 50
					},
					yDomain: [0, getRange(maxY)],
					xAxis: {
						"tickFormat": function(d) {
							if (d === tickValues[0] || d === tickValues[tickValues.length-1]) return "";
							return names[d-1];
						},
						"tickValues": tickValues,
						"rotateLabels": -45
					},
					yAxis: {
						tickFormat: function(d){
							return d3.format("d")(d);
						}
					},
					"transitionDuration": 100,
					"tooltip": {
						enabled: true,
						contentGenerator: toolTip
					}
				},
				type: "scatter"
			};


		}
		//No subunits, make bullet chart instead
		else {

			toolTip = function(point) {

				if (point.label === "Range") return "";

				return "<h3>" + point.label + "</h3>" +
					"<p style=\"margin-bottom: 0px\">" + point.value + "%</p>";
			};


			chartOptions = {
				chart: {
					margin : {
						left: result.meta.name.length*6 + 20
					},
					type: "bulletChart",
					transitionDuration: 100,
					"tooltip": {
						enabled: true,
						contentGenerator: toolTip
					}
				},
				type: "bullet"
			};

			maxY = 100;
			if (result.boundaryValue > maxY) maxY =  result.boundaryValue;
			if (result.boundaryRefValue > maxY) maxY = result.boundaryRefValue;
			if (maxY != 100) maxY = getRange(maxY);


			chartSeries = {
				"title": result.boundaryName,
				"subtitle": result.meta.name,
				"ranges":[0,maxY],
				"measures":[result.boundaryRefValue],
				"markers":[result.boundaryValue],
				"markerLabels":["Survey"],
				"rangeLabels":["Range"],
				"measureLabels":["Routine"]
			};
		}

		if (callback) {
			callback(chartSeries, chartOptions);
		}
		else {
			result.chartOptions = chartOptions;
			result.chartData = chartSeries;
		}

	};



	/** Data consistency */
	self.makeBulletChart = function (callback, result) {

		var toolTip = function(point) {

			if (point.label === "Range") return "";

			return "<h3>" + point.label + "</h3>" +
				"<p style=\"margin-bottom: 0px\">" + point.value + "%</p>";
		};


		var chartSeries = [], chartOptions = {};


		chartOptions = {
			chart: {
				margin : {
					left: result.meta.name.length*6 + 20
				},
				type: "bulletChart",
				transitionDuration: 100,
				"tooltip": {
					enabled: true,
					contentGenerator: toolTip
				}
			},
			type: "bullet"
		};

		var maxY = 100;
		if (result.boundaryValue > maxY) maxY =  result.boundaryValue;
		if (result.boundaryRefValue > maxY) maxY = result.boundaryRefValue;
		if (maxY != 100) maxY = getRange(maxY);


		chartSeries = {
			"title": result.boundaryName,
			"subtitle": result.meta.name,
			"ranges":[0,maxY],
			"measures":[result.boundaryRefValue],
			"markers":[result.boundaryValue],
			"markerLabels":["Survey"],
			"rangeLabels":["Range"],
			"measureLabels":["Routine"]
		};


		if (callback) {
			callback(chartSeries, chartOptions);
		}
		else {
			result.chartOptions = chartOptions;
			result.chartData = chartSeries;
		}

	};



	/** Dropout */
	self.makeDropoutRateChart = function(callback, result) {


		var toolTip = function(point) {
			var data = result.subunitDatapoints;

			if (!point.data.hasOwnProperty("z")) {
				return "<h3>Threshold</h3>" +
					"<p>0 % dropout</p>";
			}

			var rate = mathService.round(100*mathService.dropOutRate(data[point.data.x].value, data[point.data.x].refValue), 2);
			if (isFinite(rate)) {
				return "<h3>" + data[point.data.x].name + "</h3>" +
					"<p>" +  rate  + "% dropout</p>";
			}
			else {
				return "<h3>" + data[point.data.x].name + "</h3>" +
					"<p>Full negative dropout.</p>";
			}
		};

		var chartSeries = [];
		if (result.subunitDatapoints.length > 0) {
			var chartSerie = {
				"key": "Orgunits",
				"values": []
			};
			var minVal = -10;
			var maxVal = 50;
			var point, value;
			for (let i = 0; i < result.subunitDatapoints.length; i++) {
				point = result.subunitDatapoints[i];
				value = 100*mathService.dropOutRate(point.value, point.refValue);

				if (value > maxVal) maxVal = value;
				else if (value < minVal) minVal = value;

				var bar = {
					"x": i,
					"y": mathService.round(value, 2),
					"z": point.id
				};

				if (point.violation) {
					bar.color = "red";
				}

				chartSerie.values.push(bar);
			}

			chartSeries.push(chartSerie);
		}

		minVal = minVal < -100 ? -100 : getRange(minVal);
		maxVal = maxVal >= 100 ? 100 : getRange(maxVal);
		var chartOptions = {
			"chart": {
				"type": "multiBarChart",
				"height": 300,
				"margin": {
					"top": 20,
					"right": 20,
					"bottom": 10,
					"left": 80
				},
				"forceY": [getRange(minVal), getRange(maxVal)],
				"showXAxis": false,
				"yAxis": {
					"axisLabel": "Dropout rate (%)",
					"tickFormat": d3.format("d")
				},
				"tooltip": {
					enabled: true,
					contentGenerator: toolTip
				},
				"showLegend": false,
				"showControls": false,
				"transitionDuration": 100
			}
		};

		if (callback) {
			callback(chartSeries, chartOptions);
		}
		else {
			result.chartOptions = chartOptions;
			result.chartData = chartSeries;
		}
	};



	/** -- MODIFYING OPTIONS -- */
	self.setChartTitle = function(options, title, subtitle) {
		if (title) {
			options.title = {
				"enable": true,
				"text": title
			};
		}
		if (subtitle) {
			options.subtitle = {
				"enable": true,
				"text": subtitle
			};
		}
	};


	self.setChartHeight = function(options, height) {
		options.chart.height = height;
	};


	self.setChartYAxis = function(options, start, end) {
		options.chart.forceY = [start, end];
	};


	self.setChartLegend = function(options, showLegend) {
		options.chart.showLegend = showLegend;
	};


	self.setChartMargins = function(options, top, right, bottom, left) {
		if (top) options.chart.margin.top = top;
		if (right) options.chart.margin.right = right;
		if (bottom) options.chart.margin.bottom = bottom;
		if (left) options.chart.margin.left = left;
	};



	/** -- UTILITIES -- */
	/*
		Requires DHIS analytics data in json format. 
		@param header			response header from analytics
		@param dataValues		response rows from analytics
		@param de, pe, ou, co	IDs
		
		@returns float of datavalue, or null if not found
		*/
	function dataValue(header, dataValues, de, pe, ou, co) {
		var dxi, pei, oui, coi, vali;
		for (let i = 0; i < header.length; i++) {
			if (header[i].name === "dx" && !header[i].hidden) dxi = i;
			if (header[i].name === "ou" && !header[i].hidden) oui = i;
			if (header[i].name === "pe" && !header[i].hidden) pei = i;
			if (header[i].name === "co" && !header[i].hidden) coi = i;
			if (header[i].name === "value" && !header[i].hidden) vali = i;
		}

		var data;
		for (let i = 0; i < dataValues.length; i++) {
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
	 * Sorts number of data points in scatterplots. Orders first by weight, then average of
	 * numerator and denominator
	 */
	function sortScatterData(datapoints) {

		datapoints.sort(function (a, b) {
			var weightDiff = b.weight - a.weight;
			if (weightDiff === 0) {
				var aVal = (a.value + a.refValue)/2;
				var bVal = (b.value + b.refValue)/2;
				return bVal - aVal;
			}
			else {
				return weightDiff;
			}
		});

		return datapoints;
	}

	/**
	 * Checks if a ratio is in fact a valid ratio (i.e. is a finite number)
	 *
	 * @param ratio
	 * @returns {boolean}
	 */
	/* function validRatio(ratio) {
		if (!isNaN(ratio) && isFinite(ratio)) return true;
		else {
			return false;
		}

	} */


	/**
	 * Calculates a reasonable max X and Y axis range based on highest values
	 *
	 * @param value 	highest value in dataset
	 * @returns 		object with proposed max value to use
	 */

	function getRange(value) {

		//Else, get number of digits
		var digits = parseInt(Math.abs(value)).toString().length;

		var factor;
		if (digits > 2) {
			factor  = Math.pow(10, (digits-2));
		}
		else if (digits == 2) {
			factor = 5;
		}
		else if (digits == 1) {
			factor = 2;
		}
		else return 0;


		var partial = value/factor;
		if (partial % 10 === 0) {
			partial++;
		}
		else {
			partial = Math.ceil(partial);
		}

		return factor*partial;

	}


	/**
	 * Estimates the required margin for the x and y labels.
	 * @param x
	 * @param y
	 * @param rotated	is y axis rotated?
	 */
	function estimateLabelSize(x, y, rotated) {

		//Assume 7 pixels per digit if not rotated, 4 if rotated

		x = rotated ? parseInt(4.3*x) : 8*x;
		x = Math.max(x, 16);
		y = 8*y;
		y = Math.max(y, 16);

		return {
			"x": x,
			"y": y
		};
	}


	/**
	 * Make "scatter" points from subunit data, for use with MultiChart
	 *
	 *
	 */
	function scatterPoints(datapoints) {
		datapoints = sortScatterData(datapoints);

		var chartSeries = [];
		var maxX = 0;
		var maxY = 0;

		var chartSerie = {
			"key": "Orgunits",
			"values": []
		};
		for (let i = 0; i < Math.min(datapoints.length, maxScatterPoints); i++) {
			var datapoint = {
				"x": datapoints[i].refValue,
				"y": datapoints[i].value,
				"z": datapoints[i].id,
				"shape": datapoints[i].violation ? "diamond" : "circle"
			};

			if (datapoints[i].refValue > maxX) maxX = datapoints[i].refValue;
			if (datapoints[i].value > maxY) maxY = datapoints[i].value;

			chartSerie.values.push(datapoint);
		}
		if (chartSerie.values.length > 0) chartSeries.push(chartSerie);


		return {
			"chartSeries": chartSeries,
			"maxX": maxX,
			"maxY": maxY
		};

	}


	function scatterLine(ratio, key, color) {

		return {
			"key": key,
			"color": color,
			"values": [],
			"slope": ratio,
			"intercept": 0.000001
		};
	}



	return self;

}