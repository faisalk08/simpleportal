"use strict";

/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012-2017 Faisal(admin@simpleportaljs.com)
 *	
 * MIT Licensed
 */
/**
 * Startup loader middleware for `simpleportal.Server`
 *
 * @property startuploader
 * @for simpleportal
 * @type {startuploader}
 * @static
 */

/**
 * Startup loader middleware for `simpleportal.Server`
 * 
 * @class startuploader
 * @module middleware
 * @static
 */
/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal
 * MIT Licensed
 */

var fs = require('fs'),
	util = require("./../util"),
	url = require('url'),
	Routerclass = require("./router"),
	StartupService = require("./../service/startupservice");

/**
 * Application view loader middleware for `simpleportal.Server`
 *
 * @property viewloader
 * @for simpleportal
 * @type {viewloader}
 * @static
 */

/**
 * Application view loader middleware for `simpleportal.Server`
 * 
 * @class viewloader
 * @module middleware
 */
var StartupLoader = module.exports = function(options, serverInstance){
	var instance = this;
	
	if(serverInstance){
		var serveroptions = {
			systemstartupdir:serverInstance.getServerCorePath("startup")
		}
		options = util.extendJSON(serveroptions, options);
	}
	
	Routerclass.call(instance, options, serverInstance);
	
	options = options||{};
	
	instance.routerid = options.routerid||"startuploader";
	
	instance.startupdir = options.startupdir || "startup";
	instance.systemstartupdir = options.systemstartupdir||__dirname + "/../../server/startup";
	
	instance.startups = [];
	instance.routers={};
	instance.preferencekey = 'startup';
	
	/**
	 * do listen to load.router
	 * {
	 * 	configuration : plugin configuration
	 * 	startupdir : directory to search for
	 * }
	 */
	instance.on("load.router", function(options){
		if(options && options.plugin && options.startupdir && options.configuration){
			// loading from startupdir
			instance.loadStartups(options, function(startups){
				instance.emit("router.loaded." + instance.routerid +'.'+ options.plugin, startups);
			});
		}
	});
	
	return instance;
};
require("util").inherits(StartupLoader, Routerclass);

StartupLoader.prototype.loadRouter = function(configuration, callback){
	var instance = this;
	
	instance.loadStartups({startupdir:instance.systemstartupdir}, function(){
		instance.loadStartups(configuration, function(){
			instance.getLogger().debug(instance.routerid + ":loadRouter",  Object.keys(instance.routers).length + " startup services found.");
			
			instance.emit("router.loaded");
			
			if(callback)
				callback();
		});
	});
}

/**
 * Description
 * @method loadStartups
 * @param {} configuration
 * @param {} callback
 * @return 
 */
StartupLoader.prototype.loadStartups = function(options, callback){
	var instance = this;
	
	var startupdir_ = options && options.startupdir ?  options.startupdir : instance.startupdir;
	
	if(fs.existsSync(startupdir_)){
		var stats = fs.lstatSync(startupdir_);
		
		if (stats.isDirectory()) {
			loadStartups(instance, startupdir_, false, callback, options.configuration||{});
		}else if(callback)
			callback();	
	}else if(callback)
		callback();
}

/**
 * Load startup by props
 * 
 * @method loadStartupByProps
 * @param {} startupprops
 * @param {} configuration
 */
function loadStartupByProps(instance, startupprops, configuration){
	instance.getLogger().debug(instance.routerid + ':loadStartups', startupprops.name + ' << ' + startupprops.path);
	
	if(!instance[startupprops.name]) {
		try{
			instance.routers.__defineGetter__(startupprops.name, function(){
	            return require(startupprops.path);
	        });
			
			instance.routers[startupprops.name].name = startupprops.name;
			
			if(configuration)
				instance.routers[startupprops.name].configuration=configuration;
			
			// now set the webapppuri
			if(configuration && configuration.webappuri)
				instance.routers[startupprops.name].setConfiguration("webappuri", configuration.webappuri);
			
			if(configuration && configuration.id){
				instance.routers[startupprops.name].setConfiguration("plugin", configuration.id);
				instance.routers[startupprops.name].plugin = configuration.id;
			}
			
			// check if the serviceloader is available
			if(instance.getServerInstance())
				instance.routers[startupprops.name].init(instance.getServerInstance());
		} catch(error){
			delete instance.routers[startupprops.name];
			
			console.error(error);
			
			instance._routererrors[startupprops.name] = {plugin:configuration.id, error:error};
			
			instance.getLogger().error(instance.routerid +':'+ startupprops.name + ':loadStartupByProps', error);
		}
	}else
		instance.getLogger().info('Simple Portal - startuploader', 'loadStartups  -- ' + startupprops.name + ' is duplicated.');
}

/**
 * Description
 * @method loadStartups
 * @param {} dir
 * @param {} includeindex
 * @param {} callback
 * @return 
 */
function loadStartups(instance, dir, includeindex, callback, configuration){
	var startupsfound = getStartups(dir, includeindex);
	
	var totcount = startupsfound.length;
	var fincount =0;
	if(startupsfound)
		for(var i in startupsfound){
			var startupprops = startupsfound[i];
			
			loadStartupByProps(instance, startupprops, configuration);
			
			if(totcount-1 == fincount++)
				if(callback)
					callback(startupsfound);
		}
	else if(callback)
		callback();
}

/**
 * Description
 * @method getStartups
 * @param {} dir
 * @param {} includeindex
 * @return startups
 */
function getStartups(dir, includeindex){
//	logger.getInstance().info('Simple Portal - startuploader:getStartups', 'getting startups from -- ' + dir);
	
	includeindex = includeindex||false;
	var startups = [];
	
	fs.readdirSync(dir).forEach(function(filename){
	    if (/\.js$/.test(filename)) {
            if((includeindex && filename == 'index.js') || filename != 'index.js'){
                var name = filename.substr(0, filename.lastIndexOf('.'));
                var startup = name;
                if(name == 'index'){
                	startup = dir.substring(dir.lastIndexOf('/') +1, dir.length)
                }
                var path = fs.realpathSync(dir + '/' + name + '.js');
                
                startups.push({path:path, name:startup});
            }
	    }else{
	    	stats = fs.lstatSync(dir + '/' + filename);

		    // Is it a directory?
		    if (stats.isDirectory()) {
		    	var substartups = getStartups(dir + '/' + filename, true);
		    	if(substartups.length > 0)
		    		for(var i in substartups)
		    			startups.push(substartups[i]);
		    }
	    }
	});
	
	return startups;
}