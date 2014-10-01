/** Variables */
var periodTool;

/**
Start the app
*/
$(document).ready(function() {

	initSelectionUI();
	
});


/**
Initialise the selection UI
*/
function initSelectionUI() {

	periodTool = new PeriodType();

	//Fetch DE groups (default)
	typeDataElementSelected()
	
	//Make accordion
	$("#parameterSelection").accordion({heightStyle: "content"});
	
	//Set up date pickers
	$( "#startDatePicker" ).datepicker({
				dateFormat: 'yy-mm-dd',
	      defaultDate: "-12M",
	      numberOfMonths: 3,
	      onClose: function( selectedDate ) {
	        $( "#endDatePicker" ).datepicker( "option", "minDate", selectedDate );
	      }
	    }
	);
	$( "#endDatePicker" ).datepicker({
				dateFormat: 'yy-mm-dd',
	      defaultDate: "-1D",
	      numberOfMonths: 3,
	      onClose: function( selectedDate ) {
	        $( "#from" ).datepicker( "option", "maxDate", selectedDate );
	      }
	    }
	);
	
	
	$('#orgunitTree').jstree({
							"plugins" : [ "wholerow", "ui"],
	            'core': {
	                'data': function (node, callback) {
	                	
	                	//Tree is empty - get first two levels right away
	                	if (node.parent === null) {
	                		var requestURL = baseURL + "/api/organisationUnits.json?userDataViewFallback=true&paging=false&fields=id,name,children[id,name]";
	                		
	                		$.ajax({
	                			type: "GET",
	                			url: requestURL,
	                			cache: false,
	                			success: function(data){
													
													
													var orgunits = data.organisationUnits;
													var orgunitNodes = [];
													
													//Iterate over all the orgunit the user is assigned to (root(s))
													for (var i = 0; i < orgunits.length; i++) {
															orgunitNodes[i] = {
																'id': orgunits[i].id, 
																'text': orgunits[i].name,
																'children': [], 
																'state': {
																	'opened': true
																}
															};
															
															//Add the children of the root(s) as well
															for (var j = 0; j < orgunits[i].children.length; j++) {
																orgunitNodes[i].children.push({
																	'id': orgunits[i].children[j].id,
																	'text': orgunits[i].children[j].name,
																	'children': true
																});
																
																orgunitNodes[i].children.sort(sortNodeByName);
															}
															
															
															
													}
													
													orgunitNodes.sort(sortNodeByName);
													
													callback(orgunitNodes);
	                				
	                			},
	                			error: function (xhr, ajaxOptions, thrownError) {
	                				console.log("Error fetching root orgunit");	
	                			}
	                		});
	                	}
	                	
	                	//A leaf was clicked, need to get the next level
	                	else {
	                		var requestURL = baseURL + "/api/organisationUnits/" + node.id + ".json?fields=children[id,name]";
	                		
	                		$.ajax({
	                			type: "GET",
	                			url: requestURL,
	                			cache: false,
	                			success: function(data){
	                			  
	                			  var children = [];
	                			  for (var i = 0; i < data.children.length; i++) {
	                			  	children.push({
	                			  		'id': data.children[i].id,
	                			  		'text': data.children[i].name,
	                			  		'children': true //should probably add a check for number of levels, and avoid this for facilities
	                			  	});
	                			  }
	                			 	
	                			 	children.sort(sortNodeByName);
	                			 	
	                				callback(children);
	                				
	                			},
	                			error: function (xhr, ajaxOptions, thrownError) {
	                				console.log("Error fetching root orgunit");	
	                			}
	                		});
	                		
	                	}
	                		                	
	                	
	                }
	            }
	        });	
	selectLevel();
}



function sortNodeByName(a, b) {
	var aName = a.text.toLowerCase();
	var bName = b.text.toLowerCase(); 
	return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));

}



function typeDataElementSelected() {
	var requestURL = baseURL + '/api/dataElementGroups.json?fields=id,name&paging=false';
		
	$.ajax({
		type: "GET",
		url: requestURL,
		cache: false,
		success: function(data){
		   		     
			//Read access rights
			populateSelector("groupSelect", data.dataElementGroups)
			
		},
		error: function (xhr, ajaxOptions, thrownError) {
			console.log("Error fetching data element groups");	
		}
	});
}



function typeIndicatorSelected() {
	var requestURL = baseURL + '/api/indicatorGroups.json?fields=id,name&paging=false';
		
	$.ajax({
		type: "GET",
		url: requestURL,
		cache: false,
		success: function(data){
		   		     
			//Read access rights
			populateSelector("groupSelect", data.indicatorGroups)
			
		},
		error: function (xhr, ajaxOptions, thrownError) {
			console.log("Error fetching indicator groups");	
		}
	});
}



