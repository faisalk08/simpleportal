"use strict";
/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal
 * MIT Licensed
 */
var connect_logger = require('connect').logger,
	fs = require('fs'),
	util = require("./../util"),
	logTypes = {
		INFO:'INFO', 
		ERROR:'ERROR', 
		WARN:'WARN', 
		ALERT:'ALERT', 
		DEBUG:'DEBUG'
	};

/**
 * Server console can be written to a filestream or directly to the console, with standard log formats
 * 
 	//During Server start
 	var logger = new simpleportal.Logger({root:'../log', access:'access.log', log:'simple_node.log',"console":"true"});
 	
 * @class Logger
 * @module simpleportal
 * @submodule wrapper
 * 
 * @constructor
 * @param {} options Configuration for the Logger
 * 
 * @return instance Instance created 
 */
var Logger = function(options) {
	var instance = this;
	instance.options = util.extendJSON({root:'../log', access:'access.log', log:'simple_node.log', "console":"true"}, options);
	
	if(instance.options.stream && instance.options.stream == 'file'){
		init(instance);
	}
	
	return instance;
};

/**
 * Method for writing or throwing the message on to the console
 * 
 * @method log
 * 
 * @param {} logClass Name for the logsource
 * 
 * @param {} type Type of the log message (INFO,DEBUG,WARN,ERROR)
 * @param {} message Message you want to be logged
 * 
 * @private 
 */
Logger.prototype.log = function(logClass, type, message, colorpre, colorpost){
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
	
	if(typeof message == 'object' && message.message)
		message = message;
	else if(typeof message !== 'string')
		message = JSON.stringify(message);
	
	var logMessage = time + ' ' + type + ': ' + logClass + message;

	if(instance.logStream)
		instance.logStream.log(logMessage);
	
	if(instance.options.console && colorpre && colorpost){
		console.log(colorpre, logMessage, colorpost);
	}else
		console.log(logMessage);
}

/**
 * Method for throwing the info message
 * 
 * @method info
 * @param {} module for the logsource
 * @param {} message Message you want to be logged
 * 
 */
Logger.prototype.info = function(module, message){
	var instance = this;
	
	if(instance.options.logtype == 'debug' || instance.options.logtype == 'info')
		instance.log(module, logTypes['INFO'], message);	
};

/**
 * Method for throwing the error message
 * 
 * @method error
 * 
 * @param {} module for the logsource
 * @param {} message Message you want to be logged
 */
Logger.prototype.error = function(module, message){
	var instance = this;
	if(typeof message == 'object' && typeof message.length == "number")
		message.forEach(function(message_){
			instance.error(module, message_)	
		});
	else {
		console.trace(message);
		instance.log(module, logTypes['ERROR'], message, '\x1b[31m\x1b[1m', '\x1b[22m\x1b[0m');
	}
};

/**
 * Method for throwing the ALERT message
 * 
 * @method alert
 * 
 * @param {} module for the logsource
 * @param {} message Message you want to be logged
 */
Logger.prototype.alert = function(module, message){
	var instance = this;
	
	instance.log(module, logTypes['ALERT'], message);	
};

/**
 * Method for throwing the WARN message
 * 
 * @method warn
 * 
 * @param {} module for the logsource
 * @param {} message Message you want to be logged
 */
Logger.prototype.warn = function(module, message){
	var instance = this;
	
	instance.log(module, logTypes['WARN'], message, '\x1b[93m\x1b[1m', '\x1b[0m');	
};

/**
 * Method for throwing the DEBUG message
 * 
 * @method debug
 * 
 * @param {} module for the logsource
 * @param {} message Message you want to be logged
 */
Logger.prototype.debug = function(module, message){
	var instance = this;
	
	if(instance.options.logtype == 'debug')
		instance.log(module, logTypes['DEBUG'], message);	
};

/**
 * Method for getting the access log stream
 * 
 * @method accessLog
 * 
 * @private
 */
