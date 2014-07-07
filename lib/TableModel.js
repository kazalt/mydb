var FieldModel = require("./FieldModel");
var _ = require("lodash");
var Base = require("../base");
var dataType = require("./dataType");

function TableModel(attributes) {
  this.set(attributes);
}

_.each(Object.keys(Base), function(key) {
  TableModel[key] = Base[key];
});

TableModel.define = function(props) {
  var parent = this;
  var child = function(){ return parent.apply(this, arguments); };

  // Add static properties to the constructor function, if supplied.
  _.extend(child, parent, props);

  // Set the prototype chain to inherit from `parent`, without calling
  // `parent`'s constructor function.
  var Surrogate = function(){ this.constructor = child; };
  Surrogate.prototype = parent.prototype;
  child.prototype = new Surrogate();

  child.prototype.parent = child;

  if (!child.idAttribute) {
    child.idAttribute = "id";
  }
  if (!child.attributes[child.idAttribute]) {
    child.attributes[child.idAttribute] = {type: dataType.INTEGER, key: "primary", autoIncrement: true};
  }

  for (var attr in child.attributes) {
    if (!child.idAttribute && child.attributes[aaliasttr].key == "primary") child.idAttribute = attr;
    child.addField(attr, child.attributes[attr]);
  }

  child.relations = {};

  return child;
};

TableModel.addField = function(fieldName, attrs) {
  this.attributes[fieldName] = new FieldModel(this, fieldName, attrs);
  this['$' + fieldName] = this.attributes[fieldName];
  return this['$' + fieldName];
};

TableModel.hasMany = function(table, key) {
  this.relations[table.tableName] = {type: "hasMany", key: key};
};

TableModel.belongsTo = function(table, key) {
  this.relations[table.tableName] = {type: "belongsTo", key: key};
};

TableModel.custom = function(val) {
  return {uncheck: true, value: val};
};

TableModel.cloning = function() {
  var clone = null;
  if (!this.cloned) {
    var clone = this.constructor();
    for (var attr in this) {
        if (this.hasOwnProperty(attr)) clone[attr] = this[attr];
    }
    clone.cloned = true;
    clone.queryOptions = {
      data: []
    };
  } else {
    clone = this;
  }
  return clone;
};

TableModel.as = function(alias) {
  var clone = this.cloning();
  clone.alias = alias;
  _.each(clone.attributes, function(field) {
    field.table = clone;
  });
  return clone;
};

TableModel.where = function() {
  var data = arguments.length == 1 ? arguments[0] : _.toArray(arguments);
  var clone = this.cloning();
  clone.queryOptions.where = data;
  return clone;
};

TableModel.mergeJoins = function(table) {
  var clone = this.cloning();
  if (table.queryOptions && table.queryOptions.join.length > 0) {
    if (!table.queryOptions) {
      table.queryOptions = {};
    }
    if (!table.queryOptions.join) {
      table.queryOptions.join = [];
    }
    _.each(table.queryOptions.join, function(join) {
      clone.queryOptions.join.push(join);
    });
  }
};

TableModel.buildInclude = function(args, type) {
  var clone = this.cloning();
  if (!clone.queryOptions.include) clone.queryOptions.include = {};
  _.extend(clone.queryOptions.include, args);
  _.each(args, function(arg) {
    if (typeof arg == "function") {
      var rel = clone.relations[arg.tableName];
      if (rel.type == "belongsTo") {
        clone[type](arg.on(arg.attributes[arg.idAttribute].equals(clone.attributes[rel.key.fieldName])));
      } else if (rel.type == "hasMany") {
        if (rel.key.table.tableName != arg.tableName) {
          clone[type](rel.key.table.on(clone.attributes[clone.idAttribute].equals(rel.key)));
          clone[type](arg.on(arg.attributes[arg.idAttribute].equals(arg.relations[clone.tableName].key)));
        } else {
          clone[type](arg.on(clone.attributes[clone.idAttribute].equals(arg.attributes[rel.key.fieldName])));
        }
      }
      clone.mergeJoins(arg);
    }
  });
};

TableModel.include = function() {
  var args = _.flatten(_.toArray(arguments));
  var clone = this.cloning();
  clone.buildInclude(args, "join");
  return clone;
};

TableModel.on = function(data) {
  var clone = this.cloning();
  if (typeof data == "function") {
    var related = _.find(clone.relations, function(rel) {
      return rel.linkedTo.table.tableName == data.tableName;
    });
    if (related) {
      data = related.field.equals(related.linkedTo.field);
    }

  }
  return {table: clone, on: data};
};

TableModel.buildJoin = function(arg, type) {
  var clone = this.cloning();
  clone.queryOptions.join = clone.queryOptions.join || [];
  if (typeof arg == "function") {
    arg = {table: arg, on: null};
  }
  clone.queryOptions.join.push({
    type: type,
    data: arg
  });
};

TableModel.join = function() {
  var clone = this.cloning();
  var args = _.values(arguments);
  _.each(args, function(arg) {
    clone.buildJoin(arg, "join");
  });
  return clone;
};

