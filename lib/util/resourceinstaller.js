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
	
	if(instance.options.downloadlink){
		if(instance.options.downloadlink.indexOf(".tar.gz") != -1)
			instance.options.fileextension = '.tar.gz';
		else
			instance.options.fileextension = util.getExtension(instance.options.downloadlink);
	}
	
	if(!instance.options.resourcebundle) {
		if(instance.options.downloadlink)
			instance.options.resourcebundle=util.generateId(instance.options.downloadlink) + '-' + instance.options.resourcename + instance.options.fileextension;
		else
			instance.options.resourcebundle=instance.options.resourcename + instance.options.fileextension;
	}
	
	if(!instance.options.bundlefile){
		instance.options.bundlefile=instance.options.downloaddir + '/' + instance.options.resourcebundle;
	}
	
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
		if(instance.options.installedpath && fs.existsSync(instance.options.installedpath))
			instance.installed=true;
	}else {
		if(instance.options.installedpath && fs.existsSync(instance.options.installedpath))
			instance.installed=true;
	}

	if(fs.existsSync(instance.options.bundlefile)){
		instance.downloaded=true;
	}

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
	
	if(instance.options.downloadlink && instance.downloaded){
		instance.downloaded=false;
		
		installerQue.deleteFile(instance.options.bundlefile);
//		fs.unlinkSync(instance.options.bundlefile);
	}		
	
	if(!instance.downloaded && instance.options.downloadlink){
		util.checkDirSync(instance.options.downloaddir);
		
		// will use que to download the file as it is breaking some of the files when in between the files get removed
		installerQue.download(instance.options.downloadlink, instance.options.bundlefile, function(error, data){
			if(!error/* && fs.existsSync(instance.options.bundlefile)*/){
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
ResourceInstaller.prototype.install=function(callback, options, tarargs){
	var instance = this;
	
	instance.check();
	
	if(!instance.installed){
		instance.download(function(error){
			if(!error)
				instance.unzip(callback, options, tarargs);
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
ResourceInstaller.prototype.unzip=function(callback, options, tarargs){
	var instance = this,
		stripecomponentcount=0;
		
	if(instance.options.isfile){
		if(instance.options.destdir)
			util.checkDirSync(instance.options.destdir);
		
		if(!fs.existsSync(instance.options.installedpath)) {
//			fs.rename(instance.options.bundlefile, instance.options.installedpath, function(){
//				callback(null, {display:instance.options.resourcename, file:instance.options.installedpath});	
//			});
			installerQue.lockFile(instance.options.bundlefile);
			
			var fileIn = fs.createReadStream(instance.options.bundlefile);
			var fileOut = fs.createWriteStream(instance.options.installedpath);
			
			fileIn.pipe(fileOut);
			fileOut.on("close", function(){
				// may be we need to unlink the file
				installerQue.unLockFile(instance.options.bundlefile);
				
				if(options && options.deleteafter && fs.existsSync(instance.options.bundlefile))
					installerQue.deleteFile(instance.options.bundlefile, function(){
						callback(null, {display:instance.options.resourcename, file:instance.options.installedpath});	
					});
				else
					callback(null, {display:instance.options.resourcename, file:instance.options.installedpath});	
			});
			
		}else {
			// if(fs.existsSync(instance.options.bundlefile))
			//			fs.unlink(instance.options.bundlefile, function(){
	////				callback(null, {display:instance.options.resourcename, file:instance.options.installedpath});
	//				callback(null, {display:instance.options.resourcename, file:instance.options.installedpath});
	//			});
	//		else
			/*
			installerQue.unLockFile(instance.options.bundlefile);
			if(options && options.deleteafter && fs.existsSync(instance.options.bundlefile))
				installerQue.deleteFile(instance.options.bundlefile, function(){
	//				callback(null, {display:instance.options.resourcename, file:instance.options.installedpath});
					callback(null, {display:instance.options.resourcename, file:instance.options.installedpath});
				});
			else*/
				callback(null, {display:instance.options.resourcename, file:instance.options.installedpath});
		}
	} else {
		var tarfoldername = instance.options.resourcebundle.replace('.tar.gz', '').replace(new RegExp(instance.options.zipextension_reg), "");
		
		util.checkDirSync(instance.options.destdir);
		
		// check if it is linux us am-zip
		var isMac = /^darwin/.test(process.platform);
		if(/*!isMac || */(instance.options.resourcebundle.indexOf('.zip') != -1)){
			var AdmZip = require('adm-zip');
			var resourcebundle = instance.options.resourcebundle;
			
			if(resourcebundle.indexOf("/") == -1 ){
				resourcebundle = util.appendFilePath(instance.options.downloaddir, instance.options.resourcebundle);
			}
			var subpath;
			var zip = new AdmZip(resourcebundle);
			var zipEntries = zip.getEntries(); // an array of ZipEntry records 
			
			installerQue.lockFile(instance.options.downloaddir + '/' + instance.options.resourcebundle);

			if(zipEntries) {
				var firstEntry = zipEntries[0];
				var firstpath = firstEntry.entryName;
					firstpath = firstpath.substring(0, firstpath.indexOf("/"));
			
				var subfiles= [],
					subdirectries = [];
				var hasRootFolder = true;
//				
				zipEntries.forEach(function(item){
					var entrypatharray = item.entryName.split("/");
					if(!item.isDirectory && entrypatharray.length == 2)
						hasRootFolder = false;
					
					if(!item.isDirectory && entrypatharray.length == 2)
						subfiles.push(item);
					else if(item.isDirectory && entrypatharray.length == 3)
						subdirectries.push(item);
				});
				
				if(firstpath){
					zip.extractAllTo(instance.options.destdir +'/../', true); // extract one folder above the actual folder and rename it to the real folder.
					
					fs.rename(instance.options.destdir + '/../' + firstpath, instance.options.destdir, function (error) {
						if(!error && options && options.deleteafter)
							installerQue.deleteFile(instance.options.downloaddir + '/' + instance.options.resourcebundle);
					  
						callback(error);
					});
				}else{
					zip.extractAllTo(instance.options.destdir, true);

					if(options && options.deleteafter)
						installerQue.deleteFile(instance.options.downloaddir + '/' + instance.options.resourcebundle);
					
					callback();
				}
			}else {
				zip.extractAllTo(instance.options.destdir +'/../', true);

				if(!error && options && options.deleteafter)
					installerQue.deleteFile(instance.options.downloaddir + '/' + instance.options.resourcebundle);
				
				callback();
			}
//				callback("not a valid zip file or no data found to unzip")
		}else{
			var commandtoexecute = util.getArchiveCommand(instance.options.downloaddir, instance.options.resourcebundle, instance.options.destdir, tarargs);
			
			var exec = require('child_process').exec;
			installerQue.lockFile(instance.options.downloaddir + '/' + instance.options.resourcebundle);
			
			exec(commandtoexecute, function (error, stderr, stdout) {
				if(error)
					console.log(error);

				installerQue.unLockFile(instance.options.downloaddir + '/' + instance.options.resourcebundle);
				if(!error && options && options.deleteafter)
					installerQue.deleteFile(instance.options.downloaddir + '/' + instance.options.resourcebundle);
//					fs.unlinkSync(instance.options.downloaddir + '/' + instance.options.resourcebundle);
				
				callback(error, stderr, stdout)
			});
		}
	}
}

var unzip = function(downloaddir, resourcebundle, destfile, callback, tarargs, options){
	if(!fs.existsSync(downloaddir))
		throw new Error("No directory found - " + downloaddir);

	if(resourcebundle.indexOf("/") == -1 ){
		resourcebundle = util.appendFilePath(downloaddir, resourcebundle);
	}
	if(destfile && destfile.indexOf("/") == -1)
		util.checkDirSync(util.appendFilePath(downloaddir, destfile));

	var commandtoexecute = util.getArchiveCommand(downloaddir, resourcebundle, destfile, tarargs);
	
	var exec = require('child_process').exec;
	var callbackoptions = {
		downloaddir:downloaddir, 
		resourcebundle:resourcebundle, 
		destfile:util.appendFilePath(downloaddir, destfile)
	};

	console.log("Running os command - " + commandtoexecute);
	installerQue.lockFile(resourcebundle);
	
	exec(commandtoexecute, function (error, stderr, stdout) {
		if(error)
			console.error(error);
		
		callbackoptions.stderr = stderr+'';
		callbackoptions.stdout = stdout+'';
		
		installerQue.unLockFile(resourcebundle);
		
		if(!error && options && options.deleteafter)
			installerQue.deleteFile(resourcebundle);
		
		if(callback)callback(error, callbackoptions)
	});
}

var ResourceInstallerQue = function(options){
	this._lockedFiles = {};
	this._downloadQue = {};
	this.downloading = false;
	
	return this;
}

ResourceInstallerQue.prototype.deleteFile = function(filename, callback){
	if(!this.isLocked(filename) && fs.existsSync(filename))
		if(callback)
			fs.unlink(filename, callback);
		else
			fs.unlinkSync(filename);
	else if(callback)
		callback();
}

ResourceInstallerQue.prototype.unLockFile = function(filename){
	if(this._lockedFiles[filename])
		this._lockedFiles[filename]--;
	
	if(this._lockedFiles[filename] == 0)
		delete this._lockedFiles[filename];
}

ResourceInstallerQue.prototype.isLocked = function(filename){
	return this._lockedFiles[filename] && this._lockedFiles[filename] > 0;
}

ResourceInstallerQue.prototype.removeDownloadQue = function(downloadlink, installpath){
	var downloadkey = util.generateId(downloadlink),
	installpathkey = util.generateId(installpath);

	var queid = downloadkey+'-'+installpathkey;

	if(this._downloadQue[queid])
		delete this._downloadQue[queid];
}

ResourceInstallerQue.prototype.addInDownloadQue = function(downloadlink, installpath, callback){
	var downloadkey = util.generateId(downloadlink),
		installpathkey = util.generateId(installpath);
	
	var queid = downloadkey+'-'+installpathkey;
	
	if(!this._downloadQue[queid])
		this._downloadQue[queid] = {"downloadlink" :downloadlink, "installpath": installpath, "callback":[callback]};
	else if(this._downloadQue[downloadkey]){
		this._downloadQue[queid].callback.push(callback);
	}
}

ResourceInstallerQue.prototype.isInDownloadQue = function(downloadlink, installpath){
	var downloadkey = util.generateId(downloadlink),
		installpathkey = util.generateId(installpath);

	var queid = downloadkey+'-'+installpathkey;
	
	return this._downloadQue.hasOwnAttribute(queid);
}

ResourceInstallerQue.prototype.downloadNext = function(){
	var instance = this;
	
	if(!this.downloading && Object.keys(this._downloadQue).length > 0){
		var itemtodownload = Object.keys(this._downloadQue)[0];
		
		if(itemtodownload)
			downloadFile(instance, itemtodownload, function(){
				instance.downloadNext();
			});
	}
}

function downloadFile(instance, itemtodownload, callback){
	var itemdetails = instance._downloadQue[itemtodownload];
	instance.downloading=true;
	
	util.downloadFile(itemdetails.downloadlink, itemdetails.installpath, function(error, data){
		if(itemdetails.callback)
			for(var i in itemdetails.callback)
				itemdetails.callback[i].call(instance, error, data);
		
		delete instance._downloadQue[itemtodownload];
		instance.downloading=false;
		
		callback();
	});
}

ResourceInstallerQue.prototype.download = function(downloadlink, installpath, callback){
	this.addInDownloadQue(downloadlink, installpath, callback);
	
	if(!this.downloading)
		this.downloadNext();
}

ResourceInstallerQue.prototype.lockFile = function(filename){
	if(!this._lockedFiles[filename])
		this._lockedFiles[filename] = 1;
	else
		this._lockedFiles[filename]++;
}

var installerQue = new ResourceInstallerQue();

ResourceInstaller.unzipFile = unzip;