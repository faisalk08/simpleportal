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
	util = require('./../util'),
	url = require('url'),
	Routerclass = require("./router");

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
var FilterLoader = module.exports = function(options, serverInstance){
	var instance = this;

	if(serverInstance){
		var serveroptions = {
			systemfilterdir:serverInstance.getServerCorePath("filter")
		}
		options = util.extendJSON(serveroptions, options);
	}
	/*
	 * Registering service loader with the nodejs event emitter 
	 */
	Routerclass.call(this, options, serverInstance);
	
	options = options||{};
	
	instance.routerid = options.routerid||"filterloader";
	
	instance.filterdir = options.filterdir || "filter";
	instance.systemfilterdir = options.systemfilterdir||__dirname + "/../../server/filter";

	instance.preferencekey = 'filter';
	instance.filters = [];
	
	/**
	 * do listen to load.router
	 * {
	 * 	configuration : plugin configuration
	 * 	startupdir : directory to search for
	 * }
	 */
	instance.on("load.router", function(options){
		if(options && options.filterdir && options.configuration){
			instance.loadFilters(options, function(){});
		}
	});
	
	return this;
};
require("util").inherits(FilterLoader, Routerclass);

FilterLoader.DEFAULT_PROPS={
	disabled:false,
	priority:100
}

FilterLoader.prototype.initRouter = function(router, callback){
	var instance = this;
	
	// registering the filters
	if(instance.routers && Object.keys(instance.routers).length != 0) {
		for(var filtername in instance.routers){
			var router = instance.routers[filtername];
			
			if( router.getConfiguration() && router.getConfiguration("webappuri"))
				instance.getServerInstance().getServer().use(router.getConfiguration("webappuri"), router.filter());
			else
				instance.getServerInstance().getServer().use(router.filter());
		}
	}	
	
	if(callback)
		callback();
}

/**
 * To load the routers | filters 
 */
FilterLoader.prototype.loadRouter = function(configuration, callback){
	var instance = this;
	
	instance.loadFilters({filterdir:instance.systemfilterdir}, function(){
		instance.loadFilters(configuration, function(){
			instance.emit("router.loaded");
			
			if(callback)
				callback();
		});
	});
}
/**
 * To load the filters based on the configuration
 * 
 * @method loadFilters
 * @param {} configuration Path configuration for the filter 
 * @param {callback} callback The callback to excecute when complete
 */
FilterLoader.prototype.loadFilters = function(options, callback){
	var instance = this;
	
	var filterdir_ = options && options.filterdir ?  options.filterdir : instance.filterdir;
	
	instance.getLogger().debug(instance.routerid + ':loadFilters', 'loading from << ' + filterdir_);
	
	var configuration;
	if(options && options.configuration)
		configuration = options.configuration;
	if(!fs.existsSync(filterdir_)){
		instance.getLogger().warn(instance.routerid + ':loadFilters', 'no directory found - ' + filterdir_);
		
		if(callback)
			callback();
	} else{
		var stats = fs.lstatSync(filterdir_);
		
		if (stats.isDirectory()) {
			loadFilters(instance, filterdir_, false, callback, configuration);
		}else if(callback)
			callback();	
	}	
}
/**
 * To load the filters by property in to the filters array
 * 
 * @method loadFilterByProps
 * @param {} filterprops 
 * @private 
 */
function loadFilterByProps(instance, filterprops, configuration){
	instance.getLogger().debug(instance.routerid + ':loadFilterByProps', filterprops.name + ' << ' + filterprops.path);
	
	if(!instance.routers[filterprops.name]){
		try{
			instance.routers.__defineGetter__(filterprops.name, function(){
	            return require(filterprops.path);
	        });
			
			if(configuration && configuration.webappuri)
				instance.routers[filterprops.name].setConfiguration("webappuri", configuration.webappuri);
			if(configuration && configuration.id)
				instance.routers[filterprops.name].setConfiguration("plugin", configuration.id);
			
			// check if the serviceloader is available
			if(instance.getServerInstance() 
					&& typeof instance.routers[filterprops.name] == 'object' 
					&& typeof instance.routers[filterprops.name].init == 'function')
				instance.routers[filterprops.name].init(instance.getServerInstance());
			else
				instance.getLogger().error(instance.routerid + ':loadFilterByProps', filterprops.name + ' is not a valid filter or server instance is not assigned');
		} catch(error){
			delete instance.routers[filterprops.name];
			
			instance._routererrors[filterprops.name] = {plugin: configuration ? configuration.id:null, error:error};
			
			instance.getLogger().error(instance.routerid + ':loadFilterByProps', error);
		}
	}
}

/**
 * To load the filters from a directory
 * 
 * @method loadFilters
 * @param {string} dir Directory where the filters are stored
 * 
 * @param {boolean} includeindex whether to include the indes.js file and use parent folder name as the filter name
 * @param {callback} callback The callback to excecute when complete
 */
function loadFilters(instance, dir, includeindex, callback, configuration){
	var filtersfound = getFilters(instance, dir, includeindex)||[];
	
	var totcount = filtersfound.length;
	var fincount =0;
	if(filtersfound && filtersfound.length >0)
		for(var i in filtersfound){
			var filterprops = filtersfound[i];
			
			loadFilterByProps(instance, filterprops, configuration);
			
			if(totcount-1 == fincount++)
				if(callback)
					callback(null, filtersfound);
		}
	else if(callback)
		callback();
}


/**
 * To get the filters available inside a directory
 * 
 * @method getFilters
 * 
 * @param {} dir Folder path where filetr js files are stored
 * @param {} includeindex whether to include the indes.js file and use parent folder name as the filter name
 * @return filters array of filter properties
 */
var getFilters = function (instance, dir, includeindex){
	var filters = [];
		includeindex = includeindex||false;
	
	if(!fs.existsSync(dir)){
		instance.getLogger().warn(instance.routerid + ':getFilters', 'no directory found << ' + dir);
	} else
		fs.readdirSync(dir).filter(function(f){
			return /filter\.js$/.test(f);
		}).forEach(function(filename){
			if(/filter\.js$/.test(filename)){
				var name = filename.substr(0, filename.lastIndexOf('.'));
	            var filter = name;
	            
	            var path = fs.realpathSync(dir + '/' + name + '.js');
	            
	            filters.push({path:path, name:filter});
		    }else{
		    	stats = fs.lstatSync(dir + '/' + filename);
	
			    // Is it a directory?
			    if (stats.isDirectory()) {
			    	var subfilters = getFilters(instance, dir + '/' + filename, true);
			    	
			    	if(subfilters&&subfilters.length > 0)
			    		for(var i in subfilters)
			    			filters.push(subfilters[i]);
			    }
		    }
		});
	
	return filters;
}