TableModel.leftJoin = function() {
  var clone = this.cloning();
  var args = _.values(arguments);
  _.each(args, function(arg) {
    clone.buildJoin(arg, "leftJoin");
  });
  return clone;
};

TableModel.select = function() {
  var clone = this.cloning();
  clone.queryOptions.type = "select";
  if (!clone.queryOptions.select) clone.queryOptions.select = [];
  clone.queryOptions.select = clone.queryOptions.select.concat(_.values(arguments));
  return clone;
};

TableModel.delete = function() {
  var clone = this.cloning();
  clone.queryOptions.type = "delete";
  return clone;
};

TableModel.update = function(datas) {
  var clone = this.cloning();
  clone.queryOptions.type = "update";
  clone.queryOptions.update = datas;
  return clone;
};

TableModel.from = function() {
  var clone = this.cloning();
  clone.queryOptions.from = _.values(arguments);
  return clone;
};

TableModel.where = function() {
  var data = arguments.length == 1 ? arguments[0] : _.toArray(arguments);
  if (!_.isArray(data)) data = [data];
  var clone = this.cloning();
  clone.queryOptions.where = data;
  return clone;
};

TableModel.having = function(data) {
  var clone = this.cloning();
  clone.queryOptions.having = data.queryOptions;
  return clone;
};

TableModel.group = function() {
  var clone = this.cloning();
  clone.queryOptions.group = _.values(arguments);
  return clone;
};

TableModel.format = function(format) {
  var clone = this.cloning();
  clone.queryOptions.format = format;
  return clone;
};

TableModel.flatFormat = function(values) {
  var mthis = this;
  var fieldsTable = {};
  _.each(mthis.queryOptions.select, function(field) {
    if (field.table) fieldsTable[field.fake_name || field.fieldName] = field.table.tableName;
    else fieldsTable[field.fake_name] = "other";
  });
  var models = [];
  _.each(values, function(data) {
    var attrs = {};
    _.each(data, function(value, key) {
      var pos = key.indexOf(".");
      var fieldName = pos !== -1 ? key.slice(pos+1) : key;
      var tableName = pos !== -1 ? key.substring(0, pos) : fieldsTable[key];
      if (!attrs[tableName]) attrs[tableName] = {};
      attrs[tableName][fieldName] = value;
    });
    models.push(attrs);
  });

  return models;
};

TableModel.objectFormat = function(values) {
  var mthis = this;
  var fieldsTable = {};
  _.each(mthis.queryOptions.select, function(field) {
    if (field.table) fieldsTable[field.fake_name || field.fieldName] = field.table.tableName;
    else fieldsTable[field.fake_name] = "other";
  });

  var format = function(row, table) {

  }

  var models = [];
  console.log(mthis.queryOptions.include);
  _.each(values, function(rVal, rKey) {

  });

  return models;
};

TableModel.run = function(callback) {
  if (!callback) callback = function(){};
  if (!this.queryOptions.format) this.queryOptions.format = "object";
  this.queryOptions.from = this.queryOptions.from || [this];

  if (_.size(this.errors)) return callback(this.errors);

  var mthis = this;
  if (!this.queryOptions.type) this.queryOptions.type = "select";
  if (this.queryOptions.type == "select") {
    if (!this.queryOptions.select) {
      this.queryOptions.select = [];
    }

    if (this.queryOptions.format != "raw") {
      var isPrimaryIn = false;

      if (this.queryOptions.select.length === 0) {
        _.each(this.attributes, function(field) {
          mthis.select(field.as((field.table.fake_name || field.table.tableName)+"."+(field.fake_name || field.fieldName)));
        });
      }
      _.each(this.queryOptions.join, function(join) {
        var table = join.data.table;
        _.each(table.attributes, function(field) {
          mthis.select(field.as((field.table.fake_name || field.table.tableName)+"."+(field.fake_name || field.fieldName)));
        });
      });

      _.each(this.queryOptions.select, function(field) {
        if (field.table && field.table.tableName == mthis.tableName && field.fieldName == mthis.idAttribute) isPrimaryIn = true;
      });

      if (!isPrimaryIn) {
        this.select(this.attributes[this.idAttribute]);
      }
    }
  }

  this.mydb.connector.build_query(this.queryOptions, {
    error: function(err) {
      callback(err);
    },
    success: function(resp) {
      if (_.contains(["add", "update", "delete", "batchUpdate"], mthis.queryOptions.type)) return callback(null, resp);
      if (mthis.queryOptions.format == "raw") {
        return callback(null, resp);
      } else if (mthis.queryOptions.format == "flat") {
        var models = mthis.flatFormat(resp);
      } else if (mthis.queryOptions.format == "object") {
        var models = mthis.objectFormat(resp);
      }

      return callback(null, models);
    }
  });
};

require('util').inherits(TableModel, Base);

TableModel.prototype.attributes = {};

TableModel.prototype.set = function(attributes) {
  var mthis = this;
  _.each(attributes, function(val, key) {
    if (mthis.constructor.attributes[key]) {
      mthis.attributes[key] = val;
      mthis["$" + key] = mthis.attributes[key];
    }
  });
};

module.exports = TableModel;