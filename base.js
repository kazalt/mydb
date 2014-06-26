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


module.exports = Base;