Logger.prototype.accessLog = function(){
	var instance = this;
	
	if(instance.accessLogStream)
		return connect_logger({stream:instance.accessLogStream});
	else
		return connect_logger();
};

Logger.prototype.setConfiguration = function(key, value){
	var instance = this;
	
	if ((key == "logtype" || key == "console") && value)
		instance.options[key] = value
};

/**
 * Private function for initializing the logger
 */
function init(instance){
	if (!fs.existsSync(instance.options.root)) {
		util.checkDirSync(instance.options.root);
	}
	
	var datetime = new Date();
	
	var date_ = datetime.getFullYear() + "-" + (datetime.getMonth()+1) + "-" + (datetime.getDate());
	var time_ = datetime.getHours() + "-" + datetime.getMinutes();
	
	util.checkDirSync(instance.options.root + "/" + date_);
	
	var accessreader=fs.createReadStream(instance.options.root +  '/' + instance.options.access);
	var servicereader=fs.createReadStream(instance.options.root +  '/' + instance.options.log);
	
	if(!fs.existsSync(instance.options.root +  '/' + instance.options.log))
		fs.writeFileSync(instance.options.root +  '/' + instance.options.log, '');
	else {
		accessreader.pipe(fs.createWriteStream(instance.options.root +  '/' + date_ + "/" + time_+ "-" + instance.options.log));
	}

	if(!fs.existsSync(instance.options.root +  '/' + instance.options.access))
		fs.writeFileSync(instance.options.root +  '/' + instance.options.access, '');
	else{
		servicereader.pipe(fs.createWriteStream(instance.options.root +  '/' + date_ + "/" + time_+ "-" + instance.options.access));
	}
	
	servicereader.on('end', function() {
	  	instance.logStream = fs.createWriteStream(instance.options.root +  '/' + instance.options.log);
	  	
	  	instance.logStream.log = function(logMessage){
			instance.logStream.write(logMessage + '\n');
		}
	});
	
	accessreader.on('end', function() {
	  	instance.accessLogStream = fs.createWriteStream(instance.options.root + '/' + instance.options.access);
	});
	
	instance.info('Logger', 'logger is ready');
}

/**
 * Private function for initializing the logger
 */
function init(instance){
	if (!fs.existsSync(instance.options.root)) {
		util.checkDirSync(instance.options.root);
	}
	
	var datetime = new Date();
	
	var date_ = datetime.getFullYear() + "-" + (datetime.getMonth()+1) + "-" + (datetime.getDate());
	var time_ = datetime.getHours() + "-" + datetime.getMinutes();
	
	var accessreader=fs.createReadStream(instance.options.root +  '/' + instance.options.access);
	var servicereader=fs.createReadStream(instance.options.root +  '/' + instance.options.log);
	
	if(!fs.existsSync(instance.options.root +  '/' + instance.options.log)) {
		fs.writeFileSync(instance.options.root +  '/' + instance.options.log, '');
	} else {
		util.checkDirSync(instance.options.root + "/" + date_);
		
		accessreader.pipe(fs.createWriteStream(instance.options.root +  '/' + date_ + "/" + time_+ "-" + instance.options.log));
	}

	if(!fs.existsSync(instance.options.root +  '/' + instance.options.access)) {
		fs.writeFileSync(instance.options.root +  '/' + instance.options.access, '');
	}else {
		util.checkDirSync(instance.options.root + "/" + date_);
		servicereader.pipe(fs.createWriteStream(instance.options.root +  '/' + date_ + "/" + time_+ "-" + instance.options.access));
	}
	
	servicereader.on('end', function() {
	  	instance.logStream = fs.createWriteStream(instance.options.root +  '/' + instance.options.log);
	  	
	  	instance.logStream.log = function(logMessage){
			instance.logStream.write(logMessage + '\n');
		}
	});
	
	accessreader.on('end', function() {
	  	instance.accessLogStream = fs.createWriteStream(instance.options.root + '/' + instance.options.access);
	});
	
	instance.info('Logger', 'logger is ready');
};

module.exports = {Logger:Logger};