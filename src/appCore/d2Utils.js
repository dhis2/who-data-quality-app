(function(){

	angular.module('d2').factory('d2Utils',
		['$q',
			function ($q) {

				var utils = {
					isNumber: isNumber,
					isArray: isArray,
					toArray: toArray,
					arrayRemoveDuplicates: arrayRemoveDuplicates,
					arrayMerge: arrayMerge,
					arraySortByProperty: arraySortByProperty,
					idsFromIndicatorFormula: idsFromIndicatorFormula
				};


				/** === NUMBER === */
				function isNumber(number) {

					return !isNaN(parseFloat(number));

				}


				/** === ARRAY === */
				function isArray(array) {
					var isArray = Object.prototype.toString.call( array ) === '[object Array]';

					return isArray;
				}

				function toArray(array) {
					var isArray = Object.prototype.toString.call( array ) === '[object Array]';

					if (isArray) return array;
					else return [array];
				}


				function arrayRemoveDuplicates(array, property) {
					var seen = {};
					return array.filter(function(item) {
						if (property) {
							return seen.hasOwnProperty(item[property]) ? false : (seen[item[property]] = true);
						}
						else {
							return seen.hasOwnProperty(item) ? false : (seen[item] = true);
						}
					});
				}

				function arrayMerge(a, b) {
					if (a && !isArray(a)) a = [a];
					if (b && !isArray(b)) b = [b];

					if (!a && b) return b;
					if (!b && a) return a;

					for (var i = 0;a && b &&  i < b.length; i++) {
						a.push(b[i]);
					}
					return a;
				}

				function arraySortByProperty(array, property, numeric) {

					 return array.sort(function(a, b) {
						if (numeric) {
							return b[property] - a[property] ;
						}
						else {
							return a[property] < b[property] ? -1 : 1
						}
					});

				}


				/** === INDICATORS === */
				function idsFromIndicatorFormula(numeratorFormula, denominatorFormula, dataElementOnly) {

					var matches = arrayMerge(numeratorFormula.match(/#{(.*?)}/g), denominatorFormula.match(/#{(.*?)}/g));
					if (!matches) return [];

					for (var i = 0; i < matches.length; i++ ) {
						matches[i] = matches[i].slice(2, -1);
						if (dataElementOnly) matches[i] = matches[i].split('.')[0];
					}

					console.log(matches);

					return arrayRemoveDuplicates(matches);
				}

				return utils;

			}]);

})();
