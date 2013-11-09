var	daoField = require("./daoField");
var model = require("./model");
var _ = require("underscore");
var parent = require("../base");

function dao(connector, name, attributes, options) {
	this.table_name = name;
	this.options = options || {};
	this.fields = [];
	this.connector = connector;

	//deleted
	if (this.options.paranoid) {
		if (!_.isString(this.options.paranoid)) this.options.paranoid = "deleted_at"
		attributes[this.options.paranoid] = {type: this.DATE, key: "index", canBeNull: true};
	}

	//timestamps
	if (this.options.timestamps) {
		var timestamps = {
			updated_at: "updated_at",
			created_at: "created_at"
		};
		if (_.isObject(this.options.timestamps)) {
			timestamps.updated_at = this.options.timestamps.updated_at || timestamps.updated_at;
			timestamps.created_at = this.options.timestamps.created_at || timestamps.created_at;
		} else if (_.isArray(this.options.timestamps)) {
			timestamps.updated_at = this.options.timestamps[0] || timestamps.updated_at;
			timestamps.created_at = this.options.timestamps[1] || timestamps.created_at;
		}
		this.options.timestamps = timestamps;
		attributes[timestamps.updated_at] = {type: this.DATE};
		attributes[timestamps.created_at] = {type: this.DATE};
	}

	//table association
	this.relations = [];

	attributes.id = {type: this.INTEGER, key: "primary", auto_increment: true};

	for (var attr in attributes) {
		if (attributes[attr].key == "primary") this.primary = attr;
		this.add_fields(attr, attributes[attr]);
	}
}

require('util').inherits(dao, parent);

dao.prototype.type_name = "dao";

dao.prototype.new = function(data) {
	return new model(this);
};

dao.prototype.add_fields = function(field_name, attrs) {
	this["_"+field_name] = new daoField(this, field_name, attrs);
	this.fields.push(this["_"+field_name]);
	return this["_"+field_name];
};

dao.prototype.belongs_to = function(field, name) {
	var aField = this.add_fields(name, {type: field.properties.type, key: "index"});
	this.relations.push({linked_to: {table: field.table, field: field}, field: aField});
	field.table.relations.push({linked_to: {table: this, field: aField}, field: field});
};

dao.prototype.cloning = function() {
	if (!this.cloned) {
		var clone = _.clone(this);
		clone.cloned = true;
		clone.query_options = {
			data: []
		}
	} else {
		var clone = this;
	}
	return clone;
};

dao.prototype.alias = function(alias) {
	var clone = this.cloning();
	clone.fake_name = alias
	_.each(clone.fields, function(field) {
		field.table = clone;
	});
	return clone;
};

dao.prototype.on = function(data) {
	var clone = this.cloning();
	if (data instanceof dao) {
		var related = _.find(clone.relations, function(rel) {
			return rel.linked_to.table.table_name == data.table_name;
		});
		if (related) {
			data = related.field.equals(related.linked_to.field);
		}

	}
	return {table: clone, data: data};
};

