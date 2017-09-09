module.exports = (function(){
	var express = require('express'),
		basic = express.Router(),
		Promise = require("bluebird"),
		pathObj = require("path"),
		addin = require("./addin.js"),
		fs = require("fs"),
		PLACEHOLDER = "{{links}}",
		defaultLink = [{
			name: "Documentation",
			hash: "docs"
		}],
		linkTemplate = fs.readFileSync(__dirname + "/templates/link.html", "utf8"),
		linkReg = /\{\{link\}\}/ig,
		nameReg = /\{\{name\}\}/ig,
		getFolders = function(name){
			return !pathObj.extname(name);
		},
		generateLinks = function(links){
			return defaultLink.concat(links).map(function(obj){
				return linkTemplate.replace(linkReg, obj.hash).replace(nameReg, obj.name);
			}).join("");	
		},
		errorHandler = function(res){
			return function(error){
				res.status(500).send("Error: " + (error.message || error));
			};
		};
	
	Promise.promisifyAll(fs); 
	basic.get("/", function (req, res) {
		var handler = errorHandler(res);
	
		Promise.all([
			fs.readFileAsync(__dirname + "/../index.html", "utf8"),
			fs.readdirAsync(__dirname + "/../../addins")
				.then(function(data){
					return Promise.all(data.filter(getFolders).map(function(path){
						return addin(path).getConfig();
					}));
				}) 
				.then(generateLinks)
				.catch(function(){
					throw new Error("'Add-Ins' folder missed. Could you add it to the root directory. Thanks.");
				}) 
		])
		.then(function(data){
			var scriptLink = data[1],
				html = data[0];

			res.send(html.replace(PLACEHOLDER, scriptLink)); 
		})
		.catch(handler);
	});	
	
	return basic;
})();