module.exports = function(path){
    var exec = require('child_process').exec,
        platformToOpener = {
            "darwin": "open {{path}}",
            "win32": "start {{path}}",
            "def": "xdg-open {{path}}" 
        },
        open = function(){
            return platformToOpener[process.platform] || platformToOpener.def; 
        },
        command = open(), 
        child;

    if (process.env.SUDO_USER) {
        command = 'sudo -u ' + process.env.SUDO_USER + ' ' + command;
    }
  
    try {
        child = exec(command.replace("{{path}}", path));
    } catch(e){
        child.kill();
    }
}