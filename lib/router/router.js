"use strict";

/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012-2017 Faisal(admin@simpleportaljs.com)
 *	
 * MIT Licensed
 */
var DispatchWrapper= require("./../util/spdispatch"),
	events = require('events'),
	TemplateUtils = require('simpleportal/lib/template/util'),
	util=require("./../util");

/**
 * Router class for
 */
var Router = module.exports = function(options, serverInstance){
	events.EventEmitter.call(this);
	
	options = options||{};
	
	this.routerloaded = false;
	
	this.routerid=options.routerid||'DEFAULT_ROUTER_ID';
	this.preferencekey = this.routerid;
	
	this.priority = options.priority || 0;
	
	this.routers = {};
	this._routererrors = {};
	this.urlHandles={};
	this.configuration={};

	if(serverInstance)
		this._serverInstance = serverInstance;
	
	return this;
};
require("util").inherits(Router, events.EventEmitter);

/**
 * Add the url to the urlHandles
 */
Router.prototype.addUrlHandle = function(url, callback){
	this.urlHandles[url] = callback;
}

Router.prototype.getRouterErrors = function(type){
	return this._routererrors;
}

Router.prototype.getRouters=function(){
	return this.routers;
}

Router.prototype.registerViewHandler=function(){}

/**
 * To update the configuration of the `Router`
 * 
 * @method updateConfiguration
 * @param {} configuration Configuration you want to update
 */
Router.prototype.updateConfiguration=function(configuration){
	var instance = this;
	
	instance.configuration = configuration;
	
	// let us call this when ever we have the confiuration set in to the router loader class 
	instance.loadRouter(configuration, function(){});
}

Router.prototype.loadRouter = function(configuration, callback){
	// calling the loadRouter function
	var instance = this;
	
	instance.emit("router.loaded");
	
	if(callback)
		callback();
}

//var _serverInstance;
Router.prototype.initServer = function(serverInstance, callback){
	var instance = this;
	
	instance._serverInstance = serverInstance;
	
	this.updateConfiguration(serverInstance.getConfiguration());
	
	this.emit("init.server");
	
	if(callback)
		callback();
}

Router.prototype.invokeAll = function(methodName, callback){
	var instance = this;
	var totalviewcount = Object.keys(instance.routers).length,
		totalviewcbcount = 0; 
	
	var cberrors = {};
	
	if(instance.routers && Object.keys(instance.routers).length > 0)
		for (var key in instance.routers) {
			if(instance.routers[key] 
				&& typeof instance.routers[key] == "object" 
				&& instance.routers[key][methodName]
				&& typeof instance.routers[key][methodName] == "function" 
			)
				try{
					instance.routers[key][methodName](instance.getServerInstance(), function(error){
						if(error)
							cberrors[key] = error;
						
						if(totalviewcbcount++ == totalviewcount-1){
							instance.emit('router.' + methodName);
							
							if(callback)callback(Object.keys(cberrors).length > 0 ? cberrors : null);
						}
					});
				}catch(error){
					instance.getLogger().error(instance.routerid + ":" + key, error);
					
					if(error)
						cberrors[key] = error;
					
					if(totalviewcbcount++ == totalviewcount-1){
						instance.emit('router.' + methodName);
						
						if(callback)callback(Object.keys(cberrors).length > 0 ? cberrors : null);
					}
				}
			else {
				if(totalviewcbcount++ == totalviewcount-1){
					instance.emit('router.' + methodName);
					
					if(callback)callback(Object.keys(cberrors).length > 0 ? cberrors : null);
				}
			}
		}
	else {
		instance.emit('router.' + methodName);
		
		if(callback)callback();
	}
}

Router.prototype.startAll = function(callback){
	var instance = this;
	
	if(this.routerid=="serviceloader")
		console.log(this.getRouterErrors());
	
	instance.invokeAll('start', callback);
}

Router.prototype.startupAll = function(callback){
	var instance = this;
	
	instance.invokeAll('startup', callback);
}

Router.prototype.initAll = function(callback){
	var instance = this;
	
	instance.invokeAll('init', function(){
		if(instance.routerid == "serviceloader")
			instance.invokeAll('startup', callback);
		
		if(callback)
			callback();
	});
}

Router.prototype.shutdownAll = function(callback){
	var instance = this;
	
	instance.invokeAll('shutdown', function(){
		if(callback)
			callback();
	});
}

/**
 * Default fuction to load the router in to the dispatch wrapper
 */
Router.prototype.initRouter = function(router, callback){
	var instance = this;
	
	if(this.routerloaded){
		instance.getLogger().error('Router.initRouter', this.routerid + ":>> Router already initialized.");
	}else{
		// do register all sub urls
		instance.registerViewHandler();
		
		if(router && router.dispatch instanceof DispatchWrapper && this.urlHandles){
			var registerd = router.dispatch.addUrlHandler(this.urlHandles);
		}
		
		instance.routerloaded = true;
	}
	
	if(callback)
		callback();
}

/**
 * Base service functions for handling service context
 * 
 */
Router.prototype.getServerInstance = function(routerid){
	return this._serverInstance;
}

Router.prototype.getContext = function(routerid){
	var instance = this;
	
	if(!instance._serverInstance)
		instance.getLogger().error(instance.routerid+':getContext', "server instance is not available");
	
	if(instance.routerid != routerid)
		return instance._serverInstance[routerid];
	else
		return instance;
}

Router.prototype.getConfiguration= function(key, defaultvalue){
	if(key)
		return this.configuration[key]||defaultvalue;
	else
		return this.configuration;
}

Router.prototype.getPluginloader = function(){
	return this.getContext("pluginloader");
}

Router.prototype.getServiceloader = function(){
	return this.getContext("serviceloader");
}

