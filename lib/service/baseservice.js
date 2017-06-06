"use strict";

/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012-2017 Faisal Kottarathil(admin@simpleportaljs.com)
 *	
 * MIT Licensed
 */

var util = require("./../util");

/**
 * A class for handling the view service
 */
var BaseService = module.exports = function(options){
	options = options ||{};
	
	this.urlHandles={};
	
	this.intialized = false
	
	if(!this.routerid)
		this.routerid = options.routerid || ("_BASE_SERVICE_" + _routerIndex++);

	this.options = options;
	this._configuration = {};
	
	this._preference={};
	
	return this;
};
//var _serverInstance;
var _routerIndex=0;

BaseService.prototype.getServerInstance = function(routerid){
	return this._serverInstance;
}

BaseService.prototype.getContext = function(routerid){
	var instance = this;
	
	if(!instance._serverInstance)
		console.log(this.routerid + ": ERROR: >>> Server instance is not available");
	
	if(instance.routerid != routerid)
		return instance._serverInstance[routerid];
	else
		return instance;
}

BaseService.prototype.getLogger = function(){
	return this._serverInstance.getLogger();
}

BaseService.prototype.getPluginloader = function(){
	return this.getContext("pluginloader");
}

BaseService.prototype.getServiceloader = function(){
	return this.getContext("serviceloader");
}

BaseService.prototype.getViewloader = function(){
	return this.getContext("viewloader");
}

BaseService.prototype.getStartuploader = function(){
	return this.getContext("startuploader");
}

BaseService.prototype.getConfiguration = function(key, defaultvalue){
	if(key)
		return this._configuration[key]||defaultvalue;
	else
		return this._configuration;
}

BaseService.prototype.setConfiguration = function(key, value){
	if(key && typeof key != "object" && value)
		this._configuration[key] = value;
	
	else if(typeof key == "object")
		util.extendJSON(this._configuration, key);
}

/**
 * Add the url to the urlHandles
 */
BaseService.prototype.addUrlHandle = function(url, callback){
	var instance = this;
	this.urlHandles[url] = getCallback(instance, callback);//callback;
}

function getCallback(instance, callback){
	return (function(instance, callback){
		return function(request, response, next){
			callback(request, response, function(error, data, headers){
				if(next && error && error.indexOf("no-such-method") == 0)
					next();
				else
					util.sendServiceResponse(response, error, data, headers);	
			});
		};
	})(instance, callback);
}

/**
 * To register api for getting records from the service
 * 
 * @method get
 * @param {} path URI path
 * @param {callback} callback The callback to excecute when complete
 */
BaseService.prototype.get = function(path, callback){
	var instance = this;

	instance.addUrlHandle(path, callback);
}

/**
 * Initializing function of the viewservice
 * 
 * @method init
 * 
 * @param configuration Service configuration from configuration module
 * @param {callback} callback The callback to excecute when complete
 */
BaseService.prototype.init = function(serverInstance, callback){
	var instance = this;
	
	if(instance.intialized) {
		if(callback)callback();
		return;
	}else{
		instance.intialized = true;
		
		instance._serverInstance = serverInstance;
		
		if(instance.getServerInstance() && instance.getServerInstance().getConfiguration('views')){
			if(instance.getServerInstance().getConfiguration('views')[instance.routerid])
				instance.setConfiguration(serverInstance.getConfiguration('views')[instance.routerid]||{});
		}
		
		if(instance.plugin && instance.getServerInstance()){
			var serverPreference = instance.getServerInstance().getConfiguration("preference", {plugin:{}});
			
			if(serverPreference && serverPreference.plugin && serverPreference.plugin[instance.plugin] && serverPreference.plugin[instance.plugin][instance.routerid])
				instance.setPreference(serverPreference.plugin[instance.plugin][instance.routerid]||{});
			else if(serverPreference && serverPreference.plugin && serverPreference.plugin[instance.plugin] && serverPreference.plugin[instance.plugin][instance.name])
				instance.setPreference(serverPreference.plugin[instance.plugin][instance.name]||{});
		} else if(instance.getServerInstance() && instance.preferencekey){
			var serverConfiguration = instance.getServerInstance().getConfiguration(instance.preferencekey);
			
			if(serverConfiguration && serverConfiguration[instance.routerid])
				instance.setConfiguration(serverConfiguration[instance.routerid]||{});
			
			var serverPreference = serverInstance.getConfiguration("preference", {plugin:{}});
			
			if(serverPreference && serverPreference[instance.preferencekey] && serverPreference[instance.preferencekey][instance.routerid]){
				instance.setPreference(serverPreference[instance.preferencekey][instance.routerid]);
			} else if(serverPreference && serverPreference[instance.preferencekey] && serverPreference[instance.preferencekey][instance.name]){
				instance.setPreference(serverPreference[instance.preferencekey][instance.name]);
			}
		}
		
		if(callback)
			callback();
	}
}

