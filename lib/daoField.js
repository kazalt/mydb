module.exports = daoField;

var _ = require("underscore");
var parent = require("../base");

function daoField(table, field_name, attributes) {
	this.table = table;
	this.field_name = field_name;
	this.properties = attributes;
}

require('util').inherits(daoField, parent);

daoField.prototype.type_name = "daoField";

daoField.prototype.switchCondition = function(condition, value, element) {
	if (typeof(element.subGroup) !== "undefined") {
		this.switchCondition(condition, value, element.subGroup);
	} else {
		element.subGroup = value.query_options;
		element.switchCondition = condition;
	}
};


daoField.prototype.and = function(value) {
	var clone = this.cloning();
	if (clone.query_options.condition && clone.query_options != "AND") {
		this.switchCondition("AND", value, clone.query_options);
	} else {
		if (value.query_options.subGroup || (value.query_options.condition && value.query_options.condition != "AND")) {
			this.switchCondition("AND", value, clone.query_options);
		} else {
			clone.query_options.condition = "AND";
			if (_.size(clone.query_options.data)==0) clone.query_options.data = value.query_options.data;
			else {
				if (!value.query_options.subGroup) {
					for (var i in value.query_options.data) {
						var item = value.query_options.data[i];
						clone.pushData(item);
					}
				} else {
					clone.query_options.data.push(value.query_options);
				}
			}
		}
	}
	return clone;

};

daoField.prototype.or = function(value) {
	var clone = this.cloning();
	if (clone.query_options.condition && clone.query_options != "OR") {
		this.switchCondition("OR", value, clone.query_options);
	} else {
		if (value.query_options.subGroup || (value.query_options.condition && value.query_options.condition != "OR")) {
			this.switchCondition("OR", value, clone.query_options);
		} else {
			clone.query_options.condition = "OR";
			if (_.size(clone.query_options.data)==0) clone.query_options.data = value.query_options.data;
			else {
				if (!value.query_options.subGroup) {
					for (var i in value.query_options.data) {
						var item = value.query_options.data[i];
						clone.pushData(item);
					}
				} else {
					clone.query_options.data.push(value.query_options);
				}
			}
		}
	}
	return clone;

};

/**************************************************************
***************************Operators***************************
***************************************************************/

daoField.prototype.pushData = function(data) {
	this.query_options.data.push(data);
};

daoField.prototype.operators = function(value, operator) {
	var clone = this.cloning();
	var data = {field: clone, value: value, method: operator};
	clone.pushData(data);
	return clone;
}

daoField.prototype.equals = function(value) {
	return this.operators(value, "=");
};

daoField.prototype.notEquals = function(value) {
	return this.operators(value, "<>");
};

daoField.prototype.isNull = function() {
	return this.operators(null, "IS NULL");
};

daoField.prototype.isNotNull = function() {
	return this.operators(null, "IS NOT NULL");
};

daoField.prototype.gt = function(value) {
	return this.operators(value, ">");
};

daoField.prototype.gte = function(value) {
	return this.operators(value, ">=");
};

daoField.prototype.lt = function(value) {
	return this.operators(value, "<");
};

daoField.prototype.lte = function(value) {
	return this.operators(value, "<=");
};

daoField.prototype.like = function(value) {
	return this.operators(value, "LIKE");
};

daoField.prototype.notLike = function(value) {
	return this.operators(value, "NOT LIKE");
};

daoField.prototype.in = function(value) {
	return this.operators(value, "IN");
};

daoField.prototype.notIn = function(value) {
	return this.operators(value, "NOT IN");
};

/**************************************************************
***************************Functions***************************
***************************************************************/

daoField.prototype.max = function() {
	var clone = this.cloning();
	clone.query_options.function = {type: "max"};
	return clone;
};

daoField.prototype.min = function() {
	var clone = this.cloning();
	clone.query_options.function = {type: "min"};
	return clone;
};

daoField.prototype.count = function() {
	var clone = this.cloning();
	clone.query_options.function = {type: "count"};
	return clone;
};

daoField.prototype.sum = function() {
	var clone = this.cloning();
	clone.query_options.function = {type: "sum"};
	return clone;
};