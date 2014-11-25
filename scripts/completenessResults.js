(function(){  
	/**Controller: Results*/
	angular.module('completenessAnalysis').controller("ResultsController", function(completenessDataService, visualisationService) {
	    var self = this;
	    
	    self.results = [];
	    self.itemsPerPage = 15;
        self.outliersOnly = true;
        self.hasVisual = false;
        
        
        //showDetails
        self.showDetails = function(row) {

			$('#detailedResult').html('<div id="detailChart"><svg class="bigChart"></svg></div>');
        	
        	var chartSeries = [];
        	var series = {};
        	var data = [];
        	//TODO: Needs to be more fancy here in order to deal with multiple variables (if needed)
        	for (var i = 1; i < row.data.length; i++) {
        		
        		if (row.data[i].type === "data") {
		    		data.push({
		    			'pe': row.data[i].pe,   		
		    			'value': row.data[i].value
		    		});
        		}
        	}
        	series.data = data;
        	series.name = row.metaData.dxName + " - " + row.metaData.ouName; 
			
			var firstPeriod = series.data[0].pe;
			var lastPeriod = series.data[series.data.length - 1].pe;        	
        	
        	chartSeries.push(series);
        	
        	series = {};
        	series.name = "Low limit (" + parseInt(row.metaData.lowLimit).toString() + ")";
        	series.data = [{'pe': firstPeriod, 'value': row.metaData.lowLimit}, 
        				{'pe': lastPeriod, 'value': row.metaData.lowLimit}];
			chartSeries.push(series);
			
			
			series = {};
			series.name = "High limit (" + parseInt(row.metaData.highLimit).toString() + ")";
			series.data = [{'pe': firstPeriod, 'value': row.metaData.highLimit}, 
						{'pe': lastPeriod, 'value': row.metaData.highLimit}];
			chartSeries.push(series);
        	        	        	   	    		
    		visualisationService.timeTrendChart('detailChart', chartSeries, {});
        };
                

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
        
        self.range = function (start, end) {
            var ret = [];
            if (!end) {
                end = start;
                start = 0;
            }
            for (var i = start; i < end; i++) {
                ret.push(i);
            }
            return ret;
        };
        
        self.prevPage = function (result) {
            if (result.currentPage > 0) {
                result.currentPage--;
            }
        };
        
        self.nextPage = function (result) {
            if (result.currentPage < result.pages.length - 1) {
                result.currentPage++;
            }
        };
        
        self.setPage = function (result, n) {
            result.currentPage = n;
        };
             
            
        
	    self.updateCurrentView = function() {
	    	var result = self.results[getActiveResultTab()];
	    	var rows = result.rows;
	    	
	    	if (self.outliersOnly) {
	    		rows = sortRows(rows, result.sortColumn, result.reverse);	    		 
	    		rows = filterOutlierRows(rows);
	    		result.pages = paginateRows(rows);	
	    	}
	    	else {
	    		rows = sortRows(rows, result.sortColumn, result.reverse); 
	    		result.pages = paginateRows(rows);
	    	}
	    	
	    	result.currentPage = 0;
	    	result.n = 0;
	    		    	
	    	return result;
	    };
	    
	    
	    self.changeSortOrder = function(sortColumn) {	        
	        var resultIndex = getActiveResultTab();
	        
	        if (self.results[resultIndex].sortColumn === sortColumn) {
	        	self.results[resultIndex].reverse = !self.results[resultIndex].reverse;
	        }
	        self.results[resultIndex].sortColumn = sortColumn;
	        
	        self.updateCurrentView()
	    }
	    
	    
	    function sortRows(rows, sortCol, reverse) {
			
			var tmp = rows;
			if (rows[0].data[sortCol].type === 'header') {
				rows.sort(function (a, b) {
					if (reverse) {
						var tmp = a;
						a = b;
						b = tmp;
					}
					return a.data[sortCol].value.toLowerCase().localeCompare(b.data[sortCol].value.toLowerCase());	
				});
			}
			else {
				rows.sort(function (a, b) {
					if (reverse) {
						var tmp = a;
						a = b;
						b = tmp;
					}
					return (parseFloat(b.data[sortCol].value) - parseFloat(a.data[sortCol].value));	
				});
			}
			
			return rows;
				    
	    }
	    
	    
	    function getActiveResultTab() {
	    	for (var i = 0; i < self.results.length; i++) {
	    		if (self.results[i].active) return i;
	    	}
	    }
	    
	    
	    function setActiveResultTab(index) {
	    	
	    	for (var i = 0; i < self.results.length; i++) {
	    		if (i != index) self.results[i].active = false;
	    		else self.results[i].active = true;
	    	}	    
	    }
	       
	       	    
	    var receiveResult = function(result) {		    
	    
	    	var latest = self.results.length;	

		    self.results.push(result);
		    
		    self.results[latest].sortColumn = 0;
		    self.results[latest].sortRevers = false;
		    
		    if (result.metaData.outlierRows === 0) {
		    	self.outliersOnly = false;
		    }
		    setActiveResultTab(latest);
		    self.updateCurrentView();
			
	    };
   	    completenessDataService.resultsCallback = receiveResult;
   	    
		
		function filterOutlierRows(rows) {
		
			var row, filteredRows = [];
			for (var i = 0; i < rows.length; i++) {
				row = rows[i];
				
				if (row.metaData.hasOutlier) {
					filteredRows.push(row);
				}
			}
			
			return filteredRows;
			
		
		}
			                   	   	
	   	return self;
	});
})();