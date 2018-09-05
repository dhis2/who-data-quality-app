/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */

import "angular";

import dqAnalysisCompleteness from "./dqAnalysisCompleteness.js";
import dqAnalysisConsistency from "./dqAnalysisConsistency.js";
import dqAnalysisExternal from "./dqAnalysisExternal.js";

angular.module("dqAnalysis", ["d2", "appService"])
	.factory("dqAnalysisCompleteness", ["d2Data", "d2Meta", "d2Utils", "mathService", "requestService", "$q", dqAnalysisCompleteness])
	.factory("dqAnalysisConsistency", ["d2Data", "d2Meta", "d2Utils", "mathService", "$q", dqAnalysisConsistency])
	.factory("dqAnalysisExternal", ["d2Data", "d2Meta", "d2Utils", "mathService", "$i18next", "$q", dqAnalysisExternal]);