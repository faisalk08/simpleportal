/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */
/**
 * Configuration middleware for `simpleportal.Server`
 * 	- uses program arguments to include following configurations
 * 		- local for using configuration.local.json
 * 		- prodcution for including configuration.prodcution.json
 * 		- staging for including configuration.staging.json
 * 	- Default will extend configuration.ext.json
 * 
 * @class configuration
 * @module middleware
 * @static
 */
var configuration = module.exports = {};

var util = require('./util'),
	template = require('./template'),
	logger = require('./logger'),
	os = require("os"),
	fs = require("fs");

/**
 * Server configuration
 * 
 * @property server_configuration
 * @type {object}
 */
var server_configuration = {};
var configuration_file = 'configuration.json';

process.argv.forEach(function (val, index, array) {
	if(index == 2 && val == 'local'||val == 'l'){
		configuration_file = 'configuration.local.json';
	}else if(index == 2 && val == 'staging'||val == 's'){
		configuration_file = 'configuration.staging.json';
	}else if(index == 2 && val == 'production'||val == 'p'){
		configuration_file = 'configuration.production.json';
	}else if(index == 2 && val == os.hostname() ){
  		configuration_file = 'configuration.'+os.hostname()+'.json';
	} else {
		configuration_file = 'configuration.json';
	}
});

/**
 * Server configuration file
 * @property file
 * @type {String}
 */
configuration.file = util.getServerPath(configuration_file);

/**
 * Server configuration extention_file <specific to the installation>
 * @property extention_file
 * @type {String}
 */
configuration.extention_file = util.getServerPath("configuration.ext.json");

/**
 * Default configuration for Simpleportal server
 * 
 * @property DEFAULTS
 * @type {object}
 */
configuration.DEFAULTS ={
	title:'Simpleportal',
	author:'&lt;Simpleportaljs&gt;',
	port:9615, 
	resources:{
		root: __dirname + '/../default_/resources/', 
		template:{
			root:"public/templates",
            layout:"layout"
		}
	}
}

/**
 * To read configuration using the configuration tag
 * @method readConfiguration
 * @param {String} configext
 * @return {object} configuration
 * @private 
 */
function readConfiguration(configext){
	var server_configuration = {};
	var configfile = 'configuration'+ (configext ? ('.' + configext) : '') + '.json';
	
	if(fs.existsSync(util.getServerPath(configfile)))
		try{
			var configstat = fs.statSync(configfile);
			
			if(configstat.isFile()){
				var fileconfiguration = util.readJSONFile(util.getServerPath(configfile));
				
				server_configuration = util.extendJSON(server_configuration, fileconfiguration);
			}
		} catch(error){
			console.log('Error while reading configuration file - ' + configfile);
			console.log(error);
		}
	
	return server_configuration;
}

/**
 * To initialize the configuration module for simpleportal
 * 
 * @method init
 * @param {} callback
 */
configuration.init = function(serverInstance, callback){
	console.log('***** ------------------------- Initializing the Configuration ------------------------- *****');
	console.log('***** ------------------------- ['+configuration.file+'] ------------------------- *****');
	
	var configcallback = callback;
	
	if(typeof serverInstance == 'function'){
		configcallback=serverInstance;
		serverInstance=null;
	}else if(serverInstance){
		if(!fs.existsSync(configuration.extention_file))
			serverInstance.enable('mode-configuration');
	}
	
	var configstat;
	server_configuration = util.extendJSON({}, configuration.DEFAULTS);
	try{
		var configstat = fs.statSync(configuration.file);
		
		if(configstat.isFile()){
			var fileconfiguration = util.readJSONFile(configuration.file);
			server_configuration = util.extendJSON(server_configuration, fileconfiguration);
			
			// now check you have more changes in the extension configuration
			var _config_extension = readConfiguration('ext');
			if(_config_extension)
				server_configuration = util.extendJSON(server_configuration, _config_extension);
			
			// initialize the logger
			logger.init(server_configuration);
		}
		
		configcallback(server_configuration);
	}catch(error){
		console.log('Error while reading configuration file - ' + configuration.file);
		console.trace();
		
		configcallback(server_configuration);	
	}
}