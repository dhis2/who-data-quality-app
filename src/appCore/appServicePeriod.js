/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */


import PeriodType from "../libs/periodTypeNoDep.js";
const moment = require("moment");

/**Service: Completeness*/
export default function ($i18next) {
		
	var self = this;
	var periodTool = new PeriodType();

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

			var pTypeTool = periodTool.get(periodType);
			periodsInYear = pTypeTool.generatePeriods({"offset": current - thisYear, "filterFuturePeriods": true, "reversePeriods": false});

			for (let i = 0; i < periodsInYear.length; i++) {
				if (periodsInYear[i].endDate >= startDate && periodsInYear[i].endDate <= endDate) {
					periods.push(periodsInYear[i]);
				}
			}

			current++;
		}
		var isoPeriods = [];
		if (periodType === "Yearly") {
			for (let i = startYear; i <= endYear; i++) {
				isoPeriods.push(i.toString());
			}
		}
		for (let i = 0; i < periods.length; i++) {
			isoPeriods.push(periods[i].iso);
		}

		return isoPeriods;
	};


	self.shortPeriodName = function(periodISO) {
		var monthNames = [$i18next.t("Jan"), $i18next.t("Feb"), $i18next.t("Mar"), $i18next.t("Apr"), $i18next.t("May"), $i18next.t("Jun"), 
			$i18next.t("Jul"), $i18next.t("Aug"), $i18next.t("Sep"), $i18next.t("Oct"), $i18next.t("Nov"), $i18next.t("Dec")];
		periodISO = periodISO.toString();

		var periodType = self.periodTypeFromPeriod(periodISO);

		var year, part;
		if (periodType === "Yearly") {
			return periodISO.substring(0, 4);
		}
		year = periodISO.substring(2, 4);

		switch (periodType) {
		case "Quarterly":
			part = "Q" + periodISO.substring(5);
			break;
		case "Weekly":
			part = "W" + periodISO.substring(5);
			break;
		case "SixMonthly":
			part = periodISO.substring(5);
			if (part === "1") {
				part = $i18next.t("Jan-Jun");
			}
			else {
				part = $i18next.t("Jul-Dec");
			}
			break;
		case "BiMonthly":
			var startMonth = parseInt((periodISO.substring(4,6)*2)-1);
			part = monthNames[startMonth] + "-" + monthNames[startMonth + 1];
			break;
		case "Monthly":
			part = monthNames[parseInt(periodISO.substring(4, 6))-1];
			break;
		}


		return part + " " + year;
	};


	//Should be sorted from shortest to longest
	self.getPeriodTypes = function() {
		//, {'name': 'Bimonthly', 'id':'BiMonthly'} <= Waiting for fix

		var periodTypes = [
			{"name": $i18next.t("Weeks"), "id":"Weekly"},
			{"name": $i18next.t("Months"), "id":"Monthly"},
			{"name": $i18next.t("Quarters"), "id":"Quarterly"},
			{"name": $i18next.t("Six-months"), "id":"SixMonthly"},
			{"name": $i18next.t("Years"), "id":"Yearly"}
		];

		return periodTypes;
	};


	self.getPeriodCount = function() {
		var objects = [];
		for (let i = 1; i <= 12; i++) {
			objects.push({"name": i.toString(), "value": i});
		}

		return objects;
	};


	self.getYears = function () {

		var objects = [];
		for (let i = parseInt(moment().format("YYYY")); i >= 1990; i--) {
			objects.push({"name": i, "id": i});
		}

		return objects;

	};


	self.epochFromPeriod = function (period) {

		//TODO: Deal with half-years etc
		return moment(period, ["YYYYMM", "YYYYWww", "YYYYQQ", "YYYY"]).format("X");

	};


	self.periodFromEpoch = function (epoch, periodType) {

		if (periodType === "Monthly") {
			return moment.unix(epoch).format("YYYYMM");
		}
		else if (periodType === "Yearly") {
			return moment.unix(epoch).format("YYYY");
		}

		//TODO
	};


	self.periodTypeFromPeriod = function(periodISO) {
		periodISO = periodISO.toString();
		var periodType = "";
		if (periodISO.length === 4) {
			periodType = "Yearly";
		}
		else if (periodISO.indexOf("Q") != -1) {
			periodType = "Quarterly";
		}
		else if (periodISO.indexOf("W")!= -1) {
			periodType = "Weekly";
		}
		else if (periodISO.indexOf("S") != -1) {
			periodType = "SixMonthly";
		}
		else if (periodISO.indexOf("B") != -1) {
			periodType = "BiMonthly";
		}
		else {
			periodType = "Monthly";
		}

		return periodType;

	};


	self.shortestPeriod = function (periodTypes) {
		var w = false, m = false, q = false, s = false, y = false, pt;
		for (let i = 0; i < periodTypes.length; i++) {
			pt = periodTypes[i];
			switch (pt) {
			case "Quarterly":
				q = true;
				break;
			case "Weekly":
				w = true;
				break;
			case "SixMonthly":
				s = true;
				break;
			case "Yearly":
				y = true;
				break;
			case "Monthly":
				m = true;
				break;
			}
		}

		if (w) return "Weekly";
		if (m) return "Monthly";
		if (q) return "Quarterly";
		if (s) return "SixMonthly";
		if (y) return "Yearly";

	};


	self.longestPeriod = function (periodTypes) {
		var w = false, m = false, q = false, s = false, y = false, pt;
		for (let i = 0; i < periodTypes.length; i++) {
			pt = periodTypes[i];
			switch (pt) {
			case "Quarterly":
				q = true;
				break;
			case "Weekly":
				w = true;
				break;
			case "SixMonthly":
				s = true;
				break;
			case "Yearly":
				y = true;
				break;
			case "Monthly":
				m = true;
				break;
			}
		}
		if (y) return "Yearly";
		if (s) return "SixMonthly";
		if (q) return "Quarterly";
		if (m) return "Monthly";
		if (w) return "Weekly";
	};


	self.getSubPeriods = function(period, periodType) {

		var pt = self.periodTypeFromPeriod(period);
		if (pt === periodType) return [period];


		//Need start and end date of the given period
		var year = yearFromISOPeriod(period);
		var thisYear = parseInt(moment().format("YYYY"));
		var sourcePeriods = periodTool.get(pt).generatePeriods({"offset": year-thisYear, "filterFuturePeriods": true, "reversePeriods": false});

		var startDate, endDate;
		for (let i = 0; i < sourcePeriods.length; i++) {
			if (sourcePeriods[i].iso === period) {
				startDate = sourcePeriods[i].startDate;
				endDate = sourcePeriods[i].endDate;
				break;
			}
		}

		return self.getISOPeriods(startDate, endDate, periodType);
	};


	self.precedingPeriods = function(periodISO, number) {
		if (typeof(periodISO) != "string") periodISO = periodISO.toString();

		var period = periodObjectFromISOPeriod(periodISO);
		var pType = self.periodTypeFromPeriod(periodISO);


		var startDate = reverseDateByPeriod(period.startDate, number, pType);
		var endDate = moment(period.startDate).subtract(1, "d");

		return self.getISOPeriods(dateToISOdate(startDate), dateToISOdate(endDate), pType);

	};


	function reverseDateByPeriod(ISOdate, noPeriods, periodType) {

		var code;
		switch (periodType) {
		case "Quarterly":
			code = "Q";
			break;
		case "Weekly":
			code = "w";
			break;
		case "SixMonthly":
			code = "Q";
			noPeriods = noPeriods * 2; //Need to cheat
			break;
		case "Yearly":
			code = "y";
			break;
		case "Monthly":
			code = "M";
			break;
		}

		return moment(ISOdate).subtract(noPeriods, code);



	}


	function periodObjectFromISOPeriod(period) {
		var pType = self.periodTypeFromPeriod(period);
		var year = yearFromISOPeriod(period);
		var thisYear = parseInt(moment().format("YYYY"));

		var periodsInYear = periodTool.get(pType).generatePeriods({"offset": year-thisYear, "filterFuturePeriods": true, "reversePeriods": false});
		for (let i = 0; i < periodsInYear.length; i++) {
			if (periodsInYear[i].iso === period) {
				return periodsInYear[i];
			}
		}
	}


	function yearFromISOPeriod(period) {

		if (typeof(period) != "string") period = period.toString();
		return parseInt(period.substring(0, 4));

	}


	function dateToISOdate(date) {
		return moment(new Date(date)).format("YYYY-MM-DD");
	}


	return self;

	
}

