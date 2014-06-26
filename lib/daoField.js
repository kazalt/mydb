module.exports = daoField;

var _ = require("lodash");
var parent = require("../base");

function daoField(table, fieldName, attributes) {
  this.table = table;
  this.fieldName = fieldName;
  this.properties = attributes;
}

require('util').inherits(daoField, parent);

daoField.prototype.cloning = function() {
  var clone = new daoField(this.table, this.fieldName, this.properties);
  clone.queryOptions = this.queryOptions ? _.clone(this.queryOptions) : {data: []};
  return clone;
};

daoField.prototype.usedName = function() {
  return this.alias || this.fieldName;
};

daoField.prototype.switchCondition = function(condition, value, element) {
  if (typeof(element.subGroup) !== "undefined") {
    this.switchCondition(condition, value, element.subGroup);
  } else {
    element.subGroup = value.queryOptions;
    element.switchCondition = condition;
  }
};


daoField.prototype.and = function(value) {
  var clone = this.cloning();
  if (clone.queryOptions.condition && clone.queryOptions != "AND") {
    this.switchCondition("AND", value, clone.queryOptions);
  } else {
    if (value.queryOptions.subGroup || (value.queryOptions.condition && value.queryOptions.condition != "AND")) {
      this.switchCondition("AND", value, clone.queryOptions);
    } else {
      clone.queryOptions.condition = "AND";
      if (_.size(clone.queryOptions.data)==0) clone.queryOptions.data = value.queryOptions.data;
      else {
        if (!value.queryOptions.subGroup) {
          for (var i in value.queryOptions.data) {
            var item = value.queryOptions.data[i];
            clone.pushData(item);
          }
        } else {
          clone.queryOptions.data.push(value.queryOptions);
        }
      }
    }
  }
  return clone;

};

daoField.prototype.or = function(value) {
  var clone = this.cloning();
  if (clone.queryOptions.condition && clone.queryOptions != "OR") {
    this.switchCondition("OR", value, clone.queryOptions);
  } else {
    if (value.queryOptions.subGroup || (value.queryOptions.condition && value.queryOptions.condition != "OR")) {
      this.switchCondition("OR", value, clone.queryOptions);
    } else {
      clone.queryOptions.condition = "OR";
      if (_.size(clone.queryOptions.data)==0) clone.queryOptions.data = value.queryOptions.data;
      else {
        if (!value.queryOptions.subGroup) {
          for (var i in value.queryOptions.data) {
            var item = value.queryOptions.data[i];
            clone.pushData(item);
          }
        } else {
          clone.queryOptions.data.push(value.queryOptions);
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
  this.queryOptions.data.push(data);
};

daoField.prototype.operators = function(value, operator) {
  var clone = this.cloning();
  return {field: clone, value: value, method: operator};
};

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
  clone.queryOptions.function = {type: "max"};
  return clone;
};

daoField.prototype.min = function() {
  var clone = this.cloning();
  clone.queryOptions.function = {type: "min"};
  return clone;
};

daoField.prototype.count = function() {
  var clone = this.cloning();
  clone.queryOptions.function = {type: "count"};
  return clone;
};

daoField.prototype.sum = function() {
  var clone = this.cloning();
  clone.queryOptions.function = {type: "sum"};
  return clone;
};