(function(){  
	/**Service: Completeness*/
	angular.module('dataQualityApp').service('visualisationService', ['periodService', 'requestService', 'mathService', function (periodService, requestService, mathService) {
	
	  	
	  	var self = this;
		
		/** NG-NVD3 Line */
		/*
		Takes IDs as parameters, returns chartData and chartOptions for use with angular-nvd3
		*/
		self.lineChart = function (callback, dataIDs, periodIDs, orgunitIDs, type) {
		
			var requestURL = '/api/analytics.json?';
			requestURL += "dimension=dx:" + dataIDs.join(';');
			requestURL += "&dimension=pe:" + periodIDs.join(";");
			requestURL += "&dimension=ou:" + orgunitIDs.join(";");
						
			requestService.getSingle(requestURL).then(function (response) {
				
				var data = response.data.rows;
				var header = response.data.headers;
				var names = response.data.metaData.names;
				
				orgunitIDs = response.data.metaData.ou; //Replace for "USER ORGUNIT" etc
				
				var chartData = [];
				var chartOptions;
				if (type === 'dataOverTime') {
					
					if (orgunitIDs.length > 1) console.log("Warning: more than one orgunit for dataOverTime chart");
					
					for (var i = 0; i < dataIDs.length; i++) {
						var chartSerie = {
							'key': names[dataIDs[i]],
							'values': []
						};
						
						for (var j = 0; j < periodIDs.length; j++) {
							var value = dataValue(header, data, dataIDs[i], periodIDs[j], orgunitIDs[0], null);
							
							chartSerie.values.push({
								'x': j,
								'y': mathService.round(value, 2)
							});
							
						}
						
						chartData.push(chartSerie);
					}
			
					
					//Get XAxis labels = periods from series[0]
					var periodNames = [];
					for (var i = 0; i < periodIDs.length; i++) {
						periodNames.push(periodService.shortPeriodName(periodIDs[i].toString()));
					}

					//Chart options		
					chartOptions = {
					   	"chart": {
					        "type": "lineChart",
					        "height": 400,
					        "margin": {
					          "top": 140,
					          "right": 20,
					          "bottom": 100,
					          "left": 100
					        },
					        "xAxis": {
					          'rotateLabels': -30,
					          'tickFormat': function(d) {
					          	return periodNames[d];
					          }
					        },
					        'tooltips': true,
					        'showLegend': true
					    },
					    'parameters': {
					    	'dataIDs': dataIDs, 
					    	'periods': periodIDs,
					    	'orgunitIDs': orgunitIDs,
					    	'type': type					    
					    }
					}
				
				}
				
				callback(chartData, chartOptions);
			});
		};
		
		
		/** NG-NVD3 Multibar */
		/*
		Takes IDs as parameters, returns chartData and chartOptions for use with angular-nvd3
		*/
		self.multiBarChart = function (callback, dataIDs, periodIDs, orgunitIDs, type) {
				
			var requestURL = '/api/analytics.json?';
			requestURL += "dimension=dx:" + dataIDs.join(';');
			requestURL += "&dimension=pe:" + periodIDs.join(";");
			requestURL += "&dimension=ou:" + orgunitIDs.join(";");
						
			requestService.getSingle(requestURL).then(function (response) {
				
				var data = response.data.rows;
				var header = response.data.headers;
				var names = response.data.metaData.names;
				
				orgunitIDs = response.data.metaData.ou; //Replace for "USER ORGUNIT" etc
				
				var chartData = [];
				var chartOptions;
				if (type === 'dataOverTime') {
					
					if (orgunitIDs.length > 1) console.log("Warning: more than one orgunit for dataOverTime chart");
					
					for (var i = 0; i < dataIDs.length; i++) {
						var chartSerie = {
							'key': names[dataIDs[i]],
							'values': []
						};
						
						for (var j = 0; j < periodIDs.length; j++) {
							var value = dataValue(header, data, dataIDs[i], periodIDs[j], orgunitIDs[0], null);
							
							if (isNaN(value)) value = null;
							else value = mathService.round(value, 2);
							
							chartSerie.values.push({
								'x': j,
								'y': value
							});
							
						}
						
						chartData.push(chartSerie);
					}
			
					
					//Get XAxis labels = periods from series[0]
					var periodNames = [];
					for (var i = 0; i < periodIDs.length; i++) {
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
					        "xAxis": {
					          'rotateLabels': -30,
					          'tickFormat': function(d) {
					          	return periodNames[d];
					          }
					        },
					        'tooltips': true,
					        'showLegend': true
					    },
					    'parameters': {
					    	'dataIDs': dataIDs, 
					    	'periods': periodIDs,
					    	'orgunitIDs': orgunitIDs,
					    	'type': type					    
					    }
					}
				
				}
				
				
				callback(chartData, chartOptions);
			});
		};
		
		
		/** NG-NVD3 Bar */
		/*
		Takes IDs as parameters, returns chartData and chartOptions for use with angular-nvd3
		*/
		self.barChart = function (callback, dataIDs, periodIDs, orgunitIDs, type) {
				
			var requestURL = '/api/analytics.json?';
			requestURL += "dimension=dx:" + dataIDs.join(';');
			requestURL += "&dimension=pe:" + periodIDs.join(";");
			requestURL += "&dimension=ou:" + orgunitIDs.join(";");
						
			requestService.getSingle(requestURL).then(function (response) {
				
				var data = response.data.rows;
				var header = response.data.headers;
				var names = response.data.metaData.names;
				
				orgunitIDs = response.data.metaData.ou; //Replace for "USER ORGUNIT" etc
				
				var chartData = [];
				var chartOptions;
				if (type === 'ou') {
					
					if (dataIDs.length > 1) console.log("Warning: more than one data item for ou bar chart");
					if (periodIDs.length > 1) console.log("Warning: more than one period item for ou bar chart");
					
					var dx = dataIDs[0];
					var pe = periodIDs[0];
					
					for (var i = 0; i < dataIDs.length; i++) {
						var chartSerie = {
							'key': names[dx],
							'values': []
						};
						
						for (var j = 0; j < orgunitIDs.length; j++) {
							var value = dataValue(header, data, dx, pe, orgunitIDs[j], null);
							
							if (isNaN(value)) value = null;
							else value = mathService.round(value, 0);
							
							chartSerie.values.push({
								'label': names[orgunitIDs[j]],
								'value': value
							});
							
						}
						
						chartData.push(chartSerie);
					}
			
					//Chart options		
					chartOptions = {
					   	"chart": {
					        "type": "discreteBarChart",
					        "height": 300,
					        "margin": {
					          "top": 20,
					          "right": 20,
					          "bottom": 60,
					          "left": 20
					        },
					        'tooltips': true,
					        'showLegend': true,
	                        'x': function(d){return d.label;},
	                        'y': function(d){return d.value;},
	                        'transitionDuration': 500,
	                        'xAxis': {
	                            'rotateLabels': -30
	                        }
					    },
					    'parameters': {
					    	'dataIDs': dataIDs, 
					    	'periods': periodIDs,
					    	'orgunitIDs': orgunitIDs,
					    	'type': type					    
					    }
					}
				
				}
				
				
				callback(chartData, chartOptions);
			});
		};
				
		
	  	/** NG-NVD3 YY line chart */
	  	/*Year over year line chart - parameter-based
	  	@param elementID	html element to place chart in
	  	@param periods		array of array of ISO period, one set for each series. Same period in each year.
	  	@param dataIDs		data ID
	  	@param ouID			orgunit ID
	  	*/
	  	self.yyLineChart = function (callback, periods, dataID, ouID) {
	  		
	  		var requestURL, requests = [];
	  		for (var i = 0; i < periods.length; i++) {
	  			requestURL = '/api/analytics.json?';
  				requestURL += "dimension=dx:" + dataID;
  				requestURL += "&dimension=pe:" + periods[i].join(';');
  				requestURL += "&filter=ou:" + ouID;
  				requests.push(requestURL);
	  		}
	  		
	  		requestService.getMultiple(requests).then(function (response) {
	  			var data = [];
	  			for (var i = 0; i < response.length; i++) {
	  				data.push(response[i].data);
	  			}
	  			
	  			//Get XAxis labels = periods from series[0]
  				var periodNames = [];
  				for (var i = 0; i < periods[0].length; i++) {
  					periodNames.push(periodService.shortPeriodName(periods[0][i]).split(' ')[0]);
  				}

	  			var pe, val;
	  			for (var i = 0; i < data[0].headers.length; i++) {	
	  				if (data[0].headers[i].name === 'pe') pe = i;
	  				if (data[0].headers[i].name === 'value') val = i;
	  			}
	  			
	  			ouID = data[0].metaData.ou;
	  				
  				var minRange = 0, maxRange = 0;
  				var chartData = [], chartSeries, values, dataSet;
  				for (var i = data.length-1; i >= 0 ; i--) {
  					
  					values = [];
  					chartSeries = {};  			  		
  					dataSet = data[i];
  				
  				
  					if (dataSet.metaData.pe[0].substring(0, 4) === dataSet.metaData.pe[dataSet.metaData.pe.length-1].substring(0, 4)) {
  						chartSeries.key = dataSet.metaData.pe[0].substring(0, 4);
  					}
  					else {
  						chartSeries.key = dataSet.metaData.pe[0].substring(0, 4) + ' - ' + dataSet.metaData.pe[dataSet.metaData.pe.length-1].substring(0, 4);
  					}
  					
  					var row, value, values = [];
  					for (var j = 0; j < periods[i].length; j++) {
  					
  						var period = periods[i][j];
  						var rows = dataSet.rows;
  						
  					 	for (var k = 0; k < rows.length; k++) {
  						 	
  						 	row = rows[k];
  							if (row[pe] === period) {
  							
  								value = parseFloat(row[val]);
  								if (isNaN(value)) value = null;
  								
  								values.push({
  									'x': j,
  									'y': value
  								});
  								
  								if (value < minRange) {
  									minRange = value;
  								}
  								if (value > maxRange) {
  									maxRange = value;
  								}
  								
  								k = rows.length;
  							}
  						}
  					}
  					
  					chartSeries.values = values;
  					chartSeries.periods = periods[i];
  					chartData.push(chartSeries);
  				}
  				
  				var toolTip = function(key, x, y, e, graph) {
  				    return '<h3>' + periodService.shortPeriodName(e.series.periods[e.point.x]) + '</h3>' +
  				        '<p>' + y + '</p>'; 
  				};
  				
  				//Chart options		
  				var chartOptions = {
  				   	"chart": {
  				   		"x": function(d){ return d.x; },
  				   		"y": function(d){ return d.y; },
  				        "type": "lineChart",
  				        "height": 400,
  				        "margin": {
  				          "top": 140,
  				          "right": 20,
  				          "bottom": 100,
  				          "left": 100
  				        },
  				        "xAxis": {
  				          'rotateLabels': -30,
  				          'tickFormat': function(d) {return periodNames[d];}
  				        },
  				        'tooltips': true,
  				        'tooltipContent': toolTip,
  				        'showLegend': true,
  				        'useInteractiveGuideline': true
  				    },
  				    'parameters': {
  				    	'dataID': dataID, 
  				    	'periods': periods,
  				    	'orgunitIDs': ouID
  				    }
  				};
  				
  				callback(chartData, chartOptions);
  				
	  		});
	  	};
	  	
	  	
	  	
		
		/** -- PROCESSING ANALYSED DATA -- */
		
		
		/** Time consistency */
		/*
		@param callback 	callback function, takes chartData and chartOptions as parameters. If null, options and data are stored in reference result object
		@param result		result as returned from data analysis service (timeConsistency function)
		*/
		self.makeTimeConsistencyChart = function(callback, result) {	    		    	  		    
	    	var datapoints = result.subunitDatapoints;
	    	var boundaryRatio = result.boundaryRatio;
	    	var consistency = result.threshold; 
	    		    	
	    	var toolTip = function(key, x, y, e, graph) {
	    		var data = result.subunitDatapoints;
	    		
	    		var toolTipHTML = '<h3>' + data[graph.pointIndex].name + '</h3>';
    			toolTipHTML += '<p style="margin-bottom: 0px">' + periodService.shortPeriodName(result.pe) + ': ' + y + '</p>';
	    		if (result.type === 'constant') {
	    			toolTipHTML += '<p>Average: ' + x + '</p>'; 	    			
	    		}
	    		else {
	    			toolTipHTML += '<p>Forecasted: ' + x + '</p>'; 	    			
	    		}
	    	    return toolTipHTML;
	    	};
	    	
	    	
	    	var chartSeries = [];
	    	var chartSerie = {
	    		'key': "Orgunits",
	    		'values': []
	    	};
	    	
	    	for (var i = 0; i < datapoints.length; i++) {
	    		chartSerie.values.push({
	    			'x': datapoints[i].refValue,
	    			'y': datapoints[i].value,
	    			'z': datapoints[i].id
	    		});
	    	}

	    	chartSeries.push(chartSerie);
	    	chartSeries.push(
	    		{
	    			'key': "Overall",
	    			'color': '#ffff',
	    			'values': [{
	    			'x': 0,
	    			'y': 0,
	    			'size': 0
	    			}
	    			],
	    			'slope': boundaryRatio,
	    			'intercept': 0.001
	    		},
	    		{
	    			'key': "+ " + consistency + "%",
	    			'color': '#F00',
	    			'values': [{
	    			'x': 0,
	    			'y': 0,
	    			'size': 0
	    			}
	    			],
	    			'slope': boundaryRatio+consistency/100,
	    			'intercept': 0.001
	    		},
	    		{
	    			'key': "- " + consistency + "%",
	    			'color': '#F00',
	    			'values': [{
	    			'x': 0,
	    			'y': 0,
	    			'size': 0
	    			}
	    			],
	    			'slope': boundaryRatio-consistency/100,
	    			'intercept': 0.001
	    		}
	    	);
	    		    	
			var xAxisLabel;
			if (result.type === "constant") xAxisLabel = "Average of previous periods";
			else xAxisLabel = "Forecasted value";
			
	    	var chartOptions = {
	    	   	"chart": {
	    	        "type": "scatterChart",
	    	        "height": 300,
	    	        "margin": {
	    	          "top": 10,
	    	          "right": 30,
	    	          "bottom": 80,
	    	          "left": 100
	    	        },
	    	        "scatter": {
	    	        	"onlyCircles": false
	    	        },
	    	        "clipEdge": false,
	    	        "staggerLabels": true,
	    	        "transitionDuration": 1,
	    	        "showDistX": true,
	    	        "showDistY": true,
	    	        "xAxis": {
	    	              "axisLabel": xAxisLabel,
	    	              "axisLabelDistance": 30,
	    	              "tickFormat": d3.format('g')
	    	        },
	    	        "yAxis": {
	    	        	"axisLabel": periodService.shortPeriodName(result.pe),
	    	            "axisLabelDistance": 30,
	    	            "tickFormat": d3.format('g')
	    	        },
	    	        'tooltips': true,
	    	        'tooltipContent': toolTip
	    	        
	    	    },
	    	    "title": {
	    	    	'enable': true,
	    	    	'text': result.dxName
	    	    },
	    	    "subtitle": {
	    	    	'enable': false
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
		self.makeDataConsistencyChart = function (callback, result) {	    		    	
			    
	    	var datapoints = result.subunitDatapoints;
	    	var boundaryRatio = result.boundaryRatio;
	    	var consistency = result.criteria; 
	    		    	
	    	var toolTip = function(key, x, y, e, graph) {
	    		var data = result.subunitDatapoints;
	    	    return '<h3>' + data[graph.pointIndex].name + '</h3>' +
	    	        '<p style="margin-bottom: 0px">' + result.dxNameA + ': ' + y + '</p>' + 
	    	        '<p>' + result.dxNameB + ': ' + x + '</p>'; 
	    	};
	    	
	    	
	    	var chartSeries = [];
	    	var chartSerie = {
	    		'key': "Orgunits",
	    		'values': []
	    	};
	    	
	    	for (var i = 0; i < datapoints.length; i++) {
	    		chartSerie.values.push({
	    			'x': datapoints[i].refValue,
	    			'y': datapoints[i].value,
	    			'z': datapoints[i].id
	    		});
	    	}

	    	chartSeries.push(chartSerie);
	    	chartSeries.push(
	    		{
	    			'key': "Overall",
	    			'color': '#ffff',
	    			'values': [{
	    			'x': 0,
	    			'y': 0,
	    			'size': 0
	    			}
	    			],
	    			'slope': boundaryRatio,
	    			'intercept': 0.001
	    		},
	    		{
	    			'key': "+ " + consistency + "%",
	    			'color': '#F00',
	    			'values': [{
	    			'x': 0,
	    			'y': 0,
	    			'size': 0
	    			}
	    			],
	    			'slope': boundaryRatio+consistency/100,
	    			'intercept': 0.001
	    		},
	    		{
	    			'key': "- " + consistency + "%",
	    			'color': '#F00',
	    			'values': [{
	    			'x': 0,
	    			'y': 0,
	    			'size': 0
	    			}
	    			],
	    			'slope': boundaryRatio-consistency/100,
	    			'intercept': 0.001
	    		}
	    	);
	    	var chartOptions = {
	    	   	"chart": {
	    	        "type": "scatterChart",
	    	        "height": 300,
	    	        "margin": {
	    	          "top": 10,
	    	          "right": 30,
	    	          "bottom": 80,
	    	          "left": 100
	    	        },
	    	        "scatter": {
	    	        	"onlyCircles": false
	    	        },
	    	        "clipEdge": false,
	    	        "staggerLabels": true,
	    	        "transitionDuration": 1,
	    	        "showDistX": true,
	    	        "showDistY": true,
	    	        "xAxis": {
	    	              "axisLabel": result.dxNameB,
	    	              "axisLabelDistance": 30,
	    	              "tickFormat": d3.format('g')
	    	        },
	    	        "yAxis": {
	    	        	"axisLabel": result.dxNameA,
	    	            "axisLabelDistance": 30,
	    	            "tickFormat": d3.format('g')
	    	        },
	    	        'tooltips': true,
	    	        'tooltipContent': toolTip
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


	    /** Dropout */
	    self.makeDropoutRateChart = function(callback, result) {	    		    	
	    	var chartSeries = [];
	    	var chartSerie = {
	    		'key': "Orgunits",
	    		'values': []
	    	};

	    	var toolTip = function(key, x, y, e, graph) {
	    		var data = result.subunitDatapoints;
	    	    return '<h3>' + data[x].name + '</h3>' +
	    	        '<p>' +  mathService.round(100*(data[x].value-data[x].refValue)/data[x].value,1)  + '% dropout</p>'
	    	};
	    	
	    	var minVal = 0.9;
	    	var maxVal = 2;
	    	var point, value;
	    	for (var i = 0; i < result.subunitDatapoints.length; i++) {
	    		point = result.subunitDatapoints[i];
	    		value = point.value/point.refValue;
	    		
	    		if (value > maxVal) maxVal = value;
	    		else if (value < minVal) minVal = value;
	    		
	    		chartSerie.values.push({
	    			'x': i,
	    			'y': mathService.round(value, 2),
	    			'z': point.id
	    		});
	    	}

	    	chartSeries.push(chartSerie);	    		
	    	
	    	var chartOptions = {
	    	   	"chart": {
	    	        "type": "lineChart",
	    	        "height": 300,
	    	        "margin": {
	    	          "top": 10,
	    	          "right": 30,
	    	          "bottom": 80,
	    	          "left": 100
	    	        },
	    	        "xAxis": {
	    	          "showMaxMin": false,
	    	          'axisLabel': "Orgunits"
	    	        },
	    	        "yAxis": {
	    	          "axisLabel": "Ratio"
	    	        },
	    	        'tooltips': true,
	    	        'tooltipContent': toolTip,
	    	        'showLegend': true,
	    	      	'forceY': [Math.floor(minVal*10)/10, Math.ceil(maxVal*10)/10], 
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
		
	  	
	  	
	  	return self;
	  	
		}]);
	
	
})();