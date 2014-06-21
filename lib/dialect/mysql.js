module.exports = mysql;

var connector = require("mysql");
var _ = require("lodash");

function mysql(options) {
  this.options = options;
  var config = {
    database: this.options.database,
    username: this.options.username,
    password: (( (["", null, false].indexOf(this.options.password) > -1) || (typeof this.options.password == 'undefined')) ? null : this.options.password),
    host    : this.options.host,
    port    : this.options.port,
    protocol: this.options.protocol
  };

  this.connection = connector.createConnection(config);
  this.connection.connect();
}

var fieldTypes = {
  STRING: 'VARCHAR(255)',
  TEXT: 'TEXT',
  INTEGER: 'INTEGER',
  BIGINT:  'BIGINT',
  DATE: 'DATETIME',
  BOOLEAN: 'TINYINT(1)',
  FLOAT: 'FLOAT',
  ENUM: function(values) {
    var data = [];
    _.each(values, function(val) {
      data.push("'"+val+"'");
    });
    return "enum("+data.join(',')+")";
  }
};

mysql.prototype.executeQuery = function(query, options) {
  var options = options || {};
  var text = query.text || query;
  this.options.logging("-----------");
  this.options.logging(text);
  this.options.logging("-----------");
  this.connection.query(text, function(err, results) {
    if (err && options.error) options.error(err);
    if (!err && options.success) options.success(results);
  });
};

mysql.prototype.dropTable = function(table) {
  return this.executeQuery("DROP TABLE IF EXISTS `"+table.tableName+"`");
};

mysql.prototype.createTable = function(table) {
  var fields = [];
  var keys = [];
  for (var key in table.attributes) {
    var field = table.attributes[key];
    var type = _.isString(field.properties.type) ? fieldTypes[field.properties.type] : fieldTypes[field.properties.type.type](field.properties.type.values);
    var string = field.fieldName + " " + type;

    if (field.properties.required) string += " NOT NULL";
    else string += " NULL";

    if (field.properties.autoIncrement) string += " AUTO_INCREMENT";

    fields.push(string);

    if (field.properties.key) keys.push(field);
  }

  for (var i in keys) {
    var keyType = "";
    switch (keys[i].properties.key) {
      case "primary":
        keyType = "PRIMARY ";
        break;
      case "unique":
        keyType = "UNIQUE ";
        break;
    }
    if (keys[i].properties.key == "primary") keyType = "PRIMARY ";
    fields.push(keyType + "KEY`" + keys[i].fieldName + "` (`" + keys[i].fieldName + "`)");
  }

  var query = "CREATE TABLE `"+table.tableName+"` ( "+fields.join()+" )";

  return this.executeQuery(query);
};

mysql.prototype.buildConditions = function(queryOptions) {
  if (_.isArray(queryOptions)) {
    var array = [];
    var mthis = this;
    var lastCondition = "AND";
    var length = queryOptions.length;
    for (var i = 0; i < length; i++) {
      var condition = mthis.isCondition(queryOptions[i]);
      if (!condition) {
        if (i !== 0) {
          array.push(lastCondition);
        }
        array.push(mthis.buildConditions(queryOptions[i]));
      } else {
        lastCondition = condition;
      }
    }
    return "(" + array.join(" ") + ")";
  } else if (_.isObject(queryOptions)) {
    var a = _.isObject(queryOptions.field) ? this.buildFieldKeyString(queryOptions.field) : queryOptions.field;
    var b = "";
    if (_.isObject(queryOptions.value)) {
      b = this.buildFieldKeyString(queryOptions.value);
    } else if (_.isArray(queryOptions.value)) {
      var array = [];
      _.each(queryOptions.value, function(val) {
        array.push(connector.escape(val));
      });
      b = "("+b.join(',')+")";
    } else {
      b = connector.escape(queryOptions.value);
    }
    return a + " " + queryOptions.method + " " + b; 
  } else if (queryOptions){
    return queryOptions;
  }
  return "";
};

mysql.prototype.isCondition = function(elem) {
  if (_.isString(elem)) {
    elem = elem.toUpperCase();
    if (_.contains(["AND", "OR", "XOR"], elem)) {
      return elem;
    }
  }
  return false;
};

mysql.prototype.buildWhere = function(queryOptions) {
  var query = "";
  var conditions = queryOptions.where ? queryOptions.where : [];
  if (conditions.length) {
    query = this.buildConditions(conditions);
    if (query) query = "\nWHERE "+query;
  }
  return query;
};

mysql.prototype.buildFrom = function(queryOptions) {
  var query = "";
  var keys = [];
  var tables = queryOptions.from;
  queryOptions.where = queryOptions.where || [];
  for (var i in tables) {
    var table = tables[i];
    var asString = table.alias? " AS "+table.alias : "";
    keys.push("`"+(table.tableName)+"`"+asString);
  }

  if (Object.keys(keys).length) {
    query += "\nFROM " + keys.join();
  }

  return query;
};

mysql.prototype.buildGroup = function(queryOptions) {
  var query = "";

  var keys = [];
  var fields = queryOptions.group;
  for (var i in fields) {
    var field = fields[i];
    var key = "`"+(field.table.alias || field.table.tableName)+"`."+field.fieldName;
    keys.push(key);
  }

  if (Object.keys(keys).length) {
    query += "\nGROUP BY " + keys.join();
  }

  return query;
};