/**
 * Callback function when an api request is made to the service
 * 
 * @method call
 * 
 * @param {} path URI path requested
 * @param {} request http request of the user
 * @param {} response http response
 * 
 * @param {callback} callback The callback to excecute when complete
 */
BaseService.prototype.call = function(path, request, response, callback){
	var instance = this;
	
	var caller = this.urlHandles[path];
	if(!caller)
		callback('no-such-method');
	else{
		if(typeof caller == 'string')
			caller = instance[caller];
		
		if(caller){
			caller.apply([].slice.call(arguments, 1));
		}else
			callback('no-such-method');
	}
}

BaseService.prototype.setPreference = function(key, value){
	if(key && typeof key != "object" && value)
		this._preference[key] = value;
	
	else if(typeof key == "object")
		util.extendJSON(this._preference, key);
};

/**
 * To save the preference in to the db
 */
BaseService.prototype.savePreference = function(preferencekey, value, callback){
	var instance = this;
	
	var preferenceobject = {};
	if(typeof preferencekey == 'object'){
		preferenceobject  = preferencekey;
		if(typeof value == "function"){
			callback = value;
			value=null;
		}
	} else if(preferencekey && defaultvalue){
		preferenceobject.title = preferenceobject.key = preferencekey;
		preferenceobject.preference = value;
	}
	
	// use serverpreference api
	if(preferenceobject && preferenceobject.key && preferenceobject.preference){
		preferenceobject.key = instance.name + "_" + preferenceobject.key;
		
		instance.getServiceloader()
			.getService("serverpreference")
			.registerPreference(preferenceobject, callback)
	} else if(callback)
		callback("not a valid preference object");
}

BaseService.prototype.removeSavedPreference = function(preferencekey, callback){
	var instance = this;
	
	// to save the preference to the db use service name prefixed while saving the preference
	var uniquepreferencekey = instance.name + "_" + preferencekey;
	
	// use serverpreference api
	instance.getServiceloader().getService("serverpreference").removeByKey(uniquepreferencekey, callback);
};

BaseService.prototype.getSavedPreference = function(preferencekey, defaultvalue, callback){
	var instance = this;
	
	if(typeof defaultvalue == 'function'){
		callback = defaultvalue;
		defaultvalue=null;
	}
	// to save the preference to the db use service name prefixed while saving the preference
	var uniquepreferencekey = instance.name + "_" + preferencekey;
	
	// use serverpreference api
	instance.getServiceloader().getService("serverpreference").getByKey(uniquepreferencekey, callback);
};

BaseService.prototype.getPreferenceSetting = function(preferencekey, defaultvalue){
	var instance = this,
		preferencesetting = {};
	
	if(instance.options && instance.options.preferencesetting)
		preferencesetting = util.extendJSON(preferencesetting, instance.options.preferencesetting);

	if(preferencekey)
		return preferencesetting[preferencekey]||defaultvalue;
	
	return preferencesetting;
}

BaseService.prototype.getPreference = function(preferencekey, defaultvalue){
	var instance = this,
		preference = {};
	
	if(instance.options && instance.options.preferencesetting)
		preference = util.extendJSON(preference, instance.options.preferencesetting, instance._preference);
	
	if(preferencekey)
		return preference[preferencekey]||defaultvalue;

	return preference;
};