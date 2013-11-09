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

belongs_to function will create a column "user_id" (second parameters) in "posts" table. This column will be linked with the table "users" by it primary key "id" (first parameters).

