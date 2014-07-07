var _ = require("lodash");
var parent = require("../base");

function functionModel(prop) {
	this.queryOptions = prop;
}

require('util').inherits(functionModel, parent);

functionModel.prototype.cloning = function() {
  return this;
};

module.exports = functionModel;