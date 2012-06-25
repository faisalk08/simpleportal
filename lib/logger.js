/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var logger = module.exports = {};

var LoggerWrapper = require('./wrapper/logger').Logger;
var loggerInstance;

logger.getInstance = function(options) {
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
	console.log_ = console.log;
	
	if(configuration && configuration.logger){
		console.log('Initiaizing Simple Portal Logger..');
		logger.getInstance(configuration.logger);

		console.log = function(message){
			loggerInstance.log(message);
		};
	}
	
}