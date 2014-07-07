var _ = require("lodash");

function Base() {

}

Base.prototype.custom = function(val) {
  return {uncheck: true, value: val};
};

Base.prototype.as = function(value) {
  var clone = this.cloning();
  clone.alias = value;
  return clone;
};

Base.prototype.get = function(key) {
  return this.attributes[key];
};

Base.prototype.operators = function(value, operator) {
  var clone = this.cloning();
  return {field: clone, value: value, method: operator};
};

Base.prototype.equals = function(value) {
  return this.operators(value, "=");
};

Base.prototype.notEquals = function(value) {
  return this.operators(value, "<>");
};

Base.prototype.isNull = function() {
  return this.operators(null, "IS NULL");
};

Base.prototype.isNotNull = function() {
  return this.operators(null, "IS NOT NULL");
};

Base.prototype.gt = function(value) {
  return this.operators(value, ">");
};

Base.prototype.gte = function(value) {
  return this.operators(value, ">=");
};

Base.prototype.lt = function(value) {
  return this.operators(value, "<");
};

Base.prototype.lte = function(value) {
  return this.operators(value, "<=");
};

Base.prototype.like = function(value) {
  return this.operators(value, "LIKE");
};

Base.prototype.notLike = function(value) {
  return this.operators(value, "NOT LIKE");
};

Base.prototype.in = function(value) {
  return this.operators(value, "IN");
};

Base.prototype.notIn = function(value) {
  return this.operators(value, "NOT IN");
};


module.exports = Base;