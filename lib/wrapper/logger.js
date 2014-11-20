/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var connect_logger = require('connect').logger;

var logTypes = {INFO:'INFO',ERROR:'ERROR', WARN:'WARN', ALERT:'ALERT', DEBUG:'DEBUG'};

var fs = require('fs');

var Logger = function(options) {
	var instance = this;
	instance.options = options||{root:'../log', access:'access.log', log:'simple_node.log'};
	
	if(instance.options.stream && instance.options.stream == 'file'){
		init();
	}
		
	function init(){
		if (!fs.existsSync(instance.options.root)) {
			fs.mkdirSync(instance.options.root);
		}
		
		instance.accessLogStream = fs.createWriteStream(instance.options.root + '/' + instance.options.access);
		instance.logStream = fs.createWriteStream(instance.options.root +  '/' + instance.options.log);
		
		instance.logStream.log = function(logMessage){
			instance.logStream.write(logMessage + '\n');
		}
		instance.info('Simple Node Logger', 'Logger is Created successfully!!!');
	}
	
	return instance;
};

Logger.prototype.log = function(logClass, type, message){
	var instance = this;
	
	var args = Array.prototype.slice.call(arguments);  
	type = type || 'INFO';
	
	if(args.length == 2){
		message = args[1];
		type = args[0];
		logClass = '';
	} else if(args.length == 1){
		message = args[0];
		type = 'INFO';
		logClass = '';
	} else if(args.length == 3){
		message = args[2];
		type = args[1];
		logClass = args[0];
	}

	var time = new Date().toUTCString();
	
	if(logClass)
		logClass = ' [' +logClass+ '] ';
	else
		logClass = '';
	
	if(typeof message)
		message = JSON.stringify(message);
	
	var logMessage = time + ' ' + type + ': ' + logClass + message;

	if(instance.logStream)
		instance.logStream.log(logMessage);
	else if(console.log_)
		console.log_('LOGGER-' + logMessage);
}

Logger.prototype.info = function(module, message){
	var instance = this;
	instance.log(module, logTypes['INFO'], message);	
}

Logger.prototype.error = function(module, message){
	var instance = this;
	instance.log(module, logTypes['ERROR'], message);	
}

Logger.prototype.alert = function(module, message){
	var instance = this;
	instance.log(module, logTypes['ALERT'], message);	
}

Logger.prototype.warn = function(module, message){
	var instance = this;
	instance.log(module, logTypes['WARN'], message);	
}

Logger.prototype.debug = function(module, message){
	var instance = this;
	instance.log(module, logTypes['DEBUG'], message);	
}

Logger.prototype.accessLog = function(){
	var instance = this;
	
	if(instance.accessLogStream)
		return connect_logger({stream:instance.accessLogStream});
	else
		return connect_logger();
}

exports.Logger = Logger;