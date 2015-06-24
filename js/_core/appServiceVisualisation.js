(function(){  
	/**Service: Completeness*/
	angular.module('dataQualityApp').service('visualisationService', ['periodService', 'requestService', 'mathService', function (periodService, requestService, mathService) {
	
	  	
	  	var self = this;
		
		/** ANGULAR-NVD3 LINE CHART */
		/*
		Takes IDs as parameters, returns chartData and chartOptions for use with angular-nvd3
		*/
		self.lineChart = function (callback, dataIDs, periodIDs, orgunitIDs, type) {
		
			var requestURL = '/api/analytics.json?'
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
						}
						
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
		}
		
		
		/** ANGULAR-NVD3 MULTIBAR CHART */
		/*
		Takes IDs as parameters, returns chartData and chartOptions for use with angular-nvd3
		*/
		self.multiBarChart = function (callback, dataIDs, periodIDs, orgunitIDs, type) {
				
			var requestURL = '/api/analytics.json?'
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
						}
						
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
		}
		
		
		/** ANGULAR-NVD3 BAR CHART */
		/*
		Takes IDs as parameters, returns chartData and chartOptions for use with angular-nvd3
		*/
		self.barChart = function (callback, dataIDs, periodIDs, orgunitIDs, type) {
				
			var requestURL = '/api/analytics.json?'
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
						}
						
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
		}
				
		
		/**
		Line chart - parameter-based
		@param elementID	html element to place chart in
		@param periods		array ISO periods
		@param dataIDs		array of data IDs. One series will be created for each
		@param ouID			orgunit ID
		*/
		self.autoLineChart = function (elementID, periods, dataIDs, ouID, options) {
			
			var requestURL = '/api/analytics.json?'
			requestURL += "dimension=dx:" + dataIDs.join(';');
			requestURL += "&dimension=pe:" + periods.join(";");
			requestURL += "&filter=ou:" + ouID;
			requestURL += '&hideEmptyRows=true';
			requestURL += '&tableLayout=true';
			requestURL += '&columns=pe&rows=dx';
						
			requestService.getSingle(requestURL).then(function (response) {
				
				makeLineChart(elementID, periods, dataIDs, ouID, options, response.data);
			
			});
		}
		

		/**
		Distinct bar chart (OU) - parameter-based
		@param elementID	html element to place chart in
		@param periods		ISO period
		@param dataIDs		data ID 
		@param ouID			array of orgunit IDs, OR relative (USER_ORGUNIT etc)
		*/
		self.autoOUBarChart = function (elementID, period, dataID, ouIDs, options) {
			
			var requestURL = '/api/analytics.json?'
			requestURL += "dimension=dx:" + dataID;
			requestURL += "&filter=pe:" + period;
			
			if (Object.prototype.toString.call(ouIDs) === '[object Array]') {
				requestURL += "&dimension=ou:" + ouIDs.join(';');
			}
			else {
				requestURL += "&dimension=ou:" + ouIDs;
			}
			
			requestService.getSingle(requestURL).then(function (response) {
				
				makeOUBarChart(elementID, period, dataID, ouIDs, options, response.data);
			
			});
		}
		
		
	  	/**
	  	Year over year line chart - parameter-based
	  	@param elementID	html element to place chart in
	  	@param periods		array of array of ISO period, one set for each series. Same period in each year.
	  	@param dataIDs		data ID
	  	@param ouID			orgunit ID
	  	*/
	  	self.yyLineChart = function (callback, periods, dataID, ouID) {
	  		
	  		var requestURL, requests = [];
	  		for (var i = 0; i < periods.length; i++) {
	  			requestURL = '/api/analytics.json?'
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
  				}
  				
  				callback(chartData, chartOptions);
  				
	  		});
	  	}
	  	
	  	
	  	
	  	function makeYYLineChart(elementID, periods, dataID, ouIDs, options, data) {
	  		
	  		nv.addGraph(function() {
  				var chart = nv.models.lineChart();
  				  
  				chart.margin({left: 50})  //t chart margins to give the x-axis some breathing room.
  				       .useInteractiveGuideline(true)  //We want nice looking tooltips and a guideline!
  				       .showLegend(true)       //Show the legend, allowing users to turn on/off line series.
  				       .tooltips(true)
  				       .showYAxis(true)        //Show the y-axis
  				       .showXAxis(true)        //Show the x-axis
  				;
  				
				var pe, val;
				for (var i = 0; i < data[0].headers.length; i++) {	
					if (data[0].headers[i].name === 'pe') pe = i;
					if (data[0].headers[i].name === 'value') val = i;
				}
  				
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
  					chartData.push(chartSeries);
  				}
  				
  				//Get XAxis labels = periods from series[0]
  				var periodNames = [];
  				for (var i = 0; i < periods[0].length; i++) {
  					periodNames.push(periodService.shortPeriodName(periods[0][i]).split(' ')[0]);
  				}
  				
  					
  				//Leave some room above/below the max
	  			minRange = parseInt(minRange - minRange*0.3);
	  			maxRange = parseInt(maxRange + maxRange*0.3);
  				if (options && options.range) {
  					if (options.range.min) minRange = options.range.min;
  					if (options.range.max) maxRange = options.range.max;
  				}
  						  	
  				chart.xAxis     //Chart x-axis settings
  				      .rotateLabels(-30)
  				      .tickFormat(function(d) {
  				             return periodNames[d];
  				           });
  							
  				chart.yAxis
  				 	.tickFormat(d3.format('g'));
  				  				
  				chart.forceY([minRange, maxRange]);
  				
  				if (options.title) {
  					$('#' + elementID + ' svg').parent().prepend('<div class="chart-title">' + options.title + '</div>');
  				}

  				/* Done setting the chart up? Time to render it!*/		  	
  				d3.select('#' + elementID + ' svg')    //Select the <svg> element you want to render the chart in.   
  				      .datum(chartData)         //Populate the <svg> element with chart data...
  				      .call(chart);          //Finally, render the chart!
  				
  				//Update the chart when window resizes.
  				$(window).bind('resize', function(){ d3.select('#' + elementID + ' svg')
  					.transition().duration(50)
  					.call(chart); });
  				
  				if (options && options.callBack) options.callBack(); 
  				
  				return chart;
  			});
	  	
	  	}
	  	
	  	
	  	
	  	function makeOUBarChart(elementID, period, dataID, ouIDs, options, data) {
	  	
	  		nv.addGraph(function() {
				var chart = nv.models.discreteBarChart()
				  .margin({bottom: 75})
				  .x(function(d) { return d.label })    //Specify the data accessors.
				  .y(function(d) { return d.value })
				  .staggerLabels(false)    //Too many bars and not enough room? Try staggering labels.
				  .tooltips(true)        //Don't show tooltips
				  .showValues(false)       //...instead, show the bar value right on top of each bar.
				  ;
				
				
				var dx, ou, val;
				for (var i = 0; i < data.headers.length; i++) {	
					if (data.headers[i].name === 'dx') dx = i;
					if (data.headers[i].name === 'ou') ou = i;
					if (data.headers[i].name === 'value') val = i;
				}
					
				var minRange = 0, maxRange = 0;
				var chartData = [], chartSeries = {};
					
				chartSeries.key = data.metaData.names[dataID];
				
				
				//To-Do: add option to include children without data
				var row, value, values = [];
				for (var i = 0; i < data.rows.length; i++) {
				 	row = data.rows[i];	
					value = parseInt(row[val]);
					if (isNaN(value)) value = null;
  					values.push({
  						'label': data.metaData.names[row[ou]],
  						'value': value
  					});
  					
  					if (value < minRange) {
  						minRange = value;
  					}
  					if (value > maxRange) {
  						maxRange = value;
  					}
  					
  					values.sort(function (a,b) {
  					  if (a.label < b.label) return -1;
  					  if (a.label > b.label) return 1;
  					  return 0;
  					});
  					
  					
				}
				
				chartSeries.values = values;
				chartData.push(chartSeries);
				
				//Leave some room above/below the max
				minRange = parseInt(minRange - minRange*0.3);
				maxRange = parseInt(maxRange + maxRange*0.3);
				if (options && options.range) {
					if (options.range.min) minRange = options.range.min;
					if (options.range.max) maxRange = options.range.max;
				}
				
				chart.xAxis.rotateLabels(-30);
				
				chart.yAxis.tickFormat(d3.format('g'));
				chart.forceY([minRange, maxRange]);
				
				if (options.title) {
					$('#' + elementID + ' svg').parent().prepend('<div class="chart-title">' + options.title + '</div>');
				}
			
				
				d3.select('#' + elementID + ' svg')
				  .datum(chartData)
				  .call(chart);
				
				$(window).bind('resize', function(){ d3.select('#' + elementID + ' svg')
					.transition().duration(50)
					.call(chart); });
				if (options && options.callBack) options.callBack();
				return chart;
	  		});
	  	}
	  	
	  	
	  	
	  	function makeLineChart(elementID, periods, dataIDs, ouID, options, data) {
	  		

	  		
	  		/*These lines are all chart setup.  Pick and choose which chart features you want to utilize. */
  			nv.addGraph(function() {
	  			var chart = nv.models.lineChart();
	  			  
	  			chart.margin({left: 50})  //Adjust chart margins to give the x-axis some breathing room.
	  			       .useInteractiveGuideline(false)  //We want nice looking tooltips and a guideline!
	  			       .showLegend(false)       //Show the legend, allowing users to turn on/off line series.
	  			       .tooltips(true)
	  			       .showYAxis(true)        //Show the y-axis
	  			       .showXAxis(true)        //Show the x-axis
	  			;
	  			
	  			
	  			var dataIDColumn;
	  			for (var i = 0; i < data.headers.length; i++) {	
					if (data.headers[i].column === 'dataid') {
						dataIDColumn = i;
						break;
					}
				}
	  			
	  			var minRange = 0, maxRange = 0;
	  			var chartData = [], chartSeries, values, dataID;
	  			for (var i = 0; i < dataIDs.length; i++) {
	  		  		
	  		  		chartSeries = {};
	  				
	  				chartSeries.key = data.metaData.names[dataIDs[i]];
	  				dataID = dataIDs[i];
	  				
	  				var row, value, values = [];
	  				for (var j = 0; j < data.rows.length; j++) {
	  				 	row = data.rows[j];
	  				 	
	  				 	if (row[dataIDColumn] === dataID) {
	  				 		count = 0;
	  				 		for (var k = 0; k < row.length; k++) {
			  					
			  					if (!data.headers[k].meta) {
			  						value = parseFloat(row[k]);
			  						if (isNaN(value)) value = null;
				  					values.push({
				  						'x': count++,
				  						'y': value
				  					});
				  					
				  					if (value < minRange) {
				  						minRange = value;
				  					}
				  					if (value > maxRange) {
				  						maxRange = value;
				  					}
				  				}
			  				}
		  				}
	  				}
	  				
	  				chartSeries.values = values;
	  				chartData.push(chartSeries);
	  			}
	  			
	  			//Get XAxis labels = periods from series[0]
	  			var periodNames = [], pe;
	  			for (var i = 0; i < periods.length; i++) {
	  				pe = periods[i].toString();
	  				periodNames.push(periodService.shortPeriodName(pe));
	  			}
	  			
		  			
	  			//Leave some room above/below the max
				minRange = parseInt(minRange - minRange*0.3);
				maxRange = parseInt(maxRange + maxRange*0.3);
	  			if (options && options.range) {
	  				if (options.range.min) minRange = options.range.min;
	  				if (options.range.max) maxRange = options.range.max;
	  			}
	  					  	
	  			chart.xAxis     //Chart x-axis settings
	  			      .rotateLabels(-30)
	  			      .tickFormat(function(d) {
	  			             return periodNames[d];
	  			           });
	  			
	  			if (options && options.yLabel) chart.yAxis.axisLabel = options.yLabel;
	  			
	  			if (options && options.title) {
	  				$('#' + elementID + ' svg').parent().prepend('<div class="chart-title">' + options.title + '</div>');
	  			}
	  			
	  			if (options && options.showLegend) {
	  				chart.showLegend(true);
	  			}
	  				  			
	  			chart.yAxis
	  			 	.tickFormat(d3.format('g'));
	  			chart.forceY([minRange, maxRange]);
	  					  	
	  					  	
	  			/* Done setting the chart up? Time to render it!*/		  	
	  			d3.select('#' + elementID + ' svg')    //Select the <svg> element you want to render the chart in.   
	  			      .datum(chartData)         //Populate the <svg> element with chart data...
	  			      .call(chart);          //Finally, render the chart!
	  			
	  			//Update the chart when window resizes.
				$(window).bind('resize', function(){ d3.select('#' + elementID + ' svg')
					.transition().duration(50)
					.call(chart); });

	  			if (options && options.callBack) options.callBack();
	  			return chart;
	  		});
	  	}
	  	
	  	
	  	
	  	self.makeDistinctBarChart = function(elementID, series, options) {
	  		
  			nv.addGraph(function() {
  			var chart = nv.models.discreteBarChart()
  			  .margin({bottom: 125})
  			  .x(function(d) { return d.label })    //Specify the data accessors.
  			  .y(function(d) { return d.value })
  			  .staggerLabels(false)    //Too many bars and not enough room? Try staggering labels.
  			  .tooltips(true)        //Don't show tooltips
  			  .showValues(false)       //...instead, show the bar value right on top of each bar.
  			  ;
  			
  			
  			chart.xAxis.rotateLabels(-30);
  			chart.yAxis.tickFormat(d3.format('g'));
  			
  			if (options.title) {
  				$('#' + elementID + ' svg').parent().prepend('<div class="chart-title">' + options.title + '</div>');
  			}
  			
  			d3.select('#' + elementID + ' svg')
  			  .datum(series)
  			  .call(chart);
  			
			$(window).bind('resize', function(){ d3.select('#' + elementID + ' svg')
					.transition().duration(50)
					.call(chart); });
  			
  			if (options && options.callBack) options.callBack();
  			return chart;
  			});
  		}
  		
  		
  		
  		self.makeMultiBarChart = function(elementID, series, options) {
  				
			nv.addGraph(function() {
			    var chart = nv.models.multiBarChart()
			      .reduceXTicks(false)   //If 'false', every single x-axis tick label will be rendered.
			      .rotateLabels(0)      //Angle to rotate x-axis labels.
			      .showControls(true)   //Allow user to switch between 'Grouped' and 'Stacked' mode.
			      .groupSpacing(0.1)    //Distance between each group of bars.
				  .stacked(true)
			    ;


				if (options.categoryLabels) {
					chart.xAxis     //Chart x-axis settings
					      .rotateLabels(-30)
					      .tickFormat(function(d) {
					             return options.categoryLabels[d];
					           });
				}
				else {
					chart.xAxis.tickFormat(d3.format('g'));
				}
				
				if (options.title) {
					$('#' + elementID + ' svg').parent().prepend('<div class="chart-title">' + options.title + '</div>');
				}
			    
			    chart.yAxis
			        .tickFormat(d3.format('g'));
			
			    d3.select('#' + elementID + ' svg')
			        .datum(series)
			        .call(chart);
			
				$(window).bind('resize', function(){ d3.select('#' + elementID + ' svg')
					.transition().duration(50)
					.call(chart); });			
				
			    return chart;
			});
		}
	  	
	  	
	  	
	  	self.makePieChart = function(elementID, series, options) {
	  	  	nv.addGraph(function() {
	  	  	  var chart = nv.models.pieChart()
	  	  	      .x(function(d) { return d.label })
	  	  	      .y(function(d) { return d.value })
	  	  	      .showLabels(true)
	  	  	      .showLegend(false)
		  	  	  .valueFormat(d3.format('g'));
	  	  	
	  	  	
	  	  		if (options.title) {
	  	  			$('#' + elementID + ' svg').parent().prepend('<div class="chart-title">' + options.title + '</div>');
	  	  		}
	  	  	
	  	  	    d3.select("#" + elementID + " svg")
	  	  	        .datum(series)
	  	  	        .transition().duration(250)
	  	  	        .call(chart);
	  	  	
				$(window).bind('resize', function(){ d3.select('#' + elementID + ' svg')
					.transition().duration(50)
					.call(chart); });	
	  	  	  return chart;
	  	  	});
	  	}
		
		
		/** PROCESSING ANALYSED DATA */
		
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
    			toolTipHTML += '<p style="margin-bottom: 0px">' + result.pe + ': ' + y + '</p>';
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
	    	}
	    	
	    	for (var i = 0; i < datapoints.length; i++) {
	    		chartSerie.values.push({
	    			'x': datapoints[i].refValue,
	    			'y': datapoints[i].value
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
	    			'color': '#00F',
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
	    	          "bottom": 100,
	    	          "left": 50
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
	    	        	"axisLabel": result.pe,
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
	    }
		
		
		
		
		
		/** UTILITIES */
		
		
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