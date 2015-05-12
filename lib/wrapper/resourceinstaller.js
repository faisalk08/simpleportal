var util =require('./../util');
var fs =require('fs');
/**
 * To install or download files from a remote location
 * @todo Need to implement security 
 * 
 * @class Resource installer
 */
module.exports = ResourceInstaller = function(options){
	var instance = this;
	
	/**
	 * @property options
	 * @type object 
	 */
	instance.options = instance.options=util.extendJSON({}, ResourceInstaller.OPTIONS);
	
	if(options)
		instance.options=util.extendJSON(instance.options, options);
	
	if(!instance.options.resourcefolder || !instance.options.resourcename || !instance.options.downloadlink)
		throw Error('Not a valid resource configuration');
	
	if(!instance.options.downloaddir)
		instance.options.downloaddir=instance.options.resourcefolder;
	
	if(!instance.options.resourcebundle)
		instance.options.resourcebundle=instance.options.resourcename + '.tar.gz';
	
	if(!instance.options.bundlefile)
		instance.options.bundlefile=instance.options.downloaddir + '/' + instance.options.resourcebundle;
	
	if(!instance.options.bundledir)
		instance.options.bundledir=instance.options.resourcefolder + '/' + instance.options.resourcename;

	/**
	 * @property installed
	 * @type boolean
	 */
	instance.installed=false;
	
	/**
	 * @property downloaded
	 * @type boolean
	 */
	instance.downloaded=false;
}
/**
 * @property OPTIONS
 * @type object
 * @static
 * @final 
 */
ResourceInstaller.OPTIONS={};

/**
 * @method check
 */
ResourceInstaller.prototype.check=function(callback){
	var instance = this;
	
	if(fs.existsSync(instance.options.bundledir))
		instance.installed=true;
	
	if(fs.existsSync(instance.options.bundlefile))
		instance.downloaded=true;
	
	if(callback)
		callback();
}

/**
 * To download the resource from a remote server
 * 
 * @method download
 * @param callback 
 */
ResourceInstaller.prototype.download=function(callback){
	var instance = this;
	
	if(!instance.downloaded){
		util.checkDirSync(instance.options.downloaddir);
		
		util.downloadFile(instance.options.downloadlink, instance.options.bundlefile, function(error, data){
			if(!error && fs.existsSync(instance.options.bundlefile)){
				callback();
			}else{
				console.log(error);
				callback(error);
			}
		});
	}else
		callback();
}

/**
 * To install the resource from the bundle file or download link
 * 
 * @method install
 */
ResourceInstaller.prototype.install=function(callback){
	var instance = this;
	
	instance.check();
	
	if(!instance.installed){
		instance.download(function(error){
			if(!error)
				instance.unzip(callback);
			else
				callback(error);
		})
	}else
		callback();
}

/**
 * To unzip the bundle file from the server
 * 
 * @method unzip
 */
ResourceInstaller.prototype.unzip=function(callback){
	var instance = this;
	
	var tarfoldername = instance.options.resourcebundle.replace('.tar.gz', '');
	
	util.checkDirSync(instance.options.bundledir);
	
	var commandtoexecute = 'cd ' + instance.options.downloaddir + ' && tar -xf '+ instance.options.resourcebundle + '* -C '+instance.options.resourcename + ' --strip-components=1';
	
	var exec = require('child_process').exec;
	
	exec(commandtoexecute, function (error, stderr, stdout) {
		if(error)
			console.log(error);
		
		callback(error, stderr, stdout)
	});
}