var _ = require("underscore");

module.exports = {
	STRING: 'STRING',
	TEXT: 'TEXT',
	INTEGER: 'INTEGER',
	BIGINT:  'BIGINT',
	DATE: 'DATE',
	BOOLEAN: 'BOOLEAN',
	FLOAT: 'FLOAT',
	ENUM: function() {
		return {type: "ENUM", values: _.values(arguments)};
	}
};