

/**
Calculates the mean of a set of values
*/
function getMean(valueSet) {
	
	
	var total = 0;
	
	for (var i = 0; i < valueSet.length; i++) {
		total += valueSet[i];
	}
	
	return (total/valueSet.length);
	
}



/**
Calculates the variance of set of values
*/
function getVariance(valueSet) {
	
	var variance = 0;
	var mean = getMean(valueSet);
	
	for (var i = 0; i < valueSet.length; i++) {
		variance += Math.pow((valueSet[i] - mean), 2);
	}

	return (variance/(valueSet.length-1));
	
}



/**
Calculates the standard deviation of set of values
*/
function getStandardDeviation(valueSet) {

	return Math.sqrt(getVariance(valueSet));

}
