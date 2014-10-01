var baseURL = "";

//Load from manifest.webapp
function loadJSON(callback) {   

	var xobj = new XMLHttpRequest();
  xobj.overrideMimeType("application/json");
	xobj.open('GET', 'manifest.webapp', false); // Replace 'my_data' with the path to your file
	xobj.onreadystatechange = function () {
		if (xobj.readyState == 4 && xobj.status == "200") {
    // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
			callback(xobj.responseText);
    }
  };
 	xobj.send(null);  
 }

loadJSON(function(response) {

   // Parse JSON string into object
 		var data = JSON.parse(response);
 		baseURL = data.activities.dhis.href;;
 		
 });
 
 window.dhis2 = window.dhis2 || {};
 dhis2.settings = dhis2.settings || {};
 dhis2.settings.baseUrl = baseURL.split('/', 4)[3];