dao.prototype.build_join = function(arg, type) {
	var clone = this.cloning();
	clone.query_options.join = clone.query_options.join || [];
	var verif = true;
	var arg2 = null;
	if (!arg.data) {
		verif = false;
		var related = _.find(clone.relations, function(rel) {
			if (rel.linked_to.table.table_name == arg.table_name) return true;
			else if (rel.linked_to.table.options.linkTable) {
				var rel = _.find(rel.linked_to.table.relations, function(rel) {
					return rel.linked_to.table.table_name == arg.table_name;
				});
				if (rel) return true;
			}
			return false;
		});
		if (related) {
			verif = true;
			var linked_relation = null;
			if (related.linked_to.table.options.linkTable) {
				linked_relation = _.find(related.linked_to.table.relations, function(rel) {
					return rel.linked_to.table.table_name == arg.table_name;
				});
			}
			if (linked_relation) arg2 = linked_relation.linked_to.table.on(linked_relation.linked_to.field.equals(linked_relation.field));
			arg = related.linked_to.table.on(related.linked_to.field.equals(related.field));
		} else {
			var related = null;
			var linkedTable = null;
			_.each(clone.query_options.join, function(join) {
				related = _.find(arg.relations, function(rel) {
					if (rel.linked_to.table.table_name == join.data.table.table_name) return true;
					else if (rel.linked_to.table.options.linkTable) {
						var rel = _.find(rel.linked_to.table.relations, function(rel) {
							return rel.linked_to.table.table_name == join.data.table.table_name;
						});
						if (rel) return true;
					}
					return false;
				});
				if (related) {
					linkedTables = join.data.table.relations;
				}
			});
			if (related) {
				verif = true;
				var linked_relation = null;
				if (related.linked_to.table.options.linkTable) {
					var new_related = _.find(linkedTables, function(rel) {
						return rel.linked_to.table.table_name == related.linked_to.table.table_name;
					});
				}
				if (new_related) {
					arg2 = related.field.table.on(related.linked_to.field.equals(related.field));
					arg = new_related.linked_to.field.table.on(new_related.field.equals(new_related.linked_to.field));
				} else arg = related.field.table.on(related.field.equals(related.linked_to.field));
			}
		}
	}
	if (verif) {
		clone.query_options.join.push({
			type: type, 
			data: arg
		});
		if (arg2) {
			clone.query_options.join.push({
				type: type, 
				data: arg2
			});
		}
	}
};

dao.prototype.join = function() {
	var clone = this.cloning();
	var args = _.values(arguments);
	_.each(args, function(arg) {
		clone.build_join(arg, "JOIN");
	});
	return clone;
};

dao.prototype.left_join = function() {
	var clone = this.cloning();
	var args = _.values(arguments);
	_.each(args, function(arg) {
		clone.build_join(arg, "LEFT JOIN");
	});
	return clone;
};

dao.prototype.insert = function(datas) {
	var clone = this.cloning();
	clone.query_options.type = "insert";
	if (!_.isArray(datas)) datas = [datas];
	var extra_values = {};
	if (clone.options.timestamps) {
		if (clone.options.timestamps.updated_at) extra_values[clone.options.timestamps.updated_at] = this.custom("now()");
		if (clone.options.timestamps.created_at) extra_values[clone.options.timestamps.created_at] = this.custom("now()");
	}
	var values = [];
	var keys = _.pluck(clone.fields, "field_name");
	_.each(datas, function(data) {
		var val = {};
		var tmpValues = _.extend(data, extra_values);
		_.each(keys, function(key) {
			val[key] = tmpValues[key] || null;
		});
		values.push(val);
	});
	clone.query_options.insert = values;
	return clone;
};

dao.prototype.update = function(datas) {
	var clone = this.cloning();
	clone.query_options.type = "update";
	if (!_.isArray(datas)) datas = [datas];
	var extra_values = {};
	if (clone.options.timestamps && clone.options.timestamps.updated_at) {
		_.each(datas, function(data, i) {
			datas[i][clone.options.timestamps.updated_at] = clone.custom("now()");
		});
	}
	clone.query_options.update = datas;
	return clone;
};

dao.prototype.select = function() {
	var clone = this.cloning();
	clone.query_options.type = "select";
	if (!clone.query_options.select) clone.query_options.select = [];
	clone.query_options.select = clone.query_options.select.concat(_.values(arguments));
	return clone;
};

dao.prototype.from = function() {
	var clone = this.cloning();
	clone.query_options.from = _.values(arguments);
	return clone;
};

dao.prototype.where = function(data) {
	var clone = this.cloning();
	clone.query_options.where = data.query_options;
	return clone;
};

dao.prototype.having = function(data) {
	var clone = this.cloning();
	clone.query_options.having = data.query_options;
	return clone;
};

dao.prototype.group = function() {
	var clone = this.cloning();
	clone.query_options.group = _.values(arguments);
	return clone;
};

dao.prototype.used_name = function() {
	return this.fake_name || this.table_name;
};

