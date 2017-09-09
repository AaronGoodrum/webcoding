module.exports = (function(){
	var express = require('express'),
		router = express.Router(),
		Promise = require("bluebird"),
		fs = require("fs"),
		errorHandler = function(res, hash){
			return function(error){
				res.status(500).send("Error " + (error.message || error) + " in loading Add-In: " + hash);
			};
		},
		pagePath = __dirname + "/../static/pages/";
	
	Promise.promisifyAll(fs); 
	router.get("/:page", function (req, res) {
		var page = req.params.page,
			handler = errorHandler(res, page);
	
			return fs.readFileAsync(pagePath + page + "/" + page + ".html", "utf8") 
				.then(function(text){
					res.set('Content-Type', 'text/plain').send(text);
				}, handler);
	});	
	
	router.use("/", express.static(__dirname + "/../static/pages"));
	return router;
})();