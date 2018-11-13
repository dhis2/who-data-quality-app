/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

import regression from "regression";

export default function () {

	var self = this;

	self.z = 0.6745;
	self.zM = 0.7978846482;


	self.getMean = function(valueSet) {
		var total = 0;

		for (let i = 0; i < valueSet.length; i++) {
			total += parseFloat(valueSet[i]);
		}

		return (total/valueSet.length);

	};



	self.getVariance = function(valueSet, mean) {


		if (!mean) mean = self.getMean(valueSet);

		var variance = 0;
		for (let i = 0; i < valueSet.length; i++) {
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
		for (let i = 0; i < valueSet.length; i++) {
			absoluteDeviations.push(Math.abs(valueSet[i]-median));
		}

		return self.median(absoluteDeviations);

	};


	self.MeanAD = function(valueSet, median) {

		if (!median) median = self.median(valueSet);

		var absoluteDeviations = [];
		for (let i = 0; i < valueSet.length; i++) {
			absoluteDeviations.push(Math.abs(valueSet[i]-median));
		}

		return self.getMean(absoluteDeviations);

	};




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

		//Mean Absolute Deviation
		var MeanAD = self.MAD(valueSet, median);

		return {
			"mean": mean,
			"variance": variance,
			"sd": sd,
			"median": median,
			"MAD": MAD,
			"MeanAD": MeanAD
		};


	};



	self.median = function (values) {

		values.sort( function(a,b) {return a - b;} );

		var half = Math.floor(values.length/2);

		if(values.length % 2) return values[half];
		else return (values[half-1] + values[half]) / 2.0;
	};



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
		var forecast = regression.linear(points);
		return forecast.equation[0]*i + forecast.equation[1];
	};


	//standard (z) score
	self.calculateStandardScore = function(value, stats) {

		return self.round((value-stats.mean)/stats.sd, 2);

	};

	//Modified Z score
	self.calculateZScore = function(value, stats) {

		if (stats.MAD === 0 && stats.MeanAD === 0) {
			return 0;
		}
		else if (stats.MAD === 0) {
			return self.round((self.zM*(value-stats.median))/stats.MeanAD, 2);
		}
		else {
			return self.round((self.z*(value-stats.median))/stats.MAD, 2);
		}
	};

	self.dropOutRate = function (valueA, valueB) {
		if (valueA === valueB) return 0; //Deals with cases where both are 0
		return (valueA - valueB) / valueA;
	};



	/*
		@param value			value to round
		@param decimals			number of decimals to include
		
		@returns				value rounded to given decimals
		*/
	self.round = function(value, decimals) {
		if (!value) return value;

		var factor = Math.pow(10,decimals);
		return Math.round(value*factor)/factor;

	};

	return self;

}