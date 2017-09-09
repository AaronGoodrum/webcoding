module.exports = (function(){
	var hash = {},
		Promise = require("bluebird"),
		pathUnit = require("path"),
		fs = require("fs"),
		toConfig = function(hash, path, conf){
			var item = conf && conf.items ? (conf.items[0] || {}) : {} 
			
			return {
				url: item.url ? pathUnit.join(path, item.url) : (path + "index.html"), 
				name: conf ? conf.name : hash, 
				hash: hash
			}
		},
		createAddin = function(addinFolder){
			var path = pathUnit.join(__dirname, "/../../addins/", addinFolder, "/"),
				reloadConfig = function(path){
					return fs.readFileAsync(path + "configuration.json", "utf8")
						.catch(function(){
							return JSON.stringify(toConfig(addinFolder, path));
						})
						.then(function(text){ 
							var obj;
							
							try {
								obj = JSON.parse(text)
							} catch(e){
								throw new Error("Add-In's json is invalid")
							}
							
							return toConfig(addinFolder, path, obj);
						});	
				},
				config, self, lastModified;
			
			return self = {
				getConfig: function(){
					return fs.statAsync(path + "configuration.json")
						.catch(function(){
							return {
								mtime: new Date(1960, 1, 1)
							};
						})
						.then(function(stat){
							if (!lastModified || lastModified.getTime() !== stat.mtime.getTime()){
								lastModified = stat.mtime;
								config = reloadConfig(path);
							}
							
							return config;
						});
				},
				getHash: function(){
					return addinFolder;
				},
				getMainFile: function(){
					return self.getConfig()
						.then(function(json){
							return json.url || path + "index.html";
						});
				}
			}; 	
		};
	
	Promise.promisifyAll(fs);
	return function(addinFolder){
		hash[addinFolder] = hash[addinFolder] || createAddin(addinFolder); 
		return hash[addinFolder];
	};
})();