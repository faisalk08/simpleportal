/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */
var logger = require("./../logger").getInstance();

var Service = function(options) {
	var instance = this;

    instance.modify = options.modify||false;
    instance.defaultsort = options.defaultsort;
    instance.collection = options.collection;
    instance.dbInstance = options.dbInstance;
    
    instance.configuration = options.configuration||{};
    
    instance.name = options.name;
    instance.service = {};
};

Service.prototype.onStartup = function(){
}

Service.prototype.startup = function(callback){
	var instance = this;

	if(instance.configuration && instance.configuration.hasOwnProperty('callservicestartup')){
		if(!instance.configuration.hasOwnProperty('callservicestartup'))
			this.onStartup(callback);
	}else
		this.onStartup(callback);
}

Service.prototype.getLocalCache = function(){
	var instance = this;
	return instance.localCache;
}

Service.prototype.init = function(configuration, dbInstance){
	var instance = this;

	logger.info('Service Wrapper', 'Initializing service - ' + instance.name);
	
	if(configuration.services)
		instance.configuration = configuration.services[instance.name];
	
    if(dbInstance)
    	instance.dbInstance = dbInstance;
    
    if(instance.collection){
    	var dbInstance = instance.dbInstance||require('simpleportal').db.getInstance();
    	try{
            var db = require("simpleportal").db;
            var LocalCache = require("./localcache").LocalCache;
            
            instance.localCache = new LocalCache(dbInstance, instance.collection);

            registerR(instance);
            
            if(instance.modify){
                registerCUD(instance);
            }
    	}catch(error){
    		console.log(error);
    	}
	} else
		logger.warn('Sponsor Service', 'Service configuration is not done!!!');
};

Service.prototype.call = function(path, request, response, callback){
	var caller = instance.service[path];
	if(!caller)
		callback('No such method!!');
	
	if(typeof caller == 'string')
		caller = instance.service[caller];
	
	if(caller){
		caller(request, response, callback);
	}else
		callback('Service Not found');
}

Service.prototype.get = function(path, callback){
	var instance = this;
	
	if(path && path.indexOf('GET') == -1)
		path = 'GET '+path;
	instance.service[path] = callback;
}

Service.prototype.post = function(path, callback){
	var instance = this;
	
	if(path && path.indexOf('POST') == -1)
		path = 'POST '+path;
	instance.service[path] = callback;
}

function registerR(service){
	
    if(service.beforeSearchCallback){
    	service.search = function(query, callback, options){
            options = options||service.defaultsort;
            service.getLocalCache().find(query, function(error, result){
            	service.beforeSearchCallback(error, result, callback);	
            }, options);
        }
    }else
	    service.search = function(query, callback, options){
	        options = options||service.defaultsort;
	        service.getLocalCache().find(query, callback, options);
	    }

    if(service.beforeDetailsCallback){
    	service.details = function(id, callback){
    		var query = {id: id};
    		if(id && typeof id == 'object')
    			query = id;
            if (id) {
                service.getLocalCache().findOne(query, function(error, object) {
                    if (!object || object == '')
                        callback("There is no result found for the id " + id);
                    else
                    	service.beforeDetailsCallback(error, object, callback);
                });
            } else {
                callback("Please enter id for getting the details.");
            }
        }
    }else{
    	service.details = function(id, callback){
    		var query = {id: id};
    		if(id && typeof id == 'object')
    			query = id;
    		if (id) {
                service.getLocalCache().findOne(query, function(err, object) {
                    if (!object || object == '')
                        callback("There is no result found for the id " + id);
                    else
                    	callback(null, object);
                });
            } else {
                callback("Please enter id for getting the details.");
            }
        }
    }

    if(!service.service)
        service.service = {};

    if(!service.service['GET /'])
	    service.service['GET '] = function(request, response, callback) {
	        service.search({}, callback, service.defaultsort);
	    };
    
    if(!service.service['GET /:id'])
	    service.service['GET /:id'] = function(request, response, callback) {
	        service.details(request.pathGroup, callback, 'true');
	    };
};

function registerCUD(service){
    if(service['getObject'] && service['getObjectId']){
        service.add = function(request, response, callback) {
            var object = service.getObject(request);
            var id = service.getObjectId(object);

            if(id){
                object.id = id;
                service.getLocalCache().add_update({}, object, callback, service.beforeSave);
            }else
                callback('Id is mandatory to proceed..');
        }

        service.service['POST /'] = function(request, response, callback) {
            service.add(request, response, callback);
        };

        service.update = function(request, response, callback) {
            var id = request.pathGroup;
            
            var object = service.getObject(request);
            
            if(id){
                var new_id = service.getObjectId(object);

                object.id = new_id;
                service.getLocalCache().add_update({id:id}, object, callback, service.beforeSave);
            }else
                callback('Id is mandatory to proceed..');
        }

        service.service['PUT /:id'] = function(request, response, callback) {
            service.update(request, response, callback);
        };
    }    

    service.remove = function(request, response, callback) {
        var id = request.pathGroup;
        
        if (id) {
            service.getLocalCache().remove({id: id}, callback);
        } else {
            callback("Id is mandatory to proceed..");
        }
    }
    
    service.service['DELETE /:id'] = function(request, response, callback) {
        service.remove(request, response, callback);
    };
}

exports.CRUDService = Service;