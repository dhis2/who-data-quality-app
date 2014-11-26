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
			
			
			console.log(startDate, endDate, periodType);
			
			while (current <=  endYear && periodType != "yearly") {
							
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
		
		
		self.shortPeriodName = function(periodISO) {
			var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
			
			var periodType = self.periodTypeFromPeriod(periodISO);
						
			var year, part;
			if (periodType === 'Yearly') {
				return periodISO.substring(0, 4);
			}
			year = periodISO.substring(2, 4);
			
			switch (periodType) {
				case 'Quarterly':
					part = 'Q' + periodISO.substring(5);
					break;
				case 'Weekly':
					part = 'W' + periodISO.substring(5);
					break;
				case 'SixMonthly':
					part = periodISO.substring(5);
					if (part === '1') {
						part = 'Jan-Jun';
					}
					else {
						part = 'Jul-Dec';
					}
					break;
				case 'BiMonthly':
					var startMonth = parseInt((periodISO.substring(4,6)*2)-1);
					part = monthNames[startMonth] + '-' + monthNames[startMonth + 1];					
					break;
				case 'Monthly':
					part = monthNames[parseInt(periodISO.substring(4, 6))-1];
					break;
			}
			
					
			return part + " " + year;
		};
		
		
		self.getPeriodTypes = function() {
			//, {'name': 'Bimonthly', 'id':'BiMonthly'} <= Waiting for fix
			
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
		
		
		self.epochFromPeriod = function (period) {
		
			//TODO: Deal with half-years etc
			return moment(period, ["YYYYMM", "YYYYWww", "YYYYQQ", "YYYY"]).format('X');		
		
		};
		
		
		self.periodFromEpoch = function (epoch, periodType) {
			
			if (periodType === 'monthly') {
				return moment.unix(epoch).format('YYYYMM');
			}
			else if (periodType === 'yearly') {
				return moment.unix(epoch).format('YYYY');
			}
			
			//TODO
		}
		
		
		self.periodTypeFromPeriod = function(periodISO) {
			var periodType = ''
			if (periodISO.length === 4) {
				periodType = 'Yearly';
			}
			else if (periodISO.indexOf('Q') != -1) {
				periodType = 'Quarterly';
			}
			else if (periodISO.indexOf('W')!= -1) {
				periodType = 'Weekly';
			}
			else if (periodISO.indexOf('S') != -1) {
				periodType = 'SixMonthly';
			}
			else if (periodISO.indexOf('B') != -1) {
				periodType = 'BiMonthly';
			}
			else {
				periodType = 'Monthly';
			}
			
			return periodType;
		
		}
		
		  	
		
		function dateToISOdate(date) {
			return moment(new Date(date)).format('YYYY-MM-DD');
		}
		
		return self;
	
	}]);
	
	
	
	
})();