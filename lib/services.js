var services = module.exports = {};

var fs = require('fs');
var util = require('./../lib/util');

var serviceUrl = '/services';

fs.readdirSync(__dirname + '/../services').forEach(function(filename){
        if (/\.js$/.test(filename)) {
                if(filename != 'index.js'){
                    var name = filename.substr(0, filename.lastIndexOf('.'));
                    services.__defineGetter__(name, function(){
                            return require('../services/' + name);
                    });
                }
        }
});

services.initRouter = function(router){
	console.log('Initializing the Service routers')
	
	router.dispatch.addServiceHandlers(services, serviceUrl, services.call);
}

services.call = function(service, method, request, response){
	console.log('request for service - '+ service + ' method - '+ method +' -- is made');
	
	services[service].service[method](request, response, function(error, results){
		util.sendServiceResponse(response, error, results);
	});
}