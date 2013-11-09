module.exports = mysql;

var connector = require("mysql");
var _ = require("underscore");

function mysql(config) {
	this.connection = connector.createConnection(config);
	this.connection.connect();
};

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
}

mysql.prototype.execute_query = function(query, options) {
	var options = options || {};
	var text = query.text || query;
	var values = query.values || [];
	console.log(text);
	this.connection.query(text, values, function(err, results) {
		if (err && options.error) options.error(err);
		if (!err && options.success) options.success(results);
	});
};

mysql.prototype.drop_table = function(table) {
	return this.execute_query("DROP TABLE IF EXISTS `"+table.table_name+"`");
};

mysql.prototype.create_table = function(table) {
	var fields = [];
	var keys = [];
	for (var key in table.fields) {
		var field = table.fields[key];
		var type = _.isString(field.properties.type) ? fieldTypes[field.properties.type] : fieldTypes[field.properties.type.type](field.properties.type.values);
		var string = field.field_name + " " + type;

		if (field.properties.canBeNull) string += " NULL";
		else string += " NOT NULL";

		if (field.properties.auto_increment) string += " AUTO_INCREMENT";

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
		fields.push(keyType + "KEY`" + keys[i].field_name + "` (`" + keys[i].field_name + "`)");
	}

	var query = "CREATE TABLE `"+table.table_name+"` ( "+fields.join()+" )";

	return this.execute_query(query);
};

mysql.prototype.build_single_condition = function(data) {
	var query = {
		text: "",
		values: []
	};
	var string = "?";
	if (_.isArray(data.value)) {
		var array = [];
		_.each(data.value, function(val) {
			array.push("?");
			query.values.push(val);
		});
		string = "("+array.join(',')+")";
	} else if (_.isObject(data.value)) {
		string = this.build_field_key_string(data.value);
	} else {
		if (data.value) query.values = data.value;
		else string = "";
	}
	query.text = this.build_field_key_string(data.field)+" "+data.method+" "+string;
	return query;
};

mysql.prototype.build_conditions = function(query_options) {
	var query = {
		text: "",
		values: []
	};
	if (query_options) {
		var mthis = this;
		var keys = [];
		_.each(query_options.data, function(data) {
			var res = mthis.build_single_condition(data);
			query.values.push(res.values);
			keys.push(res.text);
		});
		query.text = keys.join(" "+query_options.condition+" ");
		if (query_options.subGroup) {
			var res = this.build_conditions(query_options.subGroup);
			query.values.push(res.values);
			query.text = "("+query.text+") "+query_options.switchCondition+" ("+res.text+")";
		}
	}
	return query;
};

mysql.prototype.build_where = function(query_options) {
	var conditions = query_options.where;
	var query = this.build_conditions(conditions);
	if (query.text) query.text = "\nWHERE "+query.text;

	return query;
};

mysql.prototype.build_from = function(query_options) {
	var query = {
		text: "",
		values: []
	};
	var keys = [];
	var tables = query_options.from;
	query_options.where = query_options.where || [];
	for (var i in tables) {
		var table = tables[i];
		var asString = table.fake_name? " AS "+table.fake_name : "";
		keys.push("`"+(table.table_name)+"`"+asString);
	}

	if (Object.keys(keys).length) {
		query.text += "\nFROM " + keys.join();
	}

	return query;
};

mysql.prototype.build_group = function(query_options) {
	var query = {
		text: "",
		values: []
	};

	var keys = [];
	var fields = query_options.group;
	for (var i in fields) {
		var field = fields[i];
		var key = "`"+(field.table.fake_name || field.table.table_name)+"`."+field.field_name;
		keys.push(key);
	}

	if (Object.keys(keys).length) {
		query.text += "\nGROUP BY " + keys.join();
	}

	return query;
};

mysql.prototype.build_having = function(query_options) {
	var conditions = query_options.having;
	var query = this.build_conditions(conditions);
	if (query.text) query.text = "\nHAVING "+query.text;
	return query;
};

