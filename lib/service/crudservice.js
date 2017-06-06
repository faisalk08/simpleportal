"use strict";

/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012-2017 Faisal Kottarathil(admin@simpleportaljs.com)
 *	
 * MIT Licensed
 */
var logger = require("./../logger");

//var CRUDService = module.exports = function CRUDService(options) {
/**
 * CRUDService for connecting to database or a remote api
 *
 * @class CRUDService
 * @module simpleportal
 * @submodule wrapper
 * 
 * @constructor
 * @param options The options object
 */
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

/**
 * Init method for the service, will be called by the Simpleportal server 
 * 
 * @method init
 * 
 * @param configuration The configuration specific to the API Service
 * @param {callback} callback The callback to excecute when complete
 * @private
 */
CRUDService.prototype.init = function(configuration, callback){};

/**
 * Register method for Read only Service
 * 
 * @method registerR
 * @private
 */
CRUDService.prototype.registerR = function(){
    var instance = this;
    var service = instance.service;
    
    if(service.beforeSearchCallback){
    	/**
    	 * To search for records
    	 * 
    	 * @method searchWithBeforeCallback
    	 * @param {} query
    	 * @param {callback} callback The callback to excecute when complete
    	 * @param {} options
    	 */
    	service.search = function(query, callback, options){
            options = options||instance.defaultsort;
            service.getLocalCache().find(query, function(error, result){
            	service.beforeSearchCallback(error, result, callback);	
            }, options);
        }
    }else
	    /**
	     * To search for records
	     * @method search
	     * @param {} query
	     * @param {callback} callback The callback to excecute when complete
	     * @param {} options
	     * @return 
	     */
	    service.search = function(query, callback, options){
	        options = options||instance.defaultsort;
	        service.getLocalCache().find(query, callback, options);
	    }

    if(service.beforeDetailsCallback){
    	/**
    	 * To get details of a record
    	 * @method detailsWithbeforeDetailsCallback
    	 * @param {} id
    	 * @param {callback} callback The callback to excecute when complete
    	 * @return 
    	 */
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
    	/**
    	 * To get details of a record
    	 * @method details
    	 * @param {} id
    	 * @param {callback} callback The callback to excecute when complete
    	 * @return 
    	 */
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

    if(!service.service['GET /']){
    	/**
    	 * API : /
    	 * @method API /
    	 * @param {} id
    	 * @param {callback} callback The callback to excecute when complete
    	 * @return 
    	 */
	    service.service['GET '] = function(request, response, callback) {
	    	service.search({}, callback, instance.defaultsort);
	    };
	}

    if(!service.service['GET /:id']){
    	/**
    	 * API : /
    	 * @method API /:id
    	 * @param {} id
    	 * @param {callback} callback The callback to excecute when complete
    	 * @return 
    	 */
    	service.service['GET /:id'] = function(request, response, callback) {
	        service.details(request.pathGroup, callback, 'true');
	    };
    }
    
    if(!service.service['GET /:id/next']){
    	/**
    	 * API : /
    	 * @method API /:id
    	 * @param {} id
    	 * @param {callback} callback The callback to excecute when complete
    	 * @return 
    	 */
    	service.service['GET /:id/next'] = function(request, response, callback) {
	        service.details(request.pathGroup, callback, 'true');
	    };
    }
};

/**
 * To register the Service
 * 
 * @method registerCUD
 * @private
 */
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