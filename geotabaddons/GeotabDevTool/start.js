var express = require("express"),
	basic = require("./_dev/server/basicRoute.js"),
	addins = require("./_dev/server/addinsRoute.js"),
	pages = require("./_dev/server/pagesRoute.js"),
	open = require("./_dev/server/open.js"),
	app = express();
 
app.use("/", express.static(__dirname + "/_dev/static"));
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

app.use("/", basic);
app.use("/addins", addins);
app.use("/pages", pages);
 
app.listen(3000);

open("http://127.0.0.1:3000");