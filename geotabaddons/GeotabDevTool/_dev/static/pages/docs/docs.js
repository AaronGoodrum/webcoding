geotab.addin.docs = function(api, page){
	var iframe = document.querySelector("iframe");
	
	return {
		initialize: function(api, page, callback){
			callback();
		},
		focus: function(){
			iframe.src = "https://docs.google.com/document/d/1ODCsb10RYnE0ghKYHqqJ73zeMAL-JtdniBDpkOiwJQ0/pub";
		},
		blur: function(){
			iframe.src = "";
		}
	}
}