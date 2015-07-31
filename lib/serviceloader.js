/**
 * Service | API loader middleware for `simpleportal.Server`
 *
 * @property serviceloader
 * @for simpleportal
 * @type {serviceloader}
 * @static
 */

/**
 * Service | API loader middleware for `simpleportal.Server`
 * 
 * @class serviceloader
 * @module middleware
 */
var ServiceLoader = module.exports = {};

var fs = require('fs');

var simpleportal = require('./simpleportal');
var util = require('./util');
var logger = require("./logger");

var router = require('./router');

ServiceLoader.serviceUrl = '/api';
ServiceLoader.servicedir = 'api';

/**
 * Description
 * @method registerService
 * @param {} file
 * @param {} configuration
 * @param {} dbInstance
 * @param {} callback
 * @return 
 */
function registerService(file, configuration, dbInstance, callback){
	logger.getInstance().info('Simple Portal : serviceloader', 'registerService  -- ' + file);
	
	if( fs.existsSync(file) && /\.js$/.test(file)){
		var path = fs.realpathSync(file);
		
		var startindex=0;
		
		if(file.lastIndexOf('/') >= 0)
			startindex=file.lastIndexOf('/')+1;
		
		var name = file.substring(startindex, file.lastIndexOf('.js'));
		
        var service = name;
        
        if(name == 'index'){
        	service = file.substring(file.lastIndexOf('/') +1, (file.length-1))
        }
        
        if(ServiceLoader[service]){
        	callback('Service - ' +service+ ' already registered');
        }else{
        	ServiceLoader.__defineGetter__(service, function(){
                return require(path);
            });
            
            ServiceLoader.updateServiceRouter(ServiceLoader[service], configuration, dbInstance);
            
            callback();
        }
	}else
		callback('No such service file found - ' + file);
}

/**
 * Description
 * @method getServices
 * @param {} dir
 * @param {} includeindex
 * @return services
 */
function getServices(dir, includeindex){
	includeindex = includeindex||false;
	var services = [];
	
	if(fs.existsSync(dir)){
		fs.readdirSync(dir).forEach(function(filename){
		    if (/\.js$/.test(filename)) {
	            if((includeindex && filename == 'index.js') || filename != 'index.js'){
	                var name = filename.substr(0, filename.lastIndexOf('.'));
	                var service = name;
	                if(name == 'index'){
	                	service = dir.substring(dir.lastIndexOf('/') +1, dir.length)
	                }
	                var path = fs.realpathSync(dir + '/' + name + '.js');
	                
	                services.push({path:path, name:service});
	            }
		    }else if(!/^\./.test(filename)){
		    	stats = fs.lstatSync(dir + '/' + filename);

			    // Is it a directory?
			    if (stats.isDirectory()&&!(filename=='html5'||filename=='lib'||filename=='util'||filename=='models'||filename=='views')) {
			    	var subservices = getServices(dir + '/' + filename, true);
			    	if(subservices.length > 0)
			    		for(var i in subservices)
			    			services.push(subservices[i]);
			    }
		    }
		});	
	}
	
	return services;
}

/**
 * Description
 * @method loadService____
 * @param {} servicprops
 * @return 
 */
function loadService____(servicprops){
	logger.getInstance().info('Simple Portal -ServiceLoader', 'loadService____  -- ' + servicprops.name);
	
	if(!ServiceLoader[servicprops.name]){
		ServiceLoader.__defineGetter__(servicprops.name, function(){
            return require(servicprops.path);
        });
	}
}

/**
 * Description
 * @method unLoadServices
 * @param {} dir
 * @param {} includeindex
 * @param {} callback
 * @return 
 */
function unLoadServices(dir, includeindex, callback){
	var servicesfound = getServices(dir, includeindex);
	
	var totcount = servicesfound.length;
	var fincount =0;
	if(servicesfound && servicesfound.length > 0)
		for(var i in servicesfound){
			var servicprops =servicesfound[i];
			delete ServiceLoader[servicprops.name];
		}
	
	if(callback)
		callback();
}