function groupSelected() {

	var groupID = $('#groupSelect').val()

	//Check if we are dealing with indicators or data elements
	if ($('#indicatorButton').is(':checked')) {
	
		var requestURL = baseURL + '/api/indicators.json?fields=id,name&paging=false&filter=indicatorGroups.id:eq:' + groupID;
			
		$.ajax({
			type: "GET",
			url: requestURL,
			cache: false,
			success: function(data){
			   		     
				populateSelector("dataSelect", data.indicators)
				
			},
			error: function (xhr, ajaxOptions, thrownError) {
				console.log("Error fetching indicator groups");	
			}
		});
	}
	
	else {
	
		var requestURL = baseURL + '/api/dataElements.json?fields=id,name&paging=false&filter=dataElementGroups.id:eq:' + groupID;
			
		$.ajax({
			type: "GET",
			url: requestURL,
			cache: false,
			success: function(data){
			   		     
				populateSelector("dataSelect", data.dataElements)
				
			},
			error: function (xhr, ajaxOptions, thrownError) {
				console.log("Error fetching data element groups");	
			}
		});
	}
	
}



function populateSelector(selectorID, optionSet) {
	
	console.log("Populating " + selectorID);
	
	var options = $("#" + selectorID);
	
	//Reset
	options
		.find('option')
    .remove()
    .end()
		.append($("<option />").val("").text("Please select"));
	
	//Add options
	$.each(optionSet, function() {
	    options.append($("<option />").val(this.id).text(this.name));
	});
	
	options.prop("disabled", false);
}



function getAnalysisPeriods() {

	var periodType = $('#periodType').val();
	var startDate = $('#startDatePicker').val();
	var endDate = $('#endDatePicker').val();

	var startDateParts = startDate.split('-');
	var endDateParts = endDate.split('-');
	var currentYear = new Date().getFullYear();
	
	var periods = [];
	var periodsInYear;
	for (var startYear = startDateParts[0]; startYear <= endDateParts[0] && currentYear; startYear++) {
		
		periodsInYear = periodTool.get($('#periodType').val()).generatePeriods({'offset': startYear - currentYear, 'filterFuturePeriods': true, 'reversePeriods': false});
		
		for (var i = 0; i < periodsInYear.length; i++) {
			if (periodsInYear[i].endDate >= startDate && periodsInYear[i].endDate <= endDate) {
				periods.push(periodsInYear[i]);
			}
		}
	}
	
	return periods;
}



function readParameters() {

	$("#result").html("");

	var variable = $('#dataSelect').val();
	var periods = getAnalysisPeriods();
	var orgunits;
	if ($('#specificButton').is(':checked')) {
		orgunits = $('#orgunitTree').jstree('get_selected');
		fetchData(variable, orgunits, periods);
	}
	else {
	
		var requestURL = baseURL + '/api/organisationUnits.json?fields=id&filter=level:eq:' + $('#ouLevelSelect').val() + '&paging=false';
		$.ajax({
			type: "GET",
			url: requestURL,
			cache: false,
			success: function(data){
			  
			  orgunits = [];
			  for (var i = 0; i < data.organisationUnits.length; i++) {
			  	orgunits.push(data.organisationUnits[i].id);
			  }
			  
			  fetchData(variable, orgunits, periods);
			  
			},
			error: function (xhr, ajaxOptions, thrownError) {
				console.log("Error fetching data for analysis");	
			}
		});
	}
}



function fetchData(variable, orgunits, periods) {

	var isoPeriods = [];
	for (var i = 0; i < periods.length; i++) {
		isoPeriods.push(periods[i].iso);
	}

	var ou;
	for (var i = 0; i < orgunits.length; i++) {
		
		ou = orgunits[i];		
		(function (variable, ou, periods) {
			
			var requestURL = baseURL + "/api/analytics.json?dimension=dx:" + variable;
			requestURL += "&dimension=ou:" + ou;
			requestURL += "&dimension=pe:" + isoPeriods.join(";");
			
			$.ajax({
				type: "GET",
				url: requestURL,
				cache: false,
				success: function(data){
				  console.log(ou);
					analyseData(data, variable, ou, periods)
					
				},
				error: function (xhr, ajaxOptions, thrownError) {
					console.log("Error fetching data for analysis");	
				}
			});
		})(variable, ou, periods);
		
	}
}



