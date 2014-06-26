var dao = require("./lib/dao");
var _ = require("lodash");
var fs = require('fs');
var Base = require("./base");
var dataType = require("./lib/dataType");

function mydb(database, username, password, options) {
  this.options = _.extend({
    database: database,
    username: username,
    password: password,
    dialect: 'mysql',
    host: 'localhost',
    port: 3306,
    define: {},
    logging: console.log
  }, options || {});

  if (this.options.logging === true) {
    this.options.logging = console.log;
  }

  if (!_.isFunction(this.options.logging)) {
    this.options.logging = function() {};
  }

  this.tables = {};

  var connector = require("./lib/dialect/" + this.options.dialect);
  this.connector = new connector(this.options);

  this.Model = dao;
  this.Model.mydb = this;
}

_.extend(mydb, dataType);

_.extend(mydb.prototype, Base, {

  define: function(name, options) {
    if (!options) options = {};

    options.validation = _.extend({}, this.options.validation, options.validation);
    options.validationErrors = _.extend({}, this.options.validationErrors, options.validationErrors);
    options = _.extend({}, this.options.define, options);
    options.mydb = this;

    var model = options.model || this.model || dao;
    delete options.model;

    this.tables[name] = model.extend(options);

    return this.tables[name];
  },

  close: function() {
    this.connector.close();
  },

  executeQuery: function(query, options) {
    this.connector.executeQuery(query, options);
  }

});

module.exports = mydb;