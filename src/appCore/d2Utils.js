(function(){

	angular.module('d2').factory('d2Utils',
		['$q',
			function ($q) {

				var utils = {
					isNumber: isNumber,
					isArray: isArray,
					toArray: toArray,
					arrayRemoveDuplicates: arrayRemoveDuplicates,
					arrayMerge: arrayMerge
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


				function arrayRemoveDuplicates(array) {
					var seen = {};
					return array.filter(function(item) {
						return seen.hasOwnProperty(item) ? false : (seen[item] = true);
					});
				}

				function arrayMerge(a, b) {
					for (var i = 0; i < b.length; i++) {
						a.push(b[i]);
					}
					return a;
				}


				return utils;

			}]);

})();