/**
Always call with only one variable and one period
*/
function analyseData(data, variableID, orgunitID, periods) {
	
	//Identify value column
	var valueIndex, dxIndex, ouIndex, peIndex;
	for (var i = 0; i < data.headers.length; i++) {
		if (data.headers[i].name === "value") valueIndex = i;
		if (data.headers[i].name === "ou") ouIndex = i;
		if (data.headers[i].name === "pe") peIndex = i;
		if (data.headers[i].name === "dx") dxIndex = i;
	}
	
	//First get the raw data, in order to calculate variance etc
	var dataValueSet = [];
	for (var i = 0; i < data.rows.length; i++) {
		dataValueSet.push(parseFloat(data.rows[i][valueIndex]));
	}
	
	var mean = getMean(dataValueSet); 
	var variance = getVariance(dataValueSet);
	var standardDeviation = getStandardDeviation(dataValueSet);
	var noDevs = $('#numberOfDevs').val();
	
	console.log("Mean: " + mean + ", var " + variance + " stdDev " + standardDeviation);

	
	//Loop over datavalues, marking them as low/high outliers etc
	var datavalue, dataValues = [];
	var highLimit = (mean + noDevs*standardDeviation);
	var lowLimit = (mean - noDevs*standardDeviation);
	if (lowLimit < 0) lowLimit = 0;
	
	var hasOutlier = false;
	for (var i = 0; i < data.rows.length; i++) {
		dataValue = {
			'pe': data.rows[i][peIndex],
			'ou': data.rows[i][ouIndex],
			'dx': data.rows[i][dxIndex],
			'value': parseFloat(data.rows[i][valueIndex]), //To-Do: check value type from analytics response
			'lowOutlier': false,
			'highOutlier': false
		};
		
		if (dataValue.value > highLimit) {
			hasOutlier = true;
			dataValue.highOutlier = true;
		}
		else if (dataValue.value < lowLimit) {
			hasOutlier = true;
			dataValue.lowOutlier = true;
		}
		
		dataValues.push(dataValue);
	}
	
	
	var analysisResult = {
		'orgunitName': data.metaData.names[orgunitID],
		'orgunitID': orgunitID,
		'variableName': data.metaData.names[variableID], 
		'variableID': variableID,
		'periods': periods,
		'mean': mean,
		'variance': variance,
		'standardDeviation': standardDeviation,
		'numberOfDeviations': noDevs,
		'lowLimit': lowLimit, 
		'highLimit': highLimit,
		'hasOutlier': hasOutlier,
		'dataValues': dataValues
	}
	
	if ($('#displayAll').is(':checked')){
		presentData(analysisResult);
	}
	else if (analysisResult.hasOutlier) {
		presentData(analysisResult);
	}
}



function presentData(result) {
	
	
	//Make a div, which will contain one row/table, and a chart
	var html	= "<div>";
	html += "<h3>" + result.variableName + " for " + result.orgunitName + "</h3>";
	html += '<table class="resultTable"><tr>';
	
	
	var colWidth = Math.floor(90/result.periods.length);
	
	for (var i = 0; i < result.periods.length; i++) {
		html += '<th style="width: ' + colWidth + '%;">' + result.periods[i].name + '</th>';
	}
	html += "</tr><tr>";

	//Might be more periods than data (?), so need to actually check	
	for (var i = 0; i < result.periods.length; i++) {
		var noValue = true;
		for (var j = 0; j < result.dataValues.length; j++) {
			if (result.periods[i].iso === result.dataValues[j].pe) {
				
				if (result.dataValues[j].lowOutlier) {
					html += '<td class="lowOutlier">' + result.dataValues[j].value + "</td>";
					noValue = false;
					break;
				}
				else if (result.dataValues[j].highOutlier) {
					html += '<td class="highOutlier">' + result.dataValues[j].value + "</td>";
					noValue = false;
					break;
				}
				else {
					html += "<td>" + result.dataValues[j].value + "</td>";
					noValue = false;
					break;
				}
			}
		}
		if (noValue) html += '<td class="noData">-</td>';		
	}
	html += "</tr></table>";
	
	var chartID = result.orgunitID + result.variableID;
	html += '<div style="width:800px; height:400px" id="' + chartID + '"/></div>';
	
	html += "</div>";
	
	$("#result").append(html);
	
	generateChart(chartID, result);	
	
}



function generateChart(chartID, result) {

	
	var periods = [];
	for (var i = 0; i < result.periods.length; i++) {
		periods.push({
			'id': result.periods[i].iso
			});	
	}


	var chartParameters = {
		url: baseURL,
		el: chartID,
		type: "column",
		columns: [ // Chart series
		  {dimension: "de", items: [{id: result.variableID}]}
		],
		rows: [ // Chart categories
		  {dimension: "pe", items: periods}
		],
		filters: [
		  {dimension: "ou", items: [{id: result.orgunitID}]}
		],
		// All following options are optional
		width: "800px",
		heigth: "400px",
		showData: false,
		hideLegend: true,
		targetLineValue: result.highLimit,
		baseLineValue: result.lowLimit,
		hideTitle: true
		};
	DHIS.getChart(chartParameters);
}



function selectLevel() {
	$('#orgunitTree').hide();
	$('#ouLevelSelect').prop('disabled', false); 
	
	
	if ($('#ouLevelSelect option').size() < 2) {
	
		//Fetch levels
		var requestURL = baseURL + '/api/organisationUnitLevels.json?paging=false&fields=name,level';
			
		$.ajax({
			type: "GET",
			url: requestURL,
			cache: false,
			success: function(data){
			   		     
				//Sort
				data.organisationUnitLevels.sort(function(a, b){return a.level-b.level}); 
				
				var options = $("#ouLevelSelect");
				
				//Add options
				$.each(data.organisationUnitLevels, function() {
				    options.append($("<option />").val(this.level).text(this.name));
				});
				
			},
			error: function (xhr, ajaxOptions, thrownError) {
				console.log("Error fetching ou levels");	
			}
		});
	
	}
}



function selectSpecific() {
	$('#orgunitTree').show();
	$('#ouLevelSelect').prop('disabled', true); 	
}

















