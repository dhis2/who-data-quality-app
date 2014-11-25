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
		  	
		  	
		  	var chartData = [], chartSeries, values;
		  	for (var i = 0; i < series.length; i++) {
			  	chartSeries = {};
		  		chartSeries.key = series[i].name;
		  		
		  		values = [];
		  		for (var j = 0; j < series[i].data.length; j++) {
		  			values.push({
		  				'x': periodService.epochFromPeriod(series[i].data[j].pe),
		  				'y': series[i].data[j].value		  			
		  			});
		  		}
		  		
		  		chartSeries.values = values;
		  		chartData.push(chartSeries);
		  	}
		  	
		  			  	
		  	  chart.xAxis     //Chart x-axis settings
		  	      .axisLabel('Period')
		  	      .tickFormat(function(d) {
		  	      	var label = periodService.periodFromEpoch(d, 'monthly');
		  	      	return label;
		  	      });
		  	
		  	
		  	 chart.yAxis.tickFormat(d3.format('.1f'));
		  	
		  	console.log(chartData);
		  	
		  	  /* Done setting the chart up? Time to render it!*/		  	
		  	  d3.select('#detailChart svg')    //Select the <svg> element you want to render the chart in.   
		  	      .datum(chartData)         //Populate the <svg> element with chart data...
		  	      .call(chart);          //Finally, render the chart!
		  	
		  	  //Update the chart when window resizes.
		  	  nv.utils.windowResize(function() { chart.update() });
		  	  return chart;
		  	});
		  	
		  	
		  	
		  
		  		  		
	  	};
	  	
	  	
	  
	  	return self;
	  
	  }]);
	  
	  
	
	
})();