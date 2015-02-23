/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var logger = module.exports = {};

var loggerInstance;

logger.getInstance = function(options) {
	var LoggerWrapper = require('./wrapper/logger').Logger;
	if(!loggerInstance)
		loggerInstance = new LoggerWrapper(options);
	
	return loggerInstance;
}

logger.accessLog = function() {
	if(loggerInstance)
		return loggerInstance.accessLog(); 
	
	return function(){};
}

logger.init = function(configuration){
	console.log('Overriding the console.log method to write in to our log file...');
	
	if(configuration && configuration.logger){
		console.log('Initializing Simple Portal Logger..');
		
		loggerInstance=null;
		logger.getInstance(configuration.logger);
	}
}