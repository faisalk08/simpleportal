"use strict";
/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */
/**
 * Router middleware for `simpleportal.Server`
 *
 * @property router
 * @for simpleportal
 * @type {router}
 * @static
 */

/**
 * Router middleware for `simpleportal.Server`
 * 
 * @class router
 * @module middleware
 * @static
 */
var router = module.exports = {};

var DispatchWrapper = require('./util/spdispatch'),
	util = require('./util');
//	logger = require("./logger");

function loopcallback(count, curcount, callback, error, data) {
	if(count == curcount+1)
		callback(error, data);
}

/**
 * To register the middleware in to the `simpleportal.Server`
 * 
 * @method register
 * @param {} modules
 * @param {callback} callback The callback to excecute when complete
 */
router.register = function(modules, callback) {
//	logger.getInstance().debug('Simpleportal - router:register', 'Registering routers');
	
	var count = modules.length;
	var cbcount = 0;
	
	if(modules.length != 0)
		for(var i = 0; i < modules.length;i++){
			module = modules[i];
			
			util.callModuleFunction(module, true, 'initRouter', router, function(error, data){
				loopcallback(count, cbcount++, callback, error, data);
			});
		}
	else
		callback('No router to register!!');
};

/**
 * To get the underlying `simpleportal.dispatch` handlers  
 * 
 * @method getDispatchHandler
 * @param {} modules
 * @param {callback} callback The callback to excecute when complete
 * @return CallExpression dispatch handlers
 */
router.getDispatchHandler = function(modules, callback) {
	var instance = this;
	
	return instance.dispatch.handlers();
}

router.dispatch = new DispatchWrapper();