Router.prototype.getViewloader = function(){
	return this.getContext("viewloader");
}

Router.prototype.getStartuploader = function(){
	return this.getContext("startuploader");
}

Router.prototype.getFilterloader = function(){
	return this.getContext("filterloader");
}

Router.prototype.getRouter = function(key){
	if(this.routers)
		return this.routers[key];
	else return null;
}

Router.prototype.getLogger = function(key, value){
	if(!this.getServerInstance())
		return {info:function(){console.log(key + "[::]:" + value)}};
	else
		return this.getServerInstance().getLogger();
}

Router.prototype.getValue = function(key){
	return this[key];
}

Router.prototype.getPreferenceSetting = function(preferencekey, defaultvalue){
	return Router.DEFAULT_PROPS;
}

Router.prototype.getPreference = function(){
	return Router.DEFAULT_PROPS;
}

Router.prototype.getRouterDefaults = function(callback){
	return Router.DEFAULT_PROPS;
}

/**
 * To save the preference in to the db
 */
Router.prototype.savePreference = function(preferencekey, value, callback){
	var instance = this;
	
	var preferenceobject = {};
	if(typeof preferencekey == 'object'){
		preferenceobject  = preferencekey;
		if(typeof value == "function"){
			callback = value;
			value=null;
		}
	} else if(preferencekey && value){
		preferenceobject.title = preferenceobject.key = preferencekey;
		preferenceobject.preference = value;
	}
	
	// use serverpreference api
	if(preferenceobject && preferenceobject.key && preferenceobject.preference){
		preferenceobject.key = instance.preferencekey + "_" + preferenceobject.key;
		
		instance.getServiceloader()
			.getService("serverpreference")
			.registerPreference(preferenceobject, callback)
	} else if(callback)
		callback("not a valid preference object");
}

Router.prototype.removeSavedPreference = function(preferencekey, callback){
	var instance = this;
	
	// to save the preference to the db use service name prefixed while saving the preference
	var uniquepreferencekey = instance.preferencekey + "_" + preferencekey;
	
	// use serverpreference api
	instance.getServiceloader().getService("serverpreference").removeByKey(uniquepreferencekey, callback);
};

Router.prototype.getSavedPreference = function(preferencekey, defaultvalue, callback){
	var instance = this;
	
	if (typeof preferencekey == 'function'){
		// aggregate based on the instance.name
		instance.getServerInstance().getRouter('serviceloader').getService("serverpreference").search({key:new RegExp("^"+instance.routerid+"_")}, function(error, savedpreferences){
			var preference = {};
			
			if(savedpreferences && savedpreferences.length > 0)
				for(var i in savedpreferences){
					var savedpreference = savedpreferences[i];
					preference[savedpreference.key.replace(instance.routerid +"_", "")] = savedpreference.preference;
				}
			
			preferencekey(null, preference) // callback is not renamed
		}, {}, {limit:'none'});
	}else{
		if(typeof defaultvalue == 'function'){
			callback = defaultvalue;
			defaultvalue=null;
		}
		
		// to save the preference to the db use service name prefixed while saving the preference
		var uniquepreferencekey = instance.preferencekey + "_" + preferencekey;
		
		// use serverpreference api
		instance.getServerInstance().getRouter('serviceloader').getService("serverpreference").getByKey(uniquepreferencekey, callback);
	}
};

Router.prototype.getRouterFields = function(routerid){
	var instance = this;
	
	//default fields must be via a function
	var routerdefaults = instance.getRouterDefaults();
	var routerdefaultfields = Object.keys(routerdefaults);
	
	var routerfields = [];
	var routerFieldProps = TemplateUtils.getFieldFromObject(routerdefaults, instance.preferencekey + "__" + routerid + "__");
	if(routerFieldProps)	
		for(var fieldIndex in routerFieldProps){
			var routerField = routerFieldProps[fieldIndex];
			if(fieldIndex == 0)
				routerField.html.category = instance.routerid + ' - Configuration for - ' + routerid;
			
			routerfields.push(routerField);
		}
	
	return routerfields;
}

/**
 * To get the temporary path for a plugin
 * @method getTempPath
 * 
 * @param pluginsetting plugin for which the temporary path is requesting
 * @param file a file inside the temporary path
 * 
 */
Router.prototype.getTempPath = function(routerdetails, file){
	var instance = this;
	
	var tmp_path = instance.getServerInstance().getConfiguration("resources").tempdir || "._tmp";
	
	tmp_path = util.getServerPath(tmp_path);
	
	return util.appendFilePath(tmp_path, instance.routerid, (routerdetails&& routerdetails.id ? routerdetails.id : ""), file);
}


/**
 * To get the temporary path for a plugin
 * @method getTempPath
 * 
 * @param pluginsetting plugin for which the temporary path is requesting
 * @param file a file inside the temporary path
 * 
 */
Router.prototype.getDataPath = function(routerdetails, file){
	var instance = this;
	
	var tmp_path = instance.getServerInstance().getConfiguration("resources").datadir || "data";
	
	tmp_path = util.getServerPath(tmp_path);
	
	return util.appendFilePath(tmp_path, instance.routerid, (routerdetails && routerdetails.id ? routerdetails.id : ""), file);
}

/**
 * To get the temporary path for a plugin
 * @method getTempPath
 * 
 * @param pluginsetting plugin for which the temporary path is requesting
 * @param file a file inside the temporary path
 * 
 */
Router.prototype.getBackupPath = function(routerdetails, file){
	var instance = this;
	
	var tmp_path = instance.getServerInstance().getConfiguration("resources").backupdir || "backup";
	
	tmp_path = util.getServerPath(tmp_path);
	
	return util.appendFilePath(tmp_path, instance.routerid, (routerdetails&& routerdetails.id ? routerdetails.id : ""), file);
}