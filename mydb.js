var dao = require("./lib/dao"),
	_ = require("underscore"),
	fs = require('fs'),
	parent = require("./base");

var mydb = function(database, username, password, options) {
	this.options = _.extend({
		dialect: 'mysql',
		host: 'localhost',
		port: 3306,
		define: {},
		logging: console.log
	}, options || {})

	if (!_.isFunction(this.options.logging)) {
		this.options.logging = function() {};
	}

	this.config = {
		database: database,
		username: username,
		password: (( (["", null, false].indexOf(password) > -1) || (typeof password == 'undefined')) ? null : password),
		host    : this.options.host,
		port    : this.options.port,
		protocol: this.options.protocol
	}

	this.tables = {};

	var connector = require("./lib/dialect/" + this.options.dialect);
	this.connector = new connector(this.config);
};

require('util').inherits(mydb, parent);

mydb.prototype.type_name = "mydb";

mydb.prototype.define = function(name, attributes, options) {
	var options = _.extend({}, this.options.define, options || {});
	return this.tables[name] = new dao(this.connector, name, attributes, options);
};

mydb.prototype.sync = function(options) {
	var options = options || {};
	for (var key in this.tables) {
		if (options.force) this.connector.drop_table(this.tables[key]);
		this.connector.create_table(this.tables[key]);
	}
};

mydb.prototype.close = function() {
	this.connector.close();
};

mydb.prototype.execute_query = function(query, options) {
	this.connector.execute_query(query, options);
};

mydb.prototype.seed = function(type) {
	type || (type = "harvest");
	var mthis = this;
	if (type === "harvest") {
		_.each(this.tables, function(table) {
			table.select().execute({
				type: "raw",
				done: function(res) {
					var seed_data = JSON.stringify(res, null, 4);
					var seed_content = "module.exports = " + seed_data + ";";
					fs.writeFileSync(mthis.options.paths.seed + '/' + table.table_name + ".js", seed_content);
				}
			});
		});
	} else {
		_.each(this.tables, function(table) {
			var seed_name = mthis.options.paths.seed + "/" + table.table_name + ".js";
			var seed_data = require(seed_name);
			if (_.size(seed_data)) {
				table.insert(seed_data).execute();
			}
		});
	}
};

module.exports = mydb;