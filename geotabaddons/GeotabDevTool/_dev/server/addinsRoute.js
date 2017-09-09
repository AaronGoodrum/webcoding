module.exports = (function(){
	var express = require('express'),
		router = express.Router(),
		addin = require("./addin.js"),
		Promise = require("bluebird"),
		fs = require("fs"),
		errorHandler = function(res, hash){
			return function(error){
				res.status(500).send("Error " + (error.message || error) + " in loading Add-In: " + hash + ". Check path to main HTML file of your Add-In in configuration.json.");
			};
		};
	
	Promise.promisifyAll(fs); 
	router.get("/:hash", function (req, res) {
		var hash = req.params.hash,
			handler = errorHandler(res, hash);
	
		addin(hash).getMainFile()
			.then(function(path){
				return fs.readFileAsync(path, "utf8"); 
			})
			.then(function(text){
				res.set('Content-Type', 'text/plain').send(text);
			})
			.catch(handler);
	});	
	
	router.use("/", express.static(__dirname + "/../../addins"));
	return router;
})();