mysql.prototype.buildHaving = function(queryOptions) {
  var conditions = queryOptions.having;
  var query = this.buildConditions(conditions);
  if (query) query = "\nHAVING "+query;
  return query;
};

mysql.prototype.buildJoin = function(queryOptions) {
  var joins = queryOptions.join;
  var mthis = this;
  var query = "";
  _.each(joins, function(join) {
    var obj = join.data.on ? mthis.buildConditions(join.data.on) : null;
    var asString = join.data.table.alias? " AS "+join.data.table.alias : "";
    var joinType = join.type == "join" ? "JOIN" : "LEFT JOIN";
    query += "\n"+joinType+" `"+join.data.table.tableName+"`"+asString;
    if (obj) {
      query += " ON "+obj;
    }
  });

  return query;
};

mysql.prototype.buildInsert = function(queryOptions) {
  var vals = [];
  var keys = [];
  var firstTime = true;
  _.each(queryOptions.add, function(items) {
    var val = [];
    _.each(items, function(item, key) {
      if (_.isObject(item) && item.uncheck) {
        val.push(item.value);
      } else {
        val.push(connector.escape(item));
      }
      if (firstTime) keys.push(key);
    });
    vals.push("(" + val.join() + ")");
    firstTime = false;
  });
  var query = "INSERT INTO `" + queryOptions.from[0].tableName + "`(" + keys.join() + ") VALUES " + vals.join();

  return query;
};

mysql.prototype.buildUpdate = function(queryOptions) {
  var query = "";
  var set_values = [];
  _.each(queryOptions.update, function(item, key) {
    if (_.isObject(item) && item.uncheck) {
      set_values.push(key + " = " + item.value);
    } else {
      set_values.push(key + " = " + connector.escape(item));
    }
  });
  query = "UPDATE " + queryOptions.from[0].tableName + " SET " + set_values.join();

  var joinQuery = this.buildJoin(queryOptions);
  var whereQuery = this.buildWhere(queryOptions);

  query += joinQuery + whereQuery;
  return query;
};

mysql.prototype.buildBatchUpdate = function(queryOptions) {
  var vals = [];
  var keys = [];
  var firstTime = true;
  _.each(queryOptions.batchUpdate, function(items) {
    var val = [];
    _.each(items, function(item, key) {
      if (_.isObject(item) && item.uncheck) {
        val.push(item.value);
      } else {
        val.push(connector.escape(item));
      }
      if (firstTime) keys.push(key);
    });
    vals.push("(" + val.join() + ")");
    firstTime = false;
  });
  var keyString = [];
  _.each(keys, function(key) {
    keyString.push(key + " = VALUES(" + key + ")");
  });
  var query = "INSERT INTO `" + queryOptions.from[0].tableName + "`(" + keys.join() + ") VALUES " + vals.join() + "ON DUPLICATE KEY UPDATE " + keyString.join();

  return query;
};

mysql.prototype.buildDelete = function(queryOptions) {
  query = "DELETE " + queryOptions.from[0].tableName + " FROM " + queryOptions.from[0].tableName;

  var joinQuery = this.buildJoin(queryOptions);
  var whereQuery = this.buildWhere(queryOptions);

  query += joinQuery + whereQuery;
  return query;
};

mysql.prototype.buildSelect = function(queryOptions) {
  var query = "SELECT ";
  var keys = [];
  var fields = queryOptions.select;
  for (var i in fields) {
    var field = fields[i];
    var key = this.buildFieldKeyString(field);
    keys.push(key);
  }
  if (keys.length) query += " " + keys.join() + " ";
  else query += " * ";

  var fromQuery = this.buildFrom(queryOptions);
  var joinQuery = this.buildJoin(queryOptions);
  var whereQuery = this.buildWhere(queryOptions);
  var groupQuery = this.buildGroup(queryOptions);
  var havingQuery = this.buildHaving(queryOptions);

  query += fromQuery + joinQuery + whereQuery + groupQuery + havingQuery;

  return query;
};

mysql.prototype.buildFunction = function(field) {
  var data = "";
  var function_data = field.queryOptions.function;
  switch (function_data.type) {
    case "max":
      data = "MAX("+field.table.tableName+"."+field.fieldName+")";
      break;
    case "min":
      data = "MIN("+field.table.tableName+"."+field.fieldName+")";
      break;
    case "count":
      data = "COUNT("+field.table.tableName+"."+field.fieldName+")";
      break;
    case "sum":
      data = "SUM("+field.table.tableName+"."+field.fieldName+")";
      break;
  }
  return data;
};

mysql.prototype.buildFieldKeyString = function(field) {
  var key = "";
  if (field.queryOptions && field.queryOptions.function) {
    key = this.buildFunction(field);
  } else {
    key = "`"+(field.table.alias || field.table.tableName)+"`."+field.fieldName;
  }
  if (field.alias) key += " `"+field.alias+"`";
  return key;
};

mysql.prototype.build_query = function(queryOptions, options) {
  var query = "";
  switch (queryOptions.type) {
    case "delete":
      query = this.buildDelete(queryOptions);
      break;
    case "batchUpdate":
      query = this.buildBatchUpdate(queryOptions);
      break;
    case "update":
      query = this.buildUpdate(queryOptions);
      break;
    case "add":
      query = this.buildInsert(queryOptions);
      break;
    case "select":
      query = this.buildSelect(queryOptions);
      break;
  }
  this.executeQuery(query, options);
};

mysql.prototype.close = function() {
  this.connection.end();
};