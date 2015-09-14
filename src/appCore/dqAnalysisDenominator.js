(function(){
	'use strict';

	angular.module('dqAnalysis').factory('dqAnalysisDenominator',
		['d2Data', 'd2Utils', 'mathService', '$q',
			function (d2Data, d2Utils, mathService, $q) {

				var service = {
					reset: reset,
					setData: setData,
					setPeriod: setPeriod,
					setOrgunit: setOrgunit,
					setType: setType,
					validParameters: validParameters,
					analyse: analyse
				};

				var _dxA;
				var _dxB;
				var _pe;
				var _ouBoundary;
				var _ouLevel;
				var _ouGroup;
				var _analysisType;
				var _criteria;

				var deferred;


				/** === GETTERS AND SETTERS === */
				function reset() {
					_dxA = null;
					_dxB = null;
					_pe = null;
					_ouBoundary = null;
					_ouLevel = null;
					_ouGroup = null;
					_analysisType = null;
					deferred = null;
				};


				function setData(dxA, dxB) {
					_dxA = dxA;
					_dxB = dxB;
				};


				function setPeriod(pe) {
					_pe = pe;
				};


				function setOrgunit(ouBoundary, ouLevel, ouGroup) {
					_ouBoundary = ouBoundary;
					_ouLevel = ouLevel;
					_ouGroup = ouGroup;
				};


				function setType(analysisType, criteria) {
					_analysisType = analysisType;
					_criteria = criteria;
				};



				function validParameters() {
					if (_dxA && _dxB && _pe && _ouBoundary) return true;
					else return false;
				};


				function analyse() {
					deferred = $q.defer();

					requestData();

					return deferred.promise;
				};


				/** === ANALYSIS ===*/




				/**
				 * Check consistency of total population with UN population.
				 * Assumes both are stored as data elements or indicators in DHIS.
				 */
				function requestData() {

					d2Data.addRequest([_dxA, _dxB], _pe, _ouBoundary, _ouLevel, _ouGroup);
					d2Data.fetch().then(function(data) {
						produceResult();

						//Call differen factories here depending on type of analysis,
						// e.g. re-use all the above for all analysis types?
					});
				}

				function produceResult() {

					//Do the calculations for boundary orgunit
					var valueA = d2Data.value(_dxA, _pe, _ouBoundary, null);
					var valueB = d2Data.value(_dxB, _pe, _ouBoundary, null);
					var ratio = mathService.round(valueA/valueB, 2);
					var percentage = mathService.round(100 * ratio, 1);

					var result = {
						boundaryValue: valueA,
						boundaryRefValue: valueB,
						boundaryRatio: ratio,
						boundaryPercentage: percentage,
						boundaryID: _ouBoundary,
						boundaryName: d2Data.name(_ouBoundary),
						pe: _pe,
						dxIDa: _dxA,
						dxIDb: _dxB,
						dxNameA: d2Data.name(_dxA),
						dxNameB: d2Data.name(_dxB),
						type: _analysisType,
						threshold: _criteria
					};

					//If not UN, get subnational data as well
					if (_analysisType != 'un') {

						var subnationalOrgunits = d2Data.orgunits(_ouBoundary);
						for (var i = 0; i < orgunits.length; i++) {

						}
					}


					deferred.resolve(result);
				}

				return service;

			}]);

})();