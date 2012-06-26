var services = module.exports = {};

var fs = require('fs');
var util = require('./../lib/util');
var logger = require("./logger").getInstance();

var serviceUrl = '/api';
var router = require('./router');

var CRUDService = require("./../lib/wrapper/crudservice").CRUDService;

function registerServices(dir, includeindex){
	includeindex = includeindex||false;
	fs.readdirSync(dir).forEach(function(filename){
	    if (/\.js$/.test(filename)) {
	            if((includeindex && filename == 'index.js') || filename != 'index.js'){
	                var name = filename.substr(0, filename.lastIndexOf('.'));
	                var service = name;
	                if(name == 'index'){
	                	service = dir.substring(dir.lastIndexOf('/') +1, dir.length)
                    }
                    var path = fs.realpathSync(dir + '/' + name + '.js');
                    
	                services.__defineGetter__(service, function(){
                        return require(path);
	                });
	            }
	    }else{
	    	stats = fs.lstatSync(dir + '/' + filename);

		    // Is it a directory?
		    if (stats.isDirectory()) {
		    	registerServices(dir + '/' + filename, true);
		    }
	    }
	});
}
var servicedir = './services';
fs.lstat(servicedir, function(err, stats) {
	if (!err && stats.isDirectory()) {
		registerServices(servicedir, false);
	} else{
		logger.debug('Simple Portal -services', 'Services folder is not found in your root, using default..');
		registerServices(__dirname + '/../default_/services', false);
	}
});

services.services={};
services.services.service={};
services.services.service['GET /'] = function(request, response, callback){
	var result = new Array();
	for(var subModule in services){
		if(typeof services[subModule] == 'string' || typeof services[subModule] == 'function'){
		} else {
			var childServices = services[subModule].service;
			if(childServices){
				result.push(subModule);
			}
		}
	}
	callback(null, result);
};
new CRUDService({service:services, modify:true, collection:'service'});

services.initRouter = function(router){
	logger.debug('Simple Portal -services', 'Initializing the Service routers');
	router.dispatch.addServiceHandlers(services, serviceUrl, services.call);
}

services.call = function(service, method, request, response){
	logger.debug('Simple Portal -services', 'Request for service - '+ service + ' method - '+ method +' -- is made');
	
	var caller = services[service].service[method];
	if(!caller)
		for (caller in services[service].service) break;
	
	if(typeof caller == 'string')
		caller = services[service].service[caller];
	
	if(caller){
		caller(request, response, function(error, results){
			util.sendServiceResponse(response, error, results);
		});
	}else
		util.sendServiceResponse(response, 'Service Not found', {});
}