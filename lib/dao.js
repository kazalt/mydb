var daoField = require("./daoField");
var _ = require("lodash");
var Base = require("../base");
var dataType = require("./dataType");

module.exports = function(customExtension, methods) {

  function objectToArray(obj) {
    var array = [];
    _.each(obj, function(v) {
      array.push(v);
    });
    return array;
  }


  function dao() {

  }

  _.each(Object.keys(Base), function(key) {
    dao[key] = Base[key];
  });

  dao.define = function(props) {
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

  dao.addField = function(fieldName, attrs) {
    this.attributes[fieldName] = new daoField(this, fieldName, attrs);
    this['$' + fieldName] = this.attributes[fieldName];
    return this['$' + fieldName];
  };

  dao.hasMany = function(table, key) {
    this.relations[table.tableName] = {type: "hasMany", key: key};
  };

  dao.belongsTo = function(table, key) {
    this.relations[table.tableName] = {type: "belongsTo", key: key};
  };

  dao.custom = function(val) {
    return {uncheck: true, value: val};
  };

  dao.cloning = function() {
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

  dao.as = function(alias) {
    var clone = this.cloning();
    clone.alias = alias;
    _.each(clone.attributes, function(field) {
      field.table = clone;
    });
    return clone;
  };

  dao.where = function() {
    var data = arguments.length == 1 ? arguments[0] : _.toArray(arguments);
    var clone = this.cloning();
    clone.queryOptions.where = data;
    return clone;
  };

  dao.mergeJoins = function(table) {
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

  dao.buildInclude = function(args, type) {
    var clone = this.cloning();
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

  dao.include = function() {
    var args = _.flatten(_.toArray(arguments));
    var clone = this.cloning();
    clone.buildInclude(args, "join");
    return clone;
  };

  dao.on = function(data) {
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

  dao.buildJoin = function(arg, type) {
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

  dao.join = function() {
    var clone = this.cloning();
    var args = _.values(arguments);
    _.each(args, function(arg) {
      clone.buildJoin(arg, "join");
    });
    return clone;
  };

  dao.leftJoin = function() {
    var clone = this.cloning();
    var args = _.values(arguments);
    _.each(args, function(arg) {
      clone.buildJoin(arg, "leftJoin");
    });
    return clone;
  };

  dao.select = function() {
    var clone = this.cloning();
    clone.queryOptions.type = "select";
    if (!clone.queryOptions.select) clone.queryOptions.select = [];
    clone.queryOptions.select = clone.queryOptions.select.concat(_.values(arguments));
    return clone;
  };

  dao.delete = function() {
    var clone = this.cloning();
    clone.queryOptions.type = "delete";
    return clone;
  };

  dao.update = function(datas) {
    var clone = this.cloning();
    clone.queryOptions.type = "update";
    clone.queryOptions.update = datas;
    return clone;
  };

  dao.from = function() {
    var clone = this.cloning();
    clone.queryOptions.from = _.values(arguments);
    return clone;
  };

  dao.where = function() {
    var data = arguments.length == 1 ? arguments[0] : _.toArray(arguments);
    if (!_.isArray(data)) data = [data];
    var clone = this.cloning();
    clone.queryOptions.where = data;
    return clone;
  };

  dao.having = function(data) {
    var clone = this.cloning();
    clone.queryOptions.having = data.queryOptions;
    return clone;
  };

  dao.group = function() {
    var clone = this.cloning();
    clone.queryOptions.group = _.values(arguments);
    return clone;
  };

  dao.parseData = function(data, options) {
    var mthis = this;
    var joined = _.clone(mthis.queryOptions.join);
    var modelType = {
      name: mthis.usedName(),
      id: mthis.primary,
      tableKey: mthis.usedName()+"."+mthis.primary,
      table: mthis,
      relation: {}
    };
    var addToModelType = function(model) {
      _.each(joined, function(value, key) {
        var relation = _.find(model.table.relations, function(rel) {
          return rel.linkedTo.table.tableName == value.data.table.tableName;
        });
        if (relation) {
          var table = value.data.table;
          var newModel = {
            name: table.usedName(),
            id: table.primary,
            tableKey: table.usedName()+"."+table.primary,
            table: table,
            relation: {}
          };
          model.relation[newModel.name] = newModel;
          delete joined[key];
          addToModelType(newModel);
        }
      });
    };
    addToModelType(modelType);

    var addToModel = function(data, model, type) {
      _.each(type.relation, function(item) {
        if (item.table.options.linkTable && _.size(item.table.relations) <= 2) {
          var oldItem = _.clone(item);
          item = item.relation[Object.keys(item.relation)[0]];
          if (!model.relation[item.name]) {
            model.relation[item.name] = {};
          }
          if (!model.relation[item.name][data[item.name][primaryIndex]]) {
            model.relation[item.name][data[item.name][primaryIndex]] = {
              attributes: data[item.name],
              relation: {},
              related: data[oldItem.name]
            };
          }
          addToModel(data, model.relation[item.name][data[item.name][primaryIndex]], item);
        } else {
          if (!model.relation[item.name]) {
            model.relation[item.name] = {};
          }
          if (!model.relation[item.name][data[item.name][primaryIndex]]) {
            model.relation[item.name][data[item.name][primaryIndex]] = {
              attributes: data[item.name],
              relation: {}
            };
          }
          addToModel(data, model.relation[item.name][data[item.name][primaryIndex]], item);
        }
      });
    };
    var fieldsTable = {};
    _.each(mthis.queryOptions.select, function(field) {
      if (field.table) fieldsTable[field.fake_name || field.fieldName] = field.table.tableName;
      else fieldsTable[field.fake_name] = "other";
    });
    var models = options.type == "flat"? [] : {};
    _.each(resp, function(data) {
      var attrs = {};
      _.each(data, function(value, key) {
        var pos = key.indexOf(".");
        var fieldName = pos !== -1 ? key.slice(pos+1) : key;
        var tableName = pos !== -1 ? key.substring(0, pos) : fieldsTable[key];
        if (!attrs[tableName]) attrs[tableName] = {};
        attrs[tableName][fieldName] = value;
      });
      if (options.type == "tree") {
        var tableKey = data[mthis.usedName()+"."+mthis.primary];
        var key = attrs[mthis.usedName()][mthis.primary];
        if (!models[key]) {
          models[key] = {
            attributes: attrs[mthis.usedName()],
            relation: {}
          };
        }
        addToModel(attrs, models[key], modelType);
      } else if (options.type == "flat") {
        models.push(attrs);
      }
    });
  };

  dao.run = function(options) {
    if (!options) options = {};
    if (!options.type) options.type = "flat";
    this.queryOptions.from = this.queryOptions.from || [this];

    var errCallback = options.error || this.queryOptions.error || function() {};
    var successCallback = options.success || this.queryOptions.success || function() {};

    if (_.size(this.errors)) return errCallback(this.errors);

    var mthis = this;
    if (!this.queryOptions.type) this.queryOptions.type = "select";
    if (this.queryOptions.type == "select") {
      if (!this.queryOptions.select) {
        this.queryOptions.select = [];
      }
      var isPrimaryIn = false;
      var primaryIndex = "";

      if (options.type != "raw") {
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
      }
      _.each(this.queryOptions.select, function(field) {
        if (field.table && field.table.tableName == mthis.tableName && field.fieldName == mthis.primary) isPrimaryIn = true;
        primaryIndex = field.usedName();
      });

      if (!isPrimaryIn) options.type = "raw";
    }

    this.mydb.connector.build_query(this.queryOptions, {
      error: function(err) {
        if (errCallback) errCallback(err);
      },
      success: function(resp) {
        if (!successCallback) return false;
        if (_.contains(["add", "update", "delete", "batchUpdate"], mthis.queryOptions.type)) return successCallback(resp);
        if (options.type == "raw") return successCallback(resp);

        var models = mthis.parseData(resp, options);
        successCallback(models);
      }
    });
  };

  _.extend(dao.prototype, Base.prototype, {
    
  });

  return dao;
}();