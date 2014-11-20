/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var logger = require("./../logger");

//var CRUDService = module.exports = function CRUDService(options) {
var CRUDService = function(options) {
    var instance = this;

    instance.service = options.service;
    instance.modify = options.modify||false;
    instance.defaultsort = options.defaultsort;
    instance.collection = options.collection;

    instance.init();
    if(instance.collection){
        instance.service['getLocalCache'] = function(){
            var dbInstance = instance.dbInstance||db.getInstance();
            localCache = new db.LocalCache(dbInstance, instance.collection);
            return localCache;
        }
    }

    if(instance.service['getLocalCache']){
        instance.registerR();
        if(instance.modify){
            instance.registerCUD();
        }
    } else{
    	logger.getInstance().warn('CRUDService Wrapper', this + 'No method for getLocalCache');
    }
};

CRUDService.prototype.init = function(){};
CRUDService.prototype.registerR = function(){
    var instance = this;
    var service = instance.service;
    if(service.beforeSearchCallback){
    	service.search = function(query, callback, options){
            options = options||instance.defaultsort;
            service.getLocalCache().find(query, function(error, result){
            	service.beforeSearchCallback(error, result, callback);	
            }, options);
        }
    }else
	    service.search = function(query, callback, options){
	        options = options||instance.defaultsort;
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
	        service.search({}, callback, instance.defaultsort);
	    };
    
    if(!service.service['GET /:id'])
	    service.service['GET /:id'] = function(request, response, callback) {
	        service.details(request.pathGroup, callback, 'true');
	    };
};

CRUDService.prototype.registerCUD = function(){
    var instance = this;
    var service = instance.service;
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
};

exports.CRUDService = CRUDService;