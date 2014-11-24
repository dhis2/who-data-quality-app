(function(){  
	/**Controller: Results*/
	angular.module('completenessAnalysis').controller("ResultsController", function(completenessDataService, visualisationService) {
	    var self = this;
	    
	    self.results = [];
	    self.itemsPerPage = 10;
        self.outliersOnly = false;
        self.hasVisual = false;
        
        self.popoverText = "Loading...";
        
        //showDetails
        self.showDetails = function(row) {


			$('#detailedResult').html('<div class="chartHolder" id="detailChart"></div>');

        	var series = {}, category = {}, filter = {}, parameters = {};
        	
        	series.type = "dx"; 
        	series.data = [{'id': row.metaData.dx}];
        	
        	filter.type = "ou";
        	filter.data = [{'id': row.metaData.ou}];
        	
        	category.type = "pe";
        	category.data = [];
        	for (var i = 0; i < row.data.length; i++) {
        		category.data.push({
        			'id': row.data[i].pe        		
        		});
        	}
        	        	
        	// All following options are optional
    		parameters.width = $('#detailChart').innerWidth();
    		parameters.heigth = $('#detailChart').innerHeight();
    		parameters.showData = true;
    		parameters.hideLegend = true;
    		parameters.hideTitle = true;
    		if (row.metaData.highLimit) parameters.targetLineValue = Math.round(row.metaData.highLimit);
    		if (row.metaData.lowLimit) parameters.baseLineValue = Math.round(row.metaData.lowLimit);
    		
    		visualisationService.generateChart('detailChart', 'column', series, category, filter, parameters);
        };
        
        self.completeness = function(dx, ou, pe) {
            //self.popoverText = "Loading...";
        	self.popoverText = completenessDataService.getSingleCompleteness(dx, ou, pe);
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
             
            
        self.filter = function() {
				for (var i = 0; i < self.results.length; i++) {
					self.results[i] = self.filterChanged(self.results[i]);
				}
      };
        
	    self.filterChanged = function(result) {
	    	if (self.outliersOnly) {
	    		result.pages = paginateRows(filterOutlierRows(result.rows));	
	    	}
	    	else {
	    		result.pages = paginateRows(result.rows);	
	    	}
	    	
	    	result.currentPage = 0;
	    	result.n = 0;
	    	
	    	console.log(result);
	    	
	    	return result;
	    	
	    };
	    	    	    
	    var receiveResult = function(result) {		    
	    
	    	var latest = self.results.length;	
		    self.results.push(self.filterChanged(result));
		    self.results[latest].active = true;
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