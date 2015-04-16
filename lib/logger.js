/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */
/**
 * Log middleware for `simpleportal.Server`
 *
 * @property logger
 * @for simpleportal
 * @type {logger}
 * @static
 */

/**
 * Log middleware for `simpleportal.Server`
 * 
 * @class logger
 * @module middleware
 * @static
 */
var logger = module.exports = {};

var loggerInstance;

/**
 * To get the `simpleportal.Logger` instance registered
 * 
 * @method getInstance
 * @param {} options options used in case the instance is already not available
 * 
 * @return loggerInstance Instance of the `simpleportal.Logger` object
 */
logger.getInstance = function(options) {
	var LoggerWrapper = require('./wrapper/logger').Logger;
	
	if(!loggerInstance)
		loggerInstance = new LoggerWrapper(options);
	
	return loggerInstance;
}

/**
 * To get the `simpleportal.Logger`.accessLog instance registered
 * 
 * @method accessLog
 * @return loggerInstance Access log stream
 */
logger.accessLog = function() {
	if(loggerInstance)
		return loggerInstance.accessLog(); 
	
	return function(){};
}

/**
 * To initialize the `simpleportal.logger` middleware
 * 
 * @method init
 * @param {} configuration Configuration for the middleware
 * @param {callback} callback The callback to excecute when complete
 */
logger.init = function(configuration, callback){
	if(configuration && configuration.logger){
		loggerInstance=null;
		
		logger.getInstance(configuration.logger);
	}

	if(callback)
		callback();
}