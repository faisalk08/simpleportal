/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var configuration = module.exports = {};

var util = require('./util');

var values = {};
var configuration_file = 'configuration.json';

process.argv.forEach(function (val, index, array) {
  if(index == 2 && val == 'local'){
	  configuration_file = 'configuration.local.json';
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
				
			callback(values);
		}
	});
}