"use strict";
/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal
 * MIT Licensed
 */
/**
 * @class configuration
 * @module middleware
 * @static
 */
var util = require('./../util'),
	fs = require("fs");

var Configuration = module.exports = function(options){
	options = options||{};
	
	this._configuration = util.extendJSON({}, DEFAULTS);
	
	this.filename = options.filename||'configuration.json';
	
	this.defaultfile = options.defaultfile||(__dirname + "/../../server/configuration.json");
	
	return this;
};

Configuration.prototype.getConfiguration = function(){
	return this._configuration;
}

/**
 * To load the configuration
 */
Configuration.prototype.read = function(callback){
	var instance = this;
	
	readConfiguration(instance, callback);
};


/**
 * To read configuration using the configuration tag
 * @method readConfiguration
 * @param {String} configext
 * @return {object} configuration
 * @private 
 */
function readConfiguration(instance, callback){
	var file = util.getServerPath(instance.filename);
	
	var extfile = file.replace(".json", ".ext.json");
	
	// read default configuration
	__readConfiguration(instance.defaultfile, function(error, configjson){
		
		if(configjson)
			util.extendJSON(instance._configuration, configjson);
		
		__readConfiguration(file, function(error, server_configuration_file){
			
			if(server_configuration_file){
				util.extendJSON(instance._configuration, server_configuration_file);
			}
			
			// read the configuration from the given path
			__readConfiguration(extfile, function(error, server_configuration_file){
				
				if(server_configuration_file){
					instance.extfile=true;
					
					util.extendJSON(instance._configuration, server_configuration_file);
				}	

				callback(null, instance._configuration);
			});
		});
	});
}

/**
 * Read configuration from a file
 * 
 * @param configfile
 */
function __readConfiguration(configfile, callback){
	
	fs.stat(configfile, function(error, stats){
		if(stats && stats.isFile())
			util.readJSONFile(configfile, callback)
		else
			callback(error);
	});
}

/**
 * Default configuration for Simpleportal server
 * 
 * @property DEFAULTS
 * @type {object}
 */
var DEFAULTS ={
	title:'Simpleportal',
	author:'&lt;Simpleportaljs&gt;',
	port:9615, 
	
	homeuri:'/home',
	termsofserviceuri:"/terms-of-service/index.html",
	helpuri:'/home/help.html',
	
	resources:{
		root: __dirname + '/../default_/resources/', 
		template:{
			root:"public/templates",
            layout:"layout"
		},theme:{}
	}
}
