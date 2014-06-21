var _ = require("lodash");

Base = function() {

}

Base.prototype.custom = function(val) {
  return {uncheck: true, value: val};
};

Base.prototype.cloning = function() {
  var clone = null;
  if (!this.cloned) {
    clone = _.clone(this);
    clone.cloned = true;
    clone.queryOptions = {
      data: []
    };
  } else {
    clone = this;
    clone.queryOptions = _.clone(this.queryOptions);
  }
  return clone;
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