var services = module.exports = {};

var fs = require('fs');

var simpleportal = require('./simpleportal');
var util = require('./util');
var logger = require("./logger");

services.serviceUrl = '/api';
var router = require('./router');

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
		logger.getInstance().debug('Simple Portal -services', 'Services folder is not found in your root, using default..');
		registerServices(__dirname + '/../default_/services', false);
	}
});

services.services={};
services.services.service={};

function getServiceDetails(servicename){
	var servicedetails;
	if(typeof services[servicename] == 'string' || typeof services[servicename] == 'function'){
	} else {
		var service_=services[servicename];
		var childServices = service_.service;
		if(childServices&&servicename !='services'){
			var serviceparams=service_;
			
			var urlservices=[];
			if (serviceparams.service) {
				for(var key in serviceparams.service){
					var keyparts =key.split('/');
					var method = 'GET';
					var uri = '/';
					
					if(keyparts.length > 1)
						method = keyparts[0].trim();
					
					if(keyparts.length > 1)
						uri = key.substring(method.length +1, key.length).trim();
					
					urlservices.push({method:method, uri:uri});
					
					servicedetails={
						primaryKey:serviceparams.primaryKey,
						primaryKeyFields:serviceparams.primaryKeyFields,
						remoteservice:serviceparams.remoteservice,
						modify:serviceparams.modify,
						dbid:serviceparams.dbid, 
						collection:serviceparams.collection, 
						name:serviceparams.name, 
						model:serviceparams.model, 
						services:urlservices, 
						configuration:serviceparams.configuration
					};
				}
			}
		}
	}
	
	return servicedetails;
}
services.services.service['GET /:id'] = function(request, response, callback){
	callback(null, getServiceDetails(request.pathGroup))
}

services.services.service['GET /'] = function(request, response, callback){
	var result =[];
	for(var subModule in services){
		var details = getServiceDetails(subModule);
		if(details)
			result.push(details);
	}
	callback(null, result);
};

new simpleportal.CRUDService({service:services, modify:true, collection:'service'});

services.initRouter = function(router){
	logger.getInstance().debug('Simple Portal -services', 'Initializing the Service routers');
	router.dispatch.addServiceHandlers(services, services.serviceUrl, services.call);
	router.dispatch.addServiceGlobalHandlers(services, services.serviceUrl, services.call);
}

services.call = function(service, method, request, response, next){
	if(!services[service])
		if(next)
			next();
		else{
			util.sendServiceResponse(response, 'Service Not found', {});
			return;
		}
	else{
		var caller = services[service].service[method];
		if(!caller)
			if(next)
				next();
			else{
				util.sendServiceResponse(response, 'Service Not found', {});
				return;
			}
			//for (caller in services[service].service) break;
		else{
			if(typeof caller == 'string')
				caller = services[service].service[caller];
			
			if(caller){
				logger.getInstance().debug('Simple Portal -services', 'Request for service - '+ service + ' method - '+ method +' -- is made');
				
				caller(request, response, function(error, results, headers){
					util.sendServiceResponse(response, error, results, headers);
				});
			}else
				util.sendServiceResponse(response, 'Service Not found', {});
		}
	}
}