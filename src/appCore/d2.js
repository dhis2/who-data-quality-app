/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */


import "angular";

import d2Utils from "./d2Utils.js";
import d2Data from "./d2Data.js";
import d2Map from "./d2Map.js";
import d2Meta from "./d2Meta.js";

angular.module("d2", [])
	.factory("d2Utils", ["$q", d2Utils])
	.factory("d2Data", ["requestService", "d2Utils", "$q", d2Data])
	.factory("d2Map", ["requestService", "d2Meta", "d2Utils", "$q", d2Map])
	.factory("d2Meta", ["requestService", "periodService", "d2Utils", "$q", d2Meta]);

		