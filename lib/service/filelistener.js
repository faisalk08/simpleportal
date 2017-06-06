"use strict";

/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012-2017 Faisal Kottarathil(admin@simpleportaljs.com)
 *	
 * MIT Licensed
 */
var simpleportalUtil = require("./../util"),
	fs = require('fs'),
	util=require("util"),
	events = require('events');

var FileListener = function(options){
	var instance = this;
	
	/*
	 * Registering service loader with the nodejs event emitter 
	 */
	events.EventEmitter.call(instance);
	
	return instance;
}
util.inherits(FileListener, events.EventEmitter);

/**
 * @listenDir folder to watch
 * @callback for change / listen
 */
FileListener.prototype.listen = function(listenDir, listenCallback){
	/**
	 * @TODO has to be checked if a folder need to be created before listening to it.
	 */
	simpleportalUtil.checkDirSync(listenDir);
	
	watchFolder(listenDir, function(filename){
		if(listenCallback)
			listenCallback({listenDir:listenDir, filename:filename});
	});
}

/**
 * @listenDir folder to watch
 * @callback for change / listen
 */
FileListener.prototype.syncFolder = function(listenDir, destDir, eventprops){
	var instance = this;
	console.log("SYNC Listener init : " + listenDir  + ">>>>>" + destDir);
	
	/**
	 * @TODO has to be checked if a folder need to be created before listening to it.
	 */
	simpleportalUtil.checkDirSync(destDir);
	
	instance.listen(listenDir, function(listnerdata){
		console.log("Sync callback is called : " + listnerdata.listenDir + "/" + listnerdata.filename + ">>>>>" + destDir  + "/" + listnerdata.filename);
		
		var listnerdata = simpleportalUtil.extendJSON({destDir:destDir}, eventprops, listnerdata);
		
		moveFile(listnerdata.listenDir, listnerdata.destDir, listnerdata.filename, eventprops, function(error, data){
			if(data&&data.destfilename)
				listnerdata.destfilename = data.destfilename;

			if(error){
				listnerdata.error=error;
				instance.emit("error.syncFolder", listnerdata);
				if(listnerdata.eventkey)
					instance.emit("error.syncFolder."+listnerdata.eventkey, listnerdata);
			} else{
				instance.emit("success.syncFolder", listnerdata);
				if(listnerdata.eventkey)
					instance.emit("success.syncFolder."+listnerdata.eventkey, listnerdata);
			}
		})
	});
}

//private method for handling file processing
function moveFile (srcdir, destdir, filename, eventprops, callback){
	console.log('AUTO LISTENER : ' +  'MOVE REPORTS: FILE IS MOVING TO AUTO DIRECTROY - ' + srcdir + ' >> '+ destdir + '-->>' + filename);
	
	var srcfile = srcdir + '/' + filename,
		destfilename=filename,
		error;
		
	// do file name formatting
	if(!callback && typeof eventprops == "function"){
		callback=eventprops;eventprops=null;
	}
	
	if(!eventprops || !eventprops.disablenormalize){
		if(filename.indexOf(".") != -1){
			var filename_woext = filename.substring(0, filename.lastIndexOf("."));
			
			var normalizedfilename = normalizeFilename(filename_woext);
			var fileextension = filename.substring(filename.lastIndexOf("."));
			
			destfilename = normalizedfilename + fileextension;
		}else
			destfilename = normalizeFilename(filename);
	}
	
	if(!fs.existsSync(srcfile)){
		if(callback)callback("No file found to move : "+  srcdir + '/' + filename);
	}else if(fs.existsSync(destdir)){
		var destfile = destdir + '/' + destfilename,
			callbackdata = {destfilename:destfilename};
		
		if(fs.existsSync(destfile) && fs.statSync(srcfile).mtime <= fs.statSync(destfile)){
			console.log('AUTO LISTENER' + 'FILE already imported - ' + destfile);
			error = "File duplicated, and found same timestamp.";
		}
		
		if(!error)
			fs.readFile(srcdir + '/' + filename, function (err, data) {
				fs.writeFile(destfile, data, function (err) {
					if(callback)callback(null, callbackdata);
				});
			});
		else if(callback)
	   		callback(error, callbackdata)
   	}else if(callback)
   		callback("No destination drectory found to move to : " + destdir, callbackdata)
}

/**
 * Private methods for underlying function
 * 
 */
var watchFolder = function(folderToWatch, callback){
    console.log('File listener private : watchFolder:::' + folderToWatch);    
	try{
		fs.watch(folderToWatch, {recursive:true}, function (event, filename) {
	  		console.log('LISTENER --- event is: ' + event);
	  		if (filename) {
//	    		console.log('######### LISTENER  --- filename provided: ' + filename);
	    		if(callback){
	    			callback(filename);
	    		}
	  		} else {
	    		console.log('######### LISTENER  --- filename not provided');
	  		}
		});	
	}catch(error){ 
		console.log(error);
	}
};

/**
 * Method to normalize the file name - rmeove German charectar and other special characters
 * 
 * @method normalizeFilename
 * 
 * @param {string} str String to normalize
 * @return str normalized string
 * @private
 * @static
 */
