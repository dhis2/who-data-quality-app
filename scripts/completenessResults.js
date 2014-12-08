(function(){  
	/**Controller: Results*/
	angular.module('completenessAnalysis').controller("CompletenessResultsController", function(completenessDataService, requestService, $modal) {
	    var self = this;
	    
	    self.result = undefined;
	    self.itemsPerPage = 25;
        self.hasVisual = false;
        
        
        //showDetails
        self.showDetails = function(row) {

			$('#detailedResult').html('<div id="detailChart"><svg class="bigChart"></svg></div>');
        	
        	var chart = nv.models.multiBarChart()
        			      .transitionDuration(500)
        			      .reduceXTicks(true)   //If 'false', every single x-axis tick label will be rendered.
        			      .rotateLabels(0)      //Angle to rotate x-axis labels.
        			      .groupSpacing(0.1)    //Distance between each group of bars.
        			      .showControls(false)
        			    ;
        			
        	var result = self.result;
        	var index = 0;
        	var series = [{
        		'key': row.metaData.dxName + " - " + row.metaData.ouName,
        		'color': "green",
        		'values': []
        	}];
        	for (var i = 0; i < row.data.length; i++) {
        		if (!result.headers[i].meta) {
        			var value = row.data[i];
        			if (value === '') value = null;
        			else value = parseFloat(value);
        			series[0].values.push({
        				'x': index++,   		
        				'y': value,
        				'label': result.headers[i].name
        			});
        		}
        	}
        	        	        				
		    chart.xAxis
		        .tickFormat(function(d) {
		        	return series[0].values[d].label;
		        });
		
		    chart.yAxis
		        .tickFormat(d3.format('g'));
		
			d3.select('#detailChart svg')
		        .datum(series)
		        .call(chart);
				
		    nv.utils.windowResize(chart.update);
		    
		    $('html, body').animate({
		    	scrollTop: $("#detailChart").offset().top,
		    	scrollLeft: 0
		    }, 500);
		    
		    //Mark outliers
		    if (result.type === 'gap') {
			    d3.selectAll("#detailChart rect.nv-bar").style("fill", function(d, i){
	    	        if (d.y === null) return "#843534";
			    });
		    }
		    else {
		    	d3.selectAll("#detailChart rect.nv-bar").style("fill", function(d, i){
					if (d.y < row.metaData.lowLimit) return "#843534";
					if (d.y > row.metaData.highLimit) return "#843534";
		    	});
		    }
		    
    		
        };
        
        self.sendMessage = function(metaData) {
        	        	
        	var modalInstance = $modal.open({
	            templateUrl: "modals/modalMessage.html",
	            controller: "ModalMessageController",
	            controllerAs: 'mmCtrl',
	            resolve: {
	    	        orgunitID: function () {
	    	            return metaData.ou;
	    	        },
	    	        orgunitName: function () {
	    	            return metaData.ouName;
	    	        }
	            }
	        });
	
	        modalInstance.result.then(function (result) {
	        });
        }
        
        
        self.drillDown = function (rowMetaData) {
        	
        	var requestURL = "/api/organisationUnits/" + rowMetaData.ou + ".json?fields=children[id]";
        	requestService.getSingle(requestURL).then(function (response) {
        		
        		
        		var children = response.data.children;
        		
        		if (children.length > 0) {
        			completenessDataService.updateAnalysis(self.result.metaData, children);	
        		}
        		else {
        			self.result.alerts.push({type: 'warning', msg: rowMetaData.ouName + ' does not have any children'});
        		}
        	});
        	
        	
        }
        
        self.floatUp = function (rowMetaData) {
        	
        	var requestURL = "/api/organisationUnits/" + rowMetaData.ou + ".json?fields=parent[id,children[id],parent[id,children[id]]";
        	requestService.getSingle(requestURL).then(function (response) {

        		var metaData = response.data;
        		var orgunitIDs;
        		var parent;
        		if (metaData.parent) {
        			parent = metaData.parent;
        			
        			if (parent.parent) {
						orgunitIDs = parent.parent.children;
        			}
        			else {
        				orgunitIDs = [parent];
        			}
        			
        			//TODO: replace result rather than updating
        			completenessDataService.updateAnalysis(self.result.metaData, orgunitIDs);
        			
        		}
        		else {
					self.result.alerts.push({type: 'warning', msg: rowMetaData.ouName + ' does not have a parent'});
        		}
        		
        		
        		
        	});
        	
        	
        }
                

        // calculate page in place
        function paginateRows(rows) {
            var pagedItems = [];
    
            for (var i = 0; i < rows.length; i++) {
                if (i % self.itemsPerPage === 0) {
                    pagedItems[Math.floor(i / self.itemsPerPage)] = [ rows[i] ];
                } else {
                    pagedItems[Math.floor(i / self.itemsPerPage)].push(rows[i]);
                }
            }
            
            return pagedItems;
            
        }           
            
        
	    self.updateCurrentView = function() {
	    	var result = self.result;
	    	var rows = result.rows;
	    	
    		rows = sortRows(rows, result.sortColumn, result.reverse); 
    		result.pages = paginateRows(rows);
	    	
	    	result.currentPage = 1;
	    		    	
	    	return result;
	    };
	    
	    
	    self.changeSortOrder = function(sortColumn) {	        
	        if (self.result.sortColumn === sortColumn) {
	        	console.log("Reverse!");
	        	self.result.reverse = !self.result.reverse;
	        }
	        self.result.sortColumn = sortColumn;
	        
	        self.updateCurrentView()
	    }
	    
	    
	    function sortRows(rows, sortCol, reverse) {
			
			if (rows.length === 0) return rows;
			
			var tmp;
			if (isNaN(parseFloat(rows[0].data[sortCol]))) {
				rows.sort(function (a, b) {
					if (reverse) {
						var tmp = a;
						a = b;
						b = tmp;
					}
					return a.data[sortCol].toLowerCase().localeCompare(b.data[sortCol].toLowerCase());	
				});
			}
			else {
				rows.sort(function (a, b) {
					if (reverse) {
						var tmp = a;
						a = b;
						b = tmp;
					}
					return (parseFloat(b.data[sortCol]) - parseFloat(a.data[sortCol]));	
				});
			}
			
			return rows;
	    }
	    
	    	   	    
	       	    
	    var receiveResult = function(result) {		    
	    	    
		    self.result = result;
		    
		    self.result.alerts = [];
		    self.result.sortColumn = self.result.headers.length-1;
		    self.result.sortRevers = false;
		    
		    if (result.rows.length === 0) {
		    	self.result.alerts.push({type: 'success', msg: 'No data!'});
		    }
	    
		    self.updateCurrentView();
			
	    };
   	    completenessDataService.resultsCallback = receiveResult;
   	    
		

			                   	   	
	   	return self;
	});
})();