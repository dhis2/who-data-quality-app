(function(){  
	/**Controller: Parameters*/
	angular.module('outlierGapAnalysis').controller("ModalExportController", function($modalInstance) {
	    
	    var self = this; 

		self.separators = [
			{
				label: 'Comma',
				value: ','
			},{
				label: 'Semicolon',
				value: ';'
			}
		];

		self.options = {
			'separator': ',',
			'fileName': 'Outliers and missing data',
			'includeIDs': false
		};

		self.cancel = function () {
			$modalInstance.dismiss("Cancelled");
		}

	    self.close = function () {
	        $modalInstance.close(self.options);
	    };


	    
	});
})();