"use strict";
var util =require('./../util'),
	fs =require('fs');

/**
 * To install or download files from a remote location
 * @todo Need to implement security 
 * 
 * @class Resource installer
 */
var ResourceInstaller = module.exports = function(options){
	var instance = this;
	
	/**
	 * @property options
	 * @type object 
	 */
	instance.options = util.extendJSON({}, ResourceInstaller.OPTIONS, options);
	
	if (!instance.options.downloaddir) {
		instance.options.downloaddir = instance.options.resourcefolder;
	} else if(!instance.options.resourceroot && instance.options.downloaddir)
		instance.options.resourceroot = instance.options.downloaddir;
	
	if(!instance.options.resourcebundle 
		&& instance.options.fileextension_reg 
		&& !(
			new RegExp(instance.options.zipextension_reg).test(instance.options.resourcename) ||
			new RegExp(instance.options.zipextension_reg).test(instance.options.downloadlink)
		)
	){
		instance.options.resourcebundle=instance.options.resourcename;
		instance.options.isfile=true;
		
		// get the file extension as well 
		if(instance.options.downloadlink && (!instance.options.resourcename || instance.options.resourcename.indexOf(".") == -1)){
			instance.options.resourcebundle = util.getResourceFromUrl(instance.options.downloadlink);
			
			if(instance.options.resourcename && instance.options.resourcename.indexOf(".") == -1){
				instance.options.resourcename = instance.options.resourcename + util.getExtension(instance.options.resourcebundle);
			} else if(!instance.options.resourcename)
				instance.options.resourcename = instance.options.resourcebundle;
		}	
	}	

	if(!instance.options.resourcefolder || !instance.options.resourcename || !(instance.options.downloadlink||instance.options.resourcebundle)){
		throw Error('Not a valid resource configuration');
	}
		
	if(!instance.options.resourcebundle)
		instance.options.resourcebundle=instance.options.resourcename + instance.options.fileextension;
	
	if(!instance.options.bundlefile)
		instance.options.bundlefile=instance.options.downloaddir + '/' + instance.options.resourcebundle;
	
	if(!instance.options.destdir)
		if(instance.options.isfile)
			instance.options.destdir=instance.options.resourcefolder;
		else
			instance.options.destdir=util.appendFilePath(instance.options.resourcefolder, instance.options.resourcename);

	if(instance.options.resourceroot && instance.options.resourcefolder.indexOf("/") != 0)
		if(instance.options.isfile)
			instance.options.destdir = util.appendFilePath(instance.options.resourceroot, instance.options.resourcefolder);
		else	
			instance.options.destdir = util.appendFilePath(instance.options.resourceroot, instance.options.resourcefolder, instance.options.resourcename);
		
	// resourcefile
	if(instance.options.isfile)
		instance.options.installedpath = instance.options.destdir + '/' + instance.options.resourcename;
	else
		instance.options.installedpath = instance.options.destdir;
	
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
ResourceInstaller.OPTIONS = {
	isfile:false,
	zipextension_reg:"\.(tar\.gz|zip)$",
	fileextension_reg:"\.(html|js|css|json)$",
	fileextension:'.tar.gz'
};

/**
 * @method check
 */
ResourceInstaller.prototype.check=function(callback){
	var instance = this;
	
	if(instance.options.isfile){
		if(fs.existsSync(instance.options.installedpath))
			instance.installed=true;
	}else {
		if(fs.existsSync(instance.options.installedpath))
			instance.installed=true;
	}

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
	
	if(!instance.downloaded && instance.options.downloadlink){
		util.checkDirSync(instance.options.downloaddir);
		
		util.downloadFile(instance.options.downloadlink, instance.options.bundlefile, function(error, data){
			if(!error && fs.existsSync(instance.options.bundlefile)){
				instance.check(callback);
			}else{
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
		});
	}else
		callback(null, {display:instance.options.resourcename, file:instance.options.installedpath});
}

/**
 * To unzip the bundle file from the server
 * 
 * @method unzip
 */
ResourceInstaller.prototype.unzip=function(callback){
	var instance = this,
		stripecomponentcount=0;
		
	if(instance.options.isfile){
		if(instance.options.destdir)
			util.checkDirSync(instance.options.destdir);
		
		if(!fs.existsSync(instance.options.installedpath)){
			fs.rename(instance.options.bundlefile, instance.options.installedpath, function(){
				callback(null, {display:instance.options.resourcename, file:instance.options.installedpath});	
			});
//			var fileIn = fs.createReadStream(instance.options.bundlefile);
//			
//			fileIn.pipe(fs.createWriteStream(instance.options.installedpath));
//			fileIn.on("end", function(){
//				// may be we need to unlink the file 
//				fs.unlink(instance.options.bundlefile, function(){
//					callback(null, {display:instance.options.resourcename, file:instance.options.installedpath});	
//				});
//			});	
		}else
			callback(null, {display:instance.options.resourcename, file:instance.options.installedpath});
	} else {
		var tarfoldername = instance.options.resourcebundle.replace('.tar.gz', '').replace(new RegExp(instance.options.zipextension_reg), "");
		
		util.checkDirSync(instance.options.destdir);
		
//		var commandtoexecute = 'tar -xvf '+ instance.options.resourcebundle + '* -C '+instance.options.destdir;
		if(instance.options.resourcefolder && instance.options.resourcename)stripecomponentcount=1;
//			commandtoexecute = 'cd ' + downloaddir + ' && tar -xf '+ instance.options.resourcebundle + '* -C '+ instance.options.destdir;
		var commandtoexecute = 'cd ' + instance.options.downloaddir + ' && tar -xvf '+ instance.options.resourcebundle + '* -C '+instance.options.destdir;
//		if(stripecomponentcount > 0)
//			commandtoexecute += ' --strip-components=1';
		
		var exec = require('child_process').exec;
		console.log(commandtoexecute);
		exec(commandtoexecute, function (error, stderr, stdout) {
			if(error)
				console.log(error);
			
			callback(error, stderr, stdout)
		});
	}
}

var unzip = function(downloaddir, resourcebundle, destfile, callback){
	if(!fs.existsSync(downloaddir))
		throw new Error("No directory found - " + downloaddir);
//	console.log(arguments);
	
	if(resourcebundle.indexOf("/") != 0 ){
		resourcebundle = util.appendFilePath(downloaddir, resourcebundle);
	}
	
//	destfile = util.appendFilePath(downloaddir, destfile);
	util.checkDirSync(util.appendFilePath(downloaddir, destfile));
	
	var commandtoexecute = 'tar -xf '+ resourcebundle + ' -C '+ destfile + ' --strip-components=0';
	if(destfile.indexOf(downloaddir) == -1)
//		commandtoexecute = 'cd ' + downloaddir + ' && tar -xf '+ resourcebundle + ' -C '+ destfile + ' --strip-components=0';
		commandtoexecute = 'cd ' + downloaddir + ' && tar -xf '+ resourcebundle + ' -C '+ destfile + ' --strip-components=1';
	
	var exec = require('child_process').exec;
	var callbackoptions = {downloaddir:downloaddir, resourcebundle:resourcebundle, destfile:util.appendFilePath(downloaddir, destfile)};

//	console.log("Running os command - " + commandtoexecute);
	
	exec(commandtoexecute, function (error, stderr, stdout) {
		if(error)
			console.error(error);
		
		callbackoptions.stderr = stderr;
		callbackoptions.stdout = stdout;
		
		if(callback)callback(error, callbackoptions)
	});
}

ResourceInstaller.unzipFile = unzip;