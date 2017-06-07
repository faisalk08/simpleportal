"use strict";

/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012-2017 Faisal(admin@simpleportaljs.com)
 *	
 * MIT Licensed
 */

/**
 * A class for handling the view service
 */
var util = require("util"),
	BaseService = require("./baseservice");
	
var FilterService = module.exports = function(options){
	var _ = BaseService.call(this, options);
	
	var instance = this;
	instance.preferencekey = "filter";
	
	return instance;
};
util.inherits(FilterService, BaseService);

/**
 * Initializing function of the viewservice
 * 
 * @method init
 * 
 * @param configuration Service configuration from configuration module
 * @param {callback} callback The callback to excecute when complete
 */
//FilterService.prototype.init = function(serverInstance, callback){
//	var instance = this;
//	
//	instance.intialized = true;
//
//	instance._serverInstance = serverInstance;
//	
//	if(instance.getServerInstance() && instance.getServerInstance().getConfiguration('filter')){
//		if(instance.getServerInstance().getConfiguration('filter')[instance.routerid])
//			instance.setConfiguration(serverInstance.getConfiguration('filter')[instance.routerid]||{});
//	}
//	
//	if(callback)
//		callback();
//}

FilterService.prototype.filter = function(){
	return function(request, response, next){
		next();
	};
}