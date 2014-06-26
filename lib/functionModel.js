function functionModel(prop) {
	this.queryOptions = prop;
}

functionModel.prototype.as = function(alias) {
	this.alias = alias;
};