/**
 * Description
 * @method loadServices
 * @param {} dir
 * @param {} includeindex
 * @param {} callback
 * @return 
 */
function loadServices(dir, includeindex, callback){
	var servicesfound = getServices(dir, includeindex);
	
	var totcount = servicesfound.length;
	var fincount =0;
	
	if(servicesfound&&servicesfound.length > 0)
		for(var i in servicesfound){
			var servicprops =servicesfound[i];
			loadService____(servicprops);
			
			if(totcount-1 == fincount++)
				if(callback)
					callback();
		}
	else if(callback)
		callback();
}

/**
 * Description
 * @method loadServices
 * @param {} configuration
 * @param {} callback
 * @return 
 */
ServiceLoader.loadServices = function(configuration, callback){
	var servicedir_ = configuration&&configuration.servicedir ?  configuration.servicedir : ServiceLoader.servicedir;
	logger.getInstance().info('Simple Portal : serviceloader', 'loadServices  -- ' + servicedir_);
	
	if(!fs.existsSync(servicedir_)){
		if(callback)
			callback();	
	}else {
		var stats = fs.lstatSync(servicedir_);
		if (stats.isDirectory()) {
			if(ServiceLoader.configuration&&ServiceLoader.configuration.services&&configuration&&configuration.services){

				// we need to make sure we are not deleting any configuration
				if(configuration.services&&configuration.services.extend){
					// inherit it not extend
					delete configuration.services.extend;
				}
				simpleportal.util.extendJSON(ServiceLoader.configuration.services, configuration.services);
			}
			
			loadServices(servicedir_, false, callback);
		}else if(callback)
			callback();	
	}
}

/**
 * Description
 * @method unLoadServices
 * @param {} configuration
 * @param {} callback
 * @return 
 */
ServiceLoader.unLoadServices = function(configuration, callback){
	var servicedir_ = configuration&&configuration.servicedir ?  configuration.servicedir : ServiceLoader.servicedir;
	logger.getInstance().info('Simple Portal : serviceloader', 'loadServices  -- ' + servicedir_);
	if(!fs.existsSync(servicedir_)){
		if(callback)
			callback();	
	}else{
		var stats = fs.lstatSync(servicedir_);
		if (stats.isDirectory()) {
			unLoadServices(servicedir_, false, callback);
		}else if(callback)
			callback();
	}
}

ServiceLoader.services={};
ServiceLoader.services.service={};

/**
 * Description
 * @method getServiceDetails
 * @param {} servicename
 * @return servicedetails
 */
