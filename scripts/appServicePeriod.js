(function(){  
	/**Service: Completeness*/
	angular.module('dataQualityApp').service('periodService', [function () {
		
		var self = this;
		self.periodTool = new PeriodType();
		
		self.getISOPeriods = function(startDate, endDate, periodType) {
				
			startDate = dateToISOdate(startDate);
			endDate = dateToISOdate(endDate);
			
			var startYear = parseInt(moment(startDate).format("YYYY"));
			var endYear = parseInt(moment(endDate).format("YYYY"));
			var thisYear = parseInt(moment().format("YYYY"));
			  		
			var current = startYear;
			var periods = [];
			var periodsInYear;
			
			
			while (current <=  endYear && periodType != "Yearly") {
							
				periodsInYear = self.periodTool.get(periodType).generatePeriods({'offset': current - thisYear, 'filterFuturePeriods': true, 'reversePeriods': false});
				  			
				for (var i = 0; i < periodsInYear.length; i++) {
					if (periodsInYear[i].endDate >= startDate && periodsInYear[i].endDate <= endDate) {
						periods.push(periodsInYear[i]);
					}
				}
				
				current++;
			}
			var isoPeriods = [];
			if (periodType === "Yearly") {
				for (var i = startYear; i <= endYear; i++) {
					isoPeriods.push(i.toString());
				}
			}
			for (var i = 0; i < periods.length; i++) {
				isoPeriods.push(periods[i].iso);
			}
			
			return isoPeriods;
		};
		
		
		self.shortMonthName = function(periodISO) {
			var year = periodISO.substring(2, 4);
			var monthNumber = periodISO.substring(4, 6);
			
			var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
			
			return monthNames[parseInt(monthNumber)-1] + " '" + year;
		};
		
		
		self.getPeriodTypes = function() {
			var periodTypes = [{'name': 'Weeks', 'id':'Weekly'}, {'name': 'Months', 'id':'Monthly'}, {'name': 'Quarters', 'id':'Quarterly'}, {'name': 'Six-months', 'id':'SixMonthly'}, {'name': 'Years', 'id':'Yearly'}];
			
			return periodTypes;
		};
		
		
		self.getPeriodCount = function() {
				var objects = [];
				for (var i = 1; i <= 12; i++) {
					objects.push({'name': i.toString(), 'value': i});
				}
				
				return objects;
		};
		
		
		self.getYears = function () {
		
			var objects = [];
			for (var i = parseInt(moment().format('YYYY')); i >= 1990; i--) {
				objects.push({'name': i, 'id': i});
			}
			
			return objects;
		
		};
		
		  	
		
		function dateToISOdate(date) {
			return moment(new Date(date)).format('YYYY-MM-DD');
		}
		
		return self;
	
	}]);
	
	
	
	
})();