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
		
		
		self.getVariance = function(valueSet) {
			
			var variance = 0;
			var mean = self.getMean(valueSet);
			
			for (var i = 0; i < valueSet.length; i++) {
				variance += Math.pow((valueSet[i] - mean), 2);
			}
		
			return (variance/(valueSet.length-1));
			
		};
		
	
		self.getStandardDeviation = function(valueSet) {
		
			return Math.sqrt(self.getVariance(valueSet));
		
		};
		
		
		self.getStats = function (valueSet) {
		
			//Mean
			var total = 0;
			for (var i = 0; i < valueSet.length; i++) {
				total += valueSet[i];
			}
			var mean = (total/valueSet.length);
			
			//Variance
			var variance = 0;			
			for (var i = 0; i < valueSet.length; i++) {
				variance += Math.pow((valueSet[i] - mean), 2);
			}
			variance = variance/(valueSet.length-1);
			
			//zScore
			var sd = Math.sqrt(variance);
		
			return {"mean": mean, "variance": variance, "sd": sd};
		
		
		}
		
		return self;
	
	}]);
	
})();