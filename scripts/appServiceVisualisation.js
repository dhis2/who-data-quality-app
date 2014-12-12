(function(){  
	/**Service: Completeness*/
	angular.module('dataQualityApp').service('visualisationService', ['periodService', 'requestService', function (periodService, requestService) {
	
	  	
	  	var self = this;
		
		
		/**
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
	  	
	  	
	  	function makeOUBarChart(elementID, period, dataID, ouIDs, options, data) {
	  	
	  		nv.addGraph(function() {
				var chart = nv.models.discreteBarChart()
				  .margin({bottom: 75})
				  .x(function(d) { return d.label })    //Specify the data accessors.
				  .y(function(d) { return d.value })
				  .staggerLabels(false)    //Too many bars and not enough room? Try staggering labels.
				  .tooltips(false)        //Don't show tooltips
				  .showValues(false)       //...instead, show the bar value right on top of each bar.
				  .transitionDuration(350)
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
				
				var row, value, values = [];
				for (var i = 0; i < data.rows.length; i++) {
				 	row = data.rows[i];	
					value = parseInt(row[val]);
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
				
				chart.xAxis.rotateLabels(-45);
				
				chart.yAxis.tickFormat(d3.format('g'));
				chart.forceY([minRange, maxRange]);
				
				
				d3.select('#' + elementID + ' svg')
				  .datum(chartData)
				  .call(chart);
				
				nv.utils.windowResize(chart.update);
				
				return chart;
	  		});
	  	}
	  	
	  	
	  	
	  	function makeLineChart(elementID, periods, dataIDs, ouID, options, data) {
	  		/*These lines are all chart setup.  Pick and choose which chart features you want to utilize. */
  			nv.addGraph(function() {
	  			var chart = nv.models.lineChart();
	  			  
	  			chart.margin({left: 50})  //Adjust chart margins to give the x-axis some breathing room.
	  			       .useInteractiveGuideline(false)  //We want nice looking tooltips and a guideline!
	  			       .transitionDuration(1000)  //how fast do you want the lines to transition?
	  			       .showLegend(false)       //Show the legend, allowing users to turn on/off line series.
	  			       .tooltips(false)
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
	  				 	row = data.rows[i];
	  				 	
	  				 	if (row[dataIDColumn] === dataID) {
	  				 		count = 0;
	  				 		for (var k = 0; k < row.length; k++) {
			  					
			  					if (!data.headers[k].meta) {
			  						value = parseFloat(row[k]);
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
	  			var periodNames = [];
	  			for (var i = 0; i < periods.length; i++) {
	  				periodNames.push(periodService.shortPeriodName(periods[i]));
	  			}
	  			
		  			
	  			//Leave some room above/below the max
				minRange = parseInt(minRange - minRange*0.3);
				maxRange = parseInt(maxRange + maxRange*0.3);
	  			if (options && options.range) {
	  				if (options.range.min) minRange = options.range.min;
	  				if (options.range.max) maxRange = options.range.max;
	  			}
	  					  	
	  			chart.xAxis     //Chart x-axis settings
	  			      .rotateLabels(-45)
	  			      .tickFormat(function(d) {
	  			             return periodNames[d];
	  			           });
	  			
	  			if (options && options.yLabel) chart.yAxis.axisLabel = options.yLabel;
	  				  			
	  			chart.yAxis
	  			 	.tickFormat(d3.format('g'));
	  			chart.forceY([minRange, maxRange]);
	  					  	
	  					  	
	  			/* Done setting the chart up? Time to render it!*/		  	
	  			d3.select('#' + elementID + ' svg')    //Select the <svg> element you want to render the chart in.   
	  			      .datum(chartData)         //Populate the <svg> element with chart data...
	  			      .call(chart);          //Finally, render the chart!
	  			
	  			//Update the chart when window resizes.
	  			nv.utils.windowResize(function() { chart.update() });
	  			return chart;
	  		});
	  	}
	  		
	  	
	  	
	  	
	  	return self;
	  
	  }]);
	
	
})();