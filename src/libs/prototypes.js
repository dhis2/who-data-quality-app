if (!String.prototype.trim) {
 String.prototype.trim = function() {
  return this.replace(/^\s+|\s+$/g,'');
 }
}


var resultHandler = function (functionToCall, extraParameter, includeData) {
	
	var self = this;
	self.extraParameter = extraParameter;
	self.functionToCall = functionToCall;
	self.includeData = includeData;
	
	self.handleResult = function (response) {
		
		if (includeData) {
			self.functionToCall(response, self.extraParameter);	
		}
		else {
			self.functionToCall(self.extraParameter);
		}
		
	};
	return this;
};
if (!Array.prototype.move) {
	Array.prototype.move = function(from, to) {
	    this.splice(to, 0, this.splice(from, 1)[0]);
	}
}