function getServiceDetails(servicename){
	var servicedetails;
	if(typeof ServiceLoader[servicename] == 'string' || typeof ServiceLoader[servicename] == 'function'){
	} else {
		var service_=ServiceLoader[servicename];
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

ServiceLoader.services.service['POST /'] = function(request, response, callback){
	callback('No function to upload the service!!');
}

ServiceLoader.services.service['POST /:id/register'] = function(request, response, callback){
	if(request.user.role&&request.user.role=='superadmin')
		registerService(servicedir+ '/' + request.pathGroup + '.js', ServiceLoader.configuration, ServiceLoader.dbInstance, function(error){
			if(!error)
				callback(error, 'Your service - '+ request.pathGroup  + 'registered successfully');
			else
				callback(error);
		});
	else
		callback('Permission denied');
}

ServiceLoader.services.service['GET /:id'] = function(request, response, callback){
	if(request.user.role&&request.user.role=='superadmin')
		callback(null, getServiceDetails(request.pathGroup))
	else
		callback('Permission denied');
}

ServiceLoader.services.service['GET /'] = function(request, response, callback){
	if(request.user.role&&request.user.role=='superadmin'){
		var result =[];
		for(var subModule in ServiceLoader){
			var details = getServiceDetails(subModule);
			if(details)
				result.push(details);
		}
		callback(null, result);
	} else
		callback('Permission denied');
};

/**
 * Function called after Simpleportal server init 
 * 
 * @method initRouter
 * 
 * @param {} router
 * @param {} callback
 */
ServiceLoader.initRouter = function(router, callback){
	logger.getInstance().info('Simple Portal - ServiceLoader : initRouter', 'Initializing ServiceLoader routers');
	
	router.dispatch.addServiceHandlers(ServiceLoader, ServiceLoader.serviceUrl, ServiceLoader.call);
	router.dispatch.addServiceGlobalHandlers(ServiceLoader, ServiceLoader.serviceUrl, ServiceLoader.call);
	
	if(callback)
		callback();
}

/**
 * Description
 * @method updateServiceRouter
 * @param {} service
 * @param {} configuration
 * @param {} dbInstance
 * @return 
 */
ServiceLoader.updateServiceRouter = function(service, configuration, dbInstance){
	logger.getInstance().info('Simple Portal -ServiceLoader', 'Updating the Service routers ');

	//service.init(configuration, dbInstance);
	//service.startup();
	
	if(ServiceLoader.configuration&&ServiceLoader.configuration.services&&configuration&&configuration.services){
		simpleportal.util.extendJSON(ServiceLoader.configuration.services, configuration.services);
	}
	
	//var serviceurl = ServiceLoader.serviceUrl;
    	
	//router.dispatch.addServiceHandlers(service, serviceurl, ServiceLoader.call);
	//router.dispatch.addServiceGlobalHandlers(service, serviceurl, ServiceLoader.call);
}

/**
 * Description
 * @method call
 * @param {} service
 * @param {} method
 * @param {} request
 * @param {} response
 * @param {} next
 * @return 
 */
ServiceLoader.call = function(service, method, request, response, next){
	if(!ServiceLoader[service])
		if(next)
			next();
		else{
			util.sendServiceResponse(response, 'Service Not found', {});
			return;
		}
	else{
		var caller = ServiceLoader[service].service[method];
		if(!caller)
			if(next)
				next();
			else{
				util.sendServiceResponse(response, 'Service Not found', {});
				return;
			}
			//for (caller in ServiceLoader[service].service) break;
		else{
			if(typeof caller == 'string')
				caller = ServiceLoader[service].service[caller];
			
			if(caller){
				logger.getInstance().info('Simple Portal -ServiceLoader', 'Request for service - '+ service + ' method - '+ method +' -- is made');
				
				caller(request, response, function(error, results, headers){
					util.sendServiceResponse(response, error, results, headers);
				});
			}else
				util.sendServiceResponse(response, 'Service Not found', {});
		}
	}
}

/**
 * Description
 * @method updateConfiguration
 * @param {} configuration
 * @return 
 */
ServiceLoader.updateConfiguration=function(configuration){
	ServiceLoader.configuration=configuration;
}

/**
 * To register services 
 * 
 * @method __registerServices
 * 
 * @param {} servicedir
 * @param {} services
 * @param {} configuration
 * @param {} callback
 * 
 * @private
 */
__registerServices=function(servicedir, services, configuration, callback){
	var __registerServices_count = services.length;
	var __registerServices_fincount =0;
	
	for(var i in services)
		registerService(services[i], configuration, ServiceLoader.dbInstance, function(error){
			if(error)
				errors.push(error);
			
			if( __registerServices_fincount++ == __registerServices_count-1 )
				callback(errors);
		});
}

/**
 * Description
 * @method registerServices
 * @param {} servicedir
 * @param {} configuration
 * @param {} callback
 * @return 
 */
ServiceLoader.registerServices=function(servicedir, configuration, callback){
	logger.getInstance().info('Simple Portal : serviceloader', 'registerServices  -- ' + servicedir);
	
	if(fs.readdirSync(servicedir).length == 0)
		callback();
	else{
		var services_ = 
		fs.readdirSync(servicedir).forEach(function(filename){
			if(/\.js$/.test(filename)){
				services_.push(servicedir+ '/' + services[i]);
			}
		});
		
		__registerServices(services_, configuration, callback);
	}
};

new simpleportal.CRUDService({service:ServiceLoader, modify:true, collection:'service', userrole:'superadmin'});