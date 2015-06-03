(function(){  
	/**Service: Completeness*/
	angular.module('dataQualityApp').service('mathService', [function () {
	  	
		var self = this;
		
		self.getMean = function(valueSet) {
			var total = 0;
			
			for (var i = 0; i < valueSet.length; i++) {
				total += parseFloat(valueSet[i]);
			}
			
			return (total/valueSet.length);
			
		};
		
		
		
		self.getVariance = function(valueSet, mean) {
			

			if (!mean) mean = self.getMean(valueSet);

			var variance = 0;			
			for (var i = 0; i < valueSet.length; i++) {
				variance += Math.pow((valueSet[i] - mean), 2);
			}
		
			return (variance/(valueSet.length-1));
			
		};
		
	
	
		self.getStandardDeviation = function(valueSet) {
		
			return Math.sqrt(self.getVariance(valueSet));
		
		};
		
		
		
		self.MAD = function(valueSet, median) {
		
			if (!median) median = self.median(valueSet);
			
			var absoluteDeviations = [];
			for (var i = 0; i < valueSet.length; i++) {
				absoluteDeviations.push(Math.abs(valueSet[i]-median));	
			}
			
			return self.median(absoluteDeviations);
		
		}
		
		
		
		
		self.getStats = function (valueSet) {
		
			//Mean
			var mean = self.getMean(valueSet);
			
			//Variance
			var variance = self.getVariance(valueSet, mean);
			
			//SD of population
			var sd = Math.sqrt(variance);
		
			//Median
			var median = self.median(valueSet);
			
			//Median Absolute Derivative
			var MAD = self.MAD(valueSet, median);
		
			return {
				"mean": mean, 
				"variance": variance, 
				"sd": sd, 
				"median": median,
				"MAD": MAD
			};
		
		
		}
		
		
		
		self.median = function (values) {
			
			values.sort( function(a,b) {return a - b;} );
			
		    var half = Math.floor(values.length/2);
		
		    if(values.length % 2) return values[half];
		    else return (values[half-1] + values[half]) / 2.0;
		}
		
		
		
		/*
		@param values			array of preceding values (time trend)
		
		@returns				forecasted value based on change across years. Linear regression
		*/		
		self.forecast = function(values) {
		
			var i, points = [];
			for (i = 0; i < values.length; i++) {
				if (values[i]) points.push([i, parseFloat(values[i])]);
				else points.push([i, null]);
			}
			var forecast = regression('linear', points);
			return forecast.equation[0]*i + forecast.equation[1];
		}
		
		
				
		/*
		@param value			value to round
		@param decimals			number of decimals to include
		
		@returns				value rounded to given decimals
		*/
		self.round = function(value, decimals) {
			var factor = Math.pow(10,decimals);
			return Math.round(value*factor)/factor;
			
		}
		
		return self;
	
	}]);
	
})();