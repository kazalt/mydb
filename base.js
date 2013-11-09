var _ = require("underscore");

function base(init) {

}

base.prototype.custom = function(val) {
	return {uncheck: true, value: val};
};

base.prototype.cloning = function() {
	if (!this.cloned) {
		var clone = _.clone(this);
		clone.cloned = true;
		clone.query_options = {
			data: []
		}
	} else {
		var clone = this;
		clone.query_options = _.clone(this.query_options);
	}
	return clone;
};

base.prototype.as = function(value) {
	var clone = this.cloning();
	clone.fake_name = value;
	return clone;
};

base.prototype.STRING = 'STRING';
base.prototype.TEXT = 'TEXT';
base.prototype.INTEGER = 'INTEGER';
base.prototype.BIGINT =  'BIGINT';
base.prototype.DATE = 'DATE';
base.prototype.BOOLEAN = 'BOOLEAN';
base.prototype.FLOAT = 'FLOAT';
base.prototype.ENUM = function() {
	return {type: "ENUM", values: arguments}
};


module.exports = base;