dao.prototype.execute = function(options) {
	var options = options || {};
	options.type || (options.type = "flat");
	this.query_options.from = this.query_options.from || [this];

	var mthis = this;
	if (this.query_options.type == "select") {
		var isPrimaryIn = false;
		var primaryIndex = "";
		if (options.paranoid !== false) {
			var deleted = [];
			_.each(this.query_options.from, function(table) {
				if (table.options.paranoid) deleted.push(table["_"+table.options.paranoid].isNull().query_options.data[0]);
			});
			this.query_options.where = {
				data: deleted,
				subGroup: this.query_options.where,
				condition: "AND",
				switchCondition: "AND"
			};
			var mthis = this;
			_.each(this.query_options.join, function(value, i) {
				if(value.data.table.options.paranoid) {
					mthis.query_options.join[i].data.data.query_options = {
						data: value.data.table["_"+value.data.table.options.paranoid].isNull().query_options.data,
						subGroup: value.data.data.query_options,
						condition: "AND",
						switchCondition: "AND"
					};
				}
			});

		}

		if (options.type != "raw") {
			if (this.query_options.select.length == 0) {
				_.each(this.fields, function(field) {
					mthis.select(field.as((field.table.fake_name || field.table.table_name)+"."+(field.fake_name || field.field_name)));
				});
			}
			_.each(this.query_options.join, function(join) {
				var table = join.data.table;
				_.each(table.fields, function(field) {
					mthis.select(field.as((field.table.fake_name || field.table.table_name)+"."+(field.fake_name || field.field_name)));
				});
			});
		}

		_.each(this.query_options.select, function(field) {
			if (field.table && field.table.table_name == mthis.table_name && field.field_name == mthis.primary) isPrimaryIn = true;
			primaryIndex = field.fake_name;
		});
		if (!isPrimaryIn) options.type = "raw";
	}

	this.connector.build_query(this.query_options, {
		error: function(resp) {
			var callback = options.error || options.done
			if (callback) callback(resp);
		},
		success: function(resp) {
			var callback = options.success || options.done
			if (!callback) return false;
			if (_.contains(["insert", "update", "delete"], mthis.query_options.type)) return callback(resp);
			if (options.type == "raw") return callback(resp);

			var joined = _.clone(mthis.query_options.join);
			var modelType = {
				name: mthis.used_name(),
				id: mthis.primary,
				tableKey: mthis.used_name()+"."+mthis.primary,
				table: mthis,
				relation: {}
			};
			var addToModelType = function(model) {
				_.each(joined, function(value, key) {
					var relation = _.find(model.table.relations, function(rel) {
						return rel.linked_to.table.table_name == value.data.table.table_name;
					});
					if (relation) {
						var table = value.data.table;
						var newModel = {
							name: table.used_name(),
							id: table.primary,
							tableKey: table.used_name()+"."+table.primary,
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
						var item = item.relation[Object.keys(item.relation)[0]];
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
			var fields_table = {};
			_.each(mthis.query_options.select, function(field) {
				if (field.table) fields_table[field.fake_name || field.field_name] = field.table.table_name;
				else fields_table[field.fake_name] = "other";
			});
			var models = options.type == "flat"? [] : {};
			_.each(resp, function(data) {
				var attrs = {};
				_.each(data, function(value, key) {
					var pos = key.indexOf(".");
					var field_name = pos !== -1 ? key.slice(pos+1) : key;
					var table_name = pos !== -1 ? key.substring(0, pos) : fields_table[key];
					if (!attrs[table_name]) attrs[table_name] = {};
					attrs[table_name][field_name] = value;
				});
				if (options.type == "tree") {
					var tableKey = data[mthis.used_name()+"."+mthis.primary];
					var key = attrs[mthis.used_name()][mthis.primary];
					if (!models[key]) {
						models[key] = {
							attributes: attrs[mthis.used_name()],
							relation: {}
						};
					}
					addToModel(attrs, models[key], modelType);
				} else if (options.type == "flat") {
					models.push(attrs);
				}
			});
			callback(models);
		}
	});
};

module.exports = dao;