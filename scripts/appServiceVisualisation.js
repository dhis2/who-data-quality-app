(function(){  
	/**Service: Completeness*/
	angular.module('dataQualityApp').service('visualisationService', ['periodService', function (periodService) {
	
	  	
	  	var self = this;
		
	  	self.timeTrendChart = function (elementID, series, options) {
			
			console.log("Making chart for: " + elementID);
		  	
		  	/*These lines are all chart setup.  Pick and choose which chart features you want to utilize. */
		  	nv.addGraph(function() {
		  	  var chart = nv.models.lineChart();
		  	  
		  	  chart.margin({left: 50})  //Adjust chart margins to give the x-axis some breathing room.
		  	       .useInteractiveGuideline(true)  //We want nice looking tooltips and a guideline!
		  	       .transitionDuration(1000)  //how fast do you want the lines to transition?
		  	       .showLegend(true)       //Show the legend, allowing users to turn on/off line series.
		  	       .showYAxis(true)        //Show the y-axis
		  	       .showXAxis(true)        //Show the x-axis
		  	  ;
		  	
		  	
		  	var periodType = undefined;
		  	var minRange = 0, maxRange = 0;
		  	var chartData = [], chartSeries, values;
		  	for (var i = 0; i < series.length; i++) {
			  	chartSeries = {};
		  		chartSeries.key = series[i].name;
		  		
		  		values = [];
		  		var value, epoch;
		  		for (var j = 0; j < series[i].data.length; j++) {
		  			values.push({
		  				'x': j,
		  				'y': series[i].data[j].value
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
		  	}
		  	
		  	//Get XAxis labels = periods from series[0]
		  	var periods = [];
		  	for (var j = 0; j < series[0].data.length; j++) {
		  			periods.push(periodService.shortPeriodName(series[0].data[j].pe));
	  		}
		  	
		  	
		  	//Leave some room above/below the max
			minRange = parseInt(minRange - minRange*0.3);
			maxRange = parseInt(maxRange + maxRange*0.3);
		  	
		  			  	
		  	chart.xAxis     //Chart x-axis settings
		  	      .axisLabel('Period')
		  	      .tickFormat(function(d) {
		  	             return periods[d];
		  	           });
		  	
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
		  		  
		  		  		
		};
	  	
	  	
	  	self.barChart = function (elementID, series, options) {
	  		
	  		var chart = nv.models.multiBarChart()
	  		      .transitionDuration(350)
	  		      .reduceXTicks(true)   //If 'false', every single x-axis tick label will be rendered.
	  		      .rotateLabels(0)      //Angle to rotate x-axis labels.
	  		      .groupSpacing(0.1)    //Distance between each group of bars.
	  		    ;
	  		
	  		
	  		var series = [{
	  			'key': "Test",
	  			'values': [{
	  				'x': 0, 
	  				'y': 5,
	  				'label': "x0 y10"
	  			},{
	  				'x': 1, 
  					'y': 20,
  					'label': "x1 y20"
  				},{
  					'x': 2, 
  					'y': 5,
  					'label': "x2 y5"
  				}]
  			}]; 
	  		
  		    chart.xAxis
  		        .tickFormat(function(d) {
  		        	return series[0].values[d].label;
  		        });
  		
  		    chart.yAxis
  		        .tickFormat(d3.format('g'));
  		
		  	d3.select('#' + elementID + ' svg')
  		        .datum(series)
  		        .call(chart);
  		
  		    nv.utils.windowResize(chart.update);
  		
  		    return chart;
	  		    
	  	
	  	}
	  
	  	return self;
	  
	  }]);
	  
	  
	
	
})();