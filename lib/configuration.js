/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */
/**
 * Configuration middleware for `simpleportal.Server`
 * 
 * @class configuration
 * @module middleware
 * @static
 */
var configuration = module.exports = {};

var util = require('./util');
var os = require("os");

var values = {};
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

var _defaults ={
	port:9615, 
	resources:{
		root: __dirname + '/../default_/resources/', 
		template:{
			root:"public/templates",
            layout:"layout"
		}
	}
}

configuration.file = util.getServerPath(configuration_file);

/**
 * To initialize the middleware
 * 
 * @method init
 * @param {} callback
 */
configuration.init = function(callback){
	util.readFile(configuration_file, function(err, configuration){
		if(err){
			console.log('Configuration file not found!!!');
			callback(_defaults);
		}else{
			values = JSON.parse(configuration);
			if(!values.resources){
				values.resources=_defaults.resources;
			}
			if(!values.port)
				values.port=_defaults.port;
			
			require('./logger').init(values);
				
			callback(values);
		}
	});
}

/**
 * Configuration middleware for `simpleportal.Server`
 *
 * @property configuration
 * @for simpleportal
 * @type {configuration}
 * @static
 */