mysql.prototype.build_join = function(query_options) {
	var joins = query_options.join;
	var mthis = this;
	var query = {
		text: "",
		values: []
	}
	_.each(joins, function(join) {
		var obj = mthis.build_conditions(join.data.data.query_options);
		var asString = join.data.table.fake_name? " AS "+join.data.table.fake_name : "";
		query.text += "\n"+join.type+" `"+join.data.table.table_name+"`"+asString+" ON "+obj.text;
		query.values.push(obj.values)
		query.values = _.flatten(query.values)
	});

	return query;
};

mysql.prototype.build_insert = function(query_options) {
	var vals = [];
	var values = [];
	var keys = [];
	var firstTime = true;
	_.each(query_options.insert, function(items) {
		var val = [];
		_.each(items, function(item, key) {
			if (_.isObject(item) && item.uncheck) {
				val.push(item.value);
			} else {
				val.push("?");
				values.push(item);
			}
			if (firstTime) keys.push(key);
		});
		vals.push("(" + val.join() + ")");
		firstTime = false;
	});
	var query = {
		text: "INSERT INTO `" + query_options.from[0].table_name + "`(" + keys.join() + ") VALUES " + vals.join(),
		values: values
	};
	return query;
};

mysql.prototype.build_update = function(query_options) {
	if (_.size(query_options.update) > 1) {

	} else {
		var set_values = [];
		var values = [];
		_.each(query_options.update[0], function(item, key) {
			if (_.isObject(item) && item.uncheck) {
				set_values.push(key + " = " + item.value);
			} else {
				set_values.push(key + " = ?");
				values.push(item);
			}
		});
		var query = {
			text: "UPDATE " + query_options.from[0].table_name + " SET " + set_values.join(),
			values: values
		};

		var joinQuery = this.build_join(query_options);
		var whereQuery = this.build_where(query_options);

		query.text += joinQuery.text + whereQuery.text;
		query.values.push(joinQuery.values);
		query.values.push(whereQuery.values);
		query.values = _.flatten(query.values);
	}
	return query;
};

mysql.prototype.build_function = function(field) {
	var data = "";
	var function_data = field.query_options.function;
	switch (function_data.type) {
		case "max": 
			data = "MAX("+field.table.table_name+"."+field.field_name+")";
			break;
		case "min": 
			data = "MIN("+field.table.table_name+"."+field.field_name+")";
			break;
		case "count": 
			data = "COUNT("+field.table.table_name+"."+field.field_name+")";
			break;
		case "sum": 
			data = "SUM("+field.table.table_name+"."+field.field_name+")";
			break;
	}
	return data;
};

mysql.prototype.build_field_key_string = function(field) {
	var key = "";
	if (field.query_options && field.query_options.function) {
		key = this.build_function(field);
	} else {
		key = "`"+(field.table.fake_name || field.table.table_name)+"`."+field.field_name;
	}
	if (field.fake_name) key += " `"+field.fake_name+"`";
	return key;
};

mysql.prototype.build_select = function(query_options) {
	var query = {
		text: "SELECT ",
		values: []
	};
	var keys = [];
	var fields = query_options.select;
	for (var i in fields) {
		var field = fields[i];
		var key = this.build_field_key_string(field);
		keys.push(key);
	}
	if (keys.length) query.text += " " + keys.join() + " ";
	else query.text += " * ";

	var fromQuery = this.build_from(query_options);
	var joinQuery = this.build_join(query_options);
	var whereQuery = this.build_where(query_options);
	var groupQuery = this.build_group(query_options);
	var havingQuery = this.build_having(query_options);

	query.text += fromQuery.text + joinQuery.text + whereQuery.text + groupQuery.text + havingQuery.text;
	query.values.push(fromQuery.values);
	query.values.push(joinQuery.values);
	query.values.push(whereQuery.values);
	query.values.push(groupQuery.values);
	query.values.push(havingQuery.values);
	query.values = _.flatten(query.values);

	return query;
};

mysql.prototype.build_query = function(query_options, options) {
	var query = {};
	switch (query_options.type) {
		case "update":
			var query = this.build_update(query_options);
			break;
		case "insert":
			var query = this.build_insert(query_options);
			break;
		case "select":
			var query = this.build_select(query_options);
			break;
	}
	this.execute_query(query, options);
};

mysql.prototype.close = function() {
	this.connection.end();
};

