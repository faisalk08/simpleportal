"use strict";
/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */
/**
 This is the __module__ description for the `simpleportal` module.
 simpleportal frameworks vareous classess can be directly accessed using `simpleportal`
  
 - All class files in the `simpleportal/lib/wrapper` folder is accessible with `simpleportal`.{module name with First charactar upper case}
  
 - 	for example `simpleportal.Csv` for Csv parsing
  
 - All files siblings to `simpleportal` can be accessed with `simpleportal.{modulename}`
  
 - 	For example `simpleportal.util` - All util functions can be directly used
  
        var simpleportal = require('simpleortal');
        
		var csvparser = simpleportal.Csv({file:{path:/Users/guest/test.csv}});
 @module simpleportal	
*/

/**
 * Main class for the simpleportal
 * 
 * @class simpleportal
 * @module simpleportal
 * @main simpleportal
 * @static
 */
//var simpleportal = module.exports = {};

var fs = require('fs'),
	LoggerWrapper = require("./util/logger").Logger;

/**
 * Simple portal Constructor
 * 
 */
var Constructor = function (options){
	var instance = this;
	
	var packageinfo = require("./../package.json");
	
	instance.version = packageinfo.version || options.version || '0.1.0';
	
	/**
	 * @property version
	 * @type string
	 * @static
	 */
	instance.rootdir = __dirname + '/..';
	
	instance.resourcesdir = __dirname + '/../resources';

	init(instance, options);
	
	return instance;
}

Constructor.prototype.getRootdir = function(){
	return this.rootdir;
}

/** 
 * private init function
 * 
 */
function init(instance, options){
	/**
	 * Set the dependencies in to simpleportal
	 */
	fs.readdirSync(__dirname).forEach(function(filename){
	    if (/\.js$/.test(filename)) {
	        if(filename != 'simpleportal.js'){
	            var name = filename.substr(0, filename.lastIndexOf('.'));
	            
//	            instance[name] = require('./' + name);
	            
	            instance.__defineGetter__(name, function(){
	                return require('./' + name);
	            });
	        }
	    }
	});

	/**
	 * Set the wrapper in to the subobjects
	 */
	fs.readdirSync(__dirname + '/wrapper').forEach(function(filename){
	    if (/\.js$/.test(filename)) {
	        var name = filename.substr(0, filename.lastIndexOf('.'));
	        
	        if(name == 'crudservice')
//	        	instance['CRUDService'] = require('./wrapper/' + name).CRUDService;
//	            
	        	instance.__defineGetter__('CRUDService', function(){
	            	return require('./wrapper/' + name).CRUDService;
	            });
	        else
//	        	instance[capitaliseFirstLetter(name)] = require('./wrapper/' + name);
	        	instance.__defineGetter__(capitaliseFirstLetter(name), function(){
	        		return require('./wrapper/' + name);
	        	});
	    }
	    
	    //fix for older version of the server plugins
//	    instance.services=Constructor.serviceloader;
	    
	    //fix for older version of the server plugins
//	    instance.views=Constructor.viewloader;
	});
	
	instance.logger={};
	
	var loggerInstance;
	instance.logger.getInstance = function(options) {
		if(!loggerInstance)
			loggerInstance = new LoggerWrapper(options);
		
		return loggerInstance;
	}
	
	instance.getConfiguration = function(){
		return {
			title:process.title,
			version:process.version,
			mainModule:process.mainModule.filename,
			pid:process.pid
		};
	}
	
	
	//how about adding require paths to
//	require.main.paths.push(__dirname + '/../node_modules');
//	require.main.paths.push(__dirname + '/../../');
	
	instance.Constants = require("./util/constants");
	instance.db = require("./util/db");
	
	process.env.NODE_PATH = "$NODE_PATH;" + instance.rootdir + "/..;"+instance.rootdir+'/node_modules';
		
	__patchNode();
	
	return instance;
}

/**
 * To capitalize the first charector of a word
 * 
 * @method capitaliseFirstLetter
 * 
 * @param {} string
 * @return BinaryExpression
 * @private
 */
function capitaliseFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

var __patchNode = function() {
	var http = require('http');
  
	var IncomingMessageExt = require('./http/request');
	var ServerresponseExt = require('./http/response');
  
	http.IncomingMessage.prototype.getUserprofile = IncomingMessageExt.getUserprofile;
	http.IncomingMessage.prototype.setUserprofile = IncomingMessageExt.setUserprofile;
  
	http.IncomingMessage.prototype.flash 		=  
	http.IncomingMessage.prototype.header		= 
	http.IncomingMessage.prototype.get		= IncomingMessageExt.header;
	http.IncomingMessage.prototype.accepts	= IncomingMessageExt.accepts;
  
	http.ServerResponse.prototype.json 		= ServerresponseExt.json;
	http.ServerResponse.prototype.contentType = ServerresponseExt.contentType;
	http.ServerResponse.prototype.send 		= ServerresponseExt.send;
	http.ServerResponse.prototype.redirect 	= ServerresponseExt.redirect;
	http.ServerResponse.prototype.header 		= ServerresponseExt.header;
  
	if(!Array.prototype['unique'])
		Object.defineProperty(Array.prototype, 'unique', {
		    enumerable: false,
		    configurable: false,
		    writable: false,
		    value: function() {
		        var a = this.concat();
		        for(var i=0; i<a.length; ++i) {
		            for(var j=i+1; j<a.length; ++j) {
		                if(a[i] === a[j] || ((typeof a[i] == "object" && typeof a[j] == "object") && JSON.stringify(a[i]) === JSON.stringify(a[j])))
		                    a.splice(j--, 1);
		            }
		        }
	
		        return a;
		    }
		});
	
	if(!Array.prototype['filter'])
		Array.prototype.filter = function(fun) {
			var len = this.length >>> 0;
			
			if (typeof fun != "function")
				throw new TypeError();
	
			var res = [];
			var thisp = arguments[1];
			for (var i = 0; i < len; i++) {
				if (i in this) {
					var val = this[i]; // in case fun mutates this
					if (fun.call(thisp, val, i, this))
						res.push(val);
				}
		    }
		    return res;
		};
};

var simpleportal = module.exports = new Constructor();