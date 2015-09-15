(function(){

	angular.module('d2').factory('d2Meta',
		['requestService', 'd2Utils', '$q',
			function (requestService, d2Utils, $q) {

				//Define factory API
				var service = {
					orgunitIDs: orgunitIDs
				};


				/** ===== ORGUNITS ===== */

				/**
				 * Returns and array of orgunit IDs based on orgunit boundary and level and/or group. If bouth level
				 * and group is sepcified, level will be used.
				 *
				 * @param ouBoundary
				 * @param ouLevel
				 * @param ouGroup
				 */
				function orgunitIDs(ouBoundary, ouLevel, ouGroup) {
					var deferred = $q.defer();

					//Find orgunit disaggregation
					var ouDisaggregation = '';
					if (ouLevel) ouDisaggregation += ';LEVEL-' + ouLevel;
					else if (ouGroup) ouDisaggregation += ';OU_GROUP-' + ouGroup;

					var requestURL = '/api/analytics.json?dimension=pe:2000W01'; //Period is not important
					requestURL += '&filter=ou:' + d2Utils.toArray(ouBoundary).join(';');
					requestURL += ouDisaggregation;
					requestURL += '&displayProperty=NAME&skipData=true';

					requestService.getSingleData(requestURL).then(function(data) {

						var orgunits = data.metaData.ou;
						var boundary = [];
						var subunits = [];

						var ou, boundary;
						for (var i = 0; i < orgunits.length; i++) {
							ou = orgunits[i];
							boundary = false;
							for (var j = 0; !boundary && j < ouBoundary.length; j++) {

								if (ou == ouBoundary[j]) boundary = true;

							}

							boundary ? boundary.push(ou) : subunits.push(ou);
						}

						deferred.resolve({
							'orgunits': orgunits,
							'boundary': boundary,
							'subunits': subunits
						});
					});

					return deferred.promise;
				}



				return service;

			}]);

})();
