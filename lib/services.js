var services = module.exports = {};

var fs = require('fs');
var util = require('./../lib/util');

var serviceUrl = '/services';

//fs.readdirSync(__dirname + '/../services').forEach(function(filename){
var servicedir = './services';
fs.lstat(servicedir, function(err, stats) {
	if (!err && stats.isDirectory()) {
		fs.readdirSync(servicedir).forEach(function(filename){	
	        if (/\.js$/.test(filename)) {
	        	if(filename != 'index.js'){
	        		var name = filename.substr(0, filename.lastIndexOf('.'));
	                services.__defineGetter__(name, function(){
	                	return require('../services/' + name);
	                });
	        	}
	        }
		});
	} else{
		console.log('Services folder is not found in your root, using default..');
		
		fs.readdirSync(__dirname + '/../default_/services').forEach(function(filename){	
	        if (/\.js$/.test(filename)) {
	        	if(filename != 'index.js'){
	        		var name = filename.substr(0, filename.lastIndexOf('.'));
	                services.__defineGetter__(name, function(){
	                	return require(__dirname + '/../default_/services/' + name);
	                });
	        	}
	        }
		});
	}
});



services.initRouter = function(router){
	console.log('Initializing the Service routers');
	
	router.dispatch.addServiceHandlers(services, serviceUrl, services.call);
}

services.call = function(service, method, request, response){
	console.log('request for service - '+ service + ' method - '+ method +' -- is made');
	
	services[service].service[method](request, response, function(error, results){
		util.sendServiceResponse(response, error, results);
	});
}