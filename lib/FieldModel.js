var _ = require("lodash");
var parent = require("../base");

function FieldModel(table, fieldName, attributes) {
  this.table = table;
  this.fieldName = fieldName;
  this.properties = attributes;
}

require('util').inherits(FieldModel, parent);

FieldModel.prototype.cloning = function() {
  var clone = new FieldModel(this.table, this.fieldName, this.properties);
  clone.queryOptions = this.queryOptions ? _.clone(this.queryOptions) : {data: []};
  return clone;
};

FieldModel.prototype.usedName = function() {
  return this.alias || this.fieldName;
};

module.exports = FieldModel;