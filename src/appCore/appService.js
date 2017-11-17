/**
 © Copyright 2017 the World Health Organization (WHO).

 This software is distributed under the terms of the GNU General Public License version 3 (GPL Version 3),
 copied verbatim in the file “COPYING”.  In applying this license, WHO does not waive any of the privileges and
 immunities enjoyed by WHO under national or international law or submit to any national court jurisdiction.
 */
import "angular";

import dataAnalysis from "./appServiceDataAnalysis.js";
import math from "./appServiceMath.js";
import notification from "./appServiceNotification.js";
import period from "./appServicePeriod.js";
import request from "./appServiceRequest.js";
import viz from "./appServiceVisualisation.js";

angular.module("appService", ["d2", "nvd3"])
	.service("dataAnalysisService", ["$q", "requestService", "mathService", "d2Meta", "d2Map", dataAnalysis])
	.service("mathService", [math])
	.service("notificationService", ["$uibModal", notification])
	.service("periodService", [period])
	.service("requestService", ["BASE_URL", "API_VERSION", "$http", "$q", "notificationService", request])
	.service("visualisationService", ["periodService", "requestService", "mathService", "$q", "d2Data", "d2Utils", "d2Meta", viz]);