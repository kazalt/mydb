#mydb.js

`mydb.js` is a Nodejs orm. Support only mysql for now.

# examples and usage:

##Initialization

```js
var Mydb = require("mydb");

var mydb = new Mydb("database", "username", "password", {
	dialect: 'mysql',
	host: 'localhost',
	port: 3306
});
```

##Table definition

```js
var users = mydb.define("users", {
	user_id: {type: mydb.INTEGER, key: "primary", auto_increment: true},
	username: {type: mydb.STRING},
	password: {type: mydb.STRING},
	active: {type: mydb.BOOLEAN}
});
```

the first parameters is the table name, the second is an object of each column.
If you don't specify any primary key (in this exemple "user_id"), mydb will create one by default and name it "id".
For each column, you must specify at least the type (STRING, TEXT, INTEGER, BIGINT, DATE, BOOLEAN, FLOAT, ENUM).

##Table option

A second object can be passed when you define a table.

```js
var users = mydb.define("users", {
	user_id: {type: mydb.INTEGER, key: "primary", auto_increment: true},
	username: {type: mydb.STRING},
	password: {type: mydb.STRING},
	active: {type: mydb.BOOLEAN}
}, {
	timestamp: true,
	paranoid: true
});
```

Two different options exist: timestamp and paranoid. 
If timestamp is true, by default the table will have two field, one named "updated_at" and the other "created_at". 
By passing an object or an array, you'll have the possibility to rename those fields.
If paranoid is true, by default the table will have one more field named "deleted_at", you can rename it by passing a string instead.

Those options can be general for all tables. Simply add them into the "define" option of mydb.

```js
var mydb = new Mydb("database", "username", "password", {
	dialect: 'mysql',
	host: 'localhost',
	port: 3306,
	define: {
		timestamp: {updated_at: "updatedAt", created_at: "createdAt"},
		paranoid: "deletedAt"
	}
});
```

##Table relations
```js
var users = mydb.define("users", {
	username: {type: mydb.STRING},
	password: {type: mydb.STRING},
	active: {type: mydb.BOOLEAN}
});

var posts = mydb.define("posts", {
	title: {type: mydb.STRING},
	text: {type: mydb.TEXT}
});

posts.belongs_to(users._id, "user_id");
```

belongs_to function will create a column "user_id" (second parameters) in "posts" table. 
This column will be linked with the table "users" by it primary key "id" (first parameters).

##Finding items

```js
users.select(users._id).where(users._username.equals("my_username").and(users._active.equals(1))).execute({
	success: function(res) {

	}
});
```

##Finding with relations

```js
posts.select().join(users).where(users._active.equals(1)).execute({
	success: function(res) {

	}
})
```