function normalizeFilename(str) {
	str = str.replace("oÌ", 'o');
	str = str.replace("UÌ", 'u');
	
	var a = ['À', 'Á', 'Â', 'Ã', 'Ä', 'Å', 'Æ', 'Ç', 'È', 'É', 'Ê', 'Ë', 'Ì', 'Í', 'Î', 'Ï', 'Ð', 'Ñ', 'Ò', 'Ó', 'Ô', 'Õ', 'Ö', 'Ø', 'Ù', 'Ú', 'Û', 'Ü', 'Ý', 'ß', 'à', 'á', 'â', 'ã', 'ä', 'å', 'æ', 'ç', 'è', 'é', 'ê', 'ë', 'ì', 'í', 'î', 'ï', 'ñ', 'ò', 'ó', 'ô', 'õ', 'ö', 'ø', 'ù', 'ú', 'û', 'ü', 'ý', 'ÿ', 'Ā', 'ā', 'Ă', 'ă', 'Ą', 'ą', 'Ć', 'ć', 'Ĉ', 'ĉ', 'Ċ', 'ċ', 'Č', 'č', 'Ď', 'ď', 'Đ', 'đ', 'Ē', 'ē', 'Ĕ', 'ĕ', 'Ė', 'ė', 'Ę', 'ę', 'Ě', 'ě', 'Ĝ', 'ĝ', 'Ğ', 'ğ', 'Ġ', 'ġ', 'Ģ', 'ģ', 'Ĥ', 'ĥ', 'Ħ', 'ħ', 'Ĩ', 'ĩ', 'Ī', 'ī', 'Ĭ', 'ĭ', 'Į', 'į', 'İ', 'ı', 'Ĳ', 'ĳ', 'Ĵ', 'ĵ', 'Ķ', 'ķ', 'Ĺ', 'ĺ', 'Ļ', 'ļ', 'Ľ', 'ľ', 'Ŀ', 'ŀ', 'Ł', 'ł', 'Ń', 'ń', 'Ņ', 'ņ', 'Ň', 'ň', 'ŉ', 'Ō', 'ō', 'Ŏ', 'ŏ', 'Ő', 'ő', 'Œ', 'œ', 'Ŕ', 'ŕ', 'Ŗ', 'ŗ', 'Ř', 'ř', 'Ś', 'ś', 'Ŝ', 'ŝ', 'Ş', 'ş', 'Š', 'š', 'Ţ', 'ţ', 'Ť', 'ť', 'Ŧ', 'ŧ', 'Ũ', 'ũ', 'Ū', 'ū', 'Ŭ', 'ŭ', 'Ů', 'ů', 'Ű', 'ű', 'Ų', 'ų', 'Ŵ', 'ŵ', 'Ŷ', 'ŷ', 'Ÿ', 'Ź', 'ź', 'Ż', 'ż', 'Ž', 'ž', 'ſ', 'ƒ', 'Ơ', 'ơ', 'Ư', 'ư', 'Ǎ', 'ǎ', 'Ǐ', 'ǐ', 'Ǒ', 'ǒ', 'Ǔ', 'ǔ', 'Ǖ', 'ǖ', 'Ǘ', 'ǘ', 'Ǚ', 'ǚ', 'Ǜ', 'ǜ', 'Ǻ', 'ǻ', 'Ǽ', 'ǽ', 'Ǿ', 'ǿ'];
    var b = ['A', 'A', 'A', 'A', 'A', 'A', 'AE', 'C', 'E', 'E', 'E', 'E', 'I', 'I', 'I', 'I', 'D', 'N', 'O', 'O', 'O', 'O', 'O', 'O', 'U', 'U', 'U', 'U', 'Y', 's', 'a', 'a', 'a', 'a', 'a', 'a', 'ae', 'c', 'e', 'e', 'e', 'e', 'i', 'i', 'i', 'i', 'n', 'o', 'o', 'o', 'o', 'o', 'o', 'u', 'u', 'u', 'u', 'y', 'y', 'A', 'a', 'A', 'a', 'A', 'a', 'C', 'c', 'C', 'c', 'C', 'c', 'C', 'c', 'D', 'd', 'D', 'd', 'E', 'e', 'E', 'e', 'E', 'e', 'E', 'e', 'E', 'e', 'G', 'g', 'G', 'g', 'G', 'g', 'G', 'g', 'H', 'h', 'H', 'h', 'I', 'i', 'I', 'i', 'I', 'i', 'I', 'i', 'I', 'i', 'IJ', 'ij', 'J', 'j', 'K', 'k', 'L', 'l', 'L', 'l', 'L', 'l', 'L', 'l', 'l', 'l', 'N', 'n', 'N', 'n', 'N', 'n', 'n', 'O', 'o', 'O', 'o', 'O', 'o', 'OE', 'oe', 'R', 'r', 'R', 'r', 'R', 'r', 'S', 's', 'S', 's', 'S', 's', 'S', 's', 'T', 't', 'T', 't', 'T', 't', 'U', 'u', 'U', 'u', 'U', 'u', 'U', 'u', 'U', 'u', 'U', 'u', 'W', 'w', 'Y', 'y', 'Y', 'Z', 'z', 'Z', 'z', 'Z', 'z', 's', 'f', 'O', 'o', 'U', 'u', 'A', 'a', 'I', 'i', 'O', 'o', 'U', 'u', 'U', 'u', 'U', 'u', 'U', 'u', 'U', 'u', 'A', 'a', 'AE', 'ae', 'O', 'o'];

    var i = a.length;
    while (i--) str = str.replace(a[i], b[i]);
    
    var regex = /[^\w\s|-]/gi;
   	str=str.replace(regex, '_');
   	
    return str;
}

module.exports = FileListener;