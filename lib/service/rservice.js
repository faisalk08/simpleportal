"use strict";
var DbUtil = require("./../util/db");

/**
 * Read only service for connecting to database or a remote api 
 * 
 * @class Service.RService
 * @constructor
 * 
 * @param {} superService Parent service 
 * @param {} options Options for the service
 * 
 * @private
 */
var RService = module.exports = function(superService, options){
	var instance = this;
	  
	instance.service = superService;
};

/**
 * To search data from the backend service
 * @method search
 * 
 * @param {} query JSON Query to search  
 * @param {callback} callback The callback to excecute when complete
 * @param {} options Configuration for the DB
 */
RService.prototype.search = function(query, callback, options, searchoptions){
	var instance = this;
	options = options||{};
	
	if(query && query.start && query.end && instance.service.model && !instance.service.model['start']){
		delete query.start;delete query.end;
	}
	
	if(instance.service['beforeSearchCallback']){
		instance.service.getStorageService().find(query, function(error, result){
			instance.service.beforeSearchCallback(error, result, callback);	
	    }, options, searchoptions);	
	}else
		instance.service.getStorageService().find(query, callback, options, searchoptions);
};

/**
 * To get the count of records available in the backend service
 * 
 * @method count 
 * @param {} query JSON Query to search  
 * @param {callback} callback The callback to excecute when complete
 * @param {} options Configuration for the DB or remote server
 */
RService.prototype.count = function(query, callback, options){
	var instance = this;
	
	options = options||{};
	
	instance.service.getStorageService().count(query, callback, options);
};

/**
 * To get the distinct values of a particular field in the backend service
 * 
 * @method distinct 
 * @param {} query JSON Query to search  
 * @param {callback} callback The callback to excecute when complete
 * @param {} options Configuration for the DB or remote server
 */
RService.prototype.distinct = function(query, callback, options){
	var instance = this;
	
	options = options||{};
	
	var field;
	if(query.field){
		field = query.field;
		delete query.field;
	}
	
	if(field)
		instance.service.getStorageService().distinct(field, query, callback, options);
	else
		callback("Please mention a valid field!.")
};

/**
 * To get the distinct values of a particular field in the backend service
 * 
 * @method distinct 
 * @param {} query JSON Query to search  
 * @param {callback} callback The callback to excecute when complete
 * @param {} options Configuration for the DB or remote server
 */
RService.prototype.aggregate = function(query, callback, options){
	var instance = this;
	
	options = options||{};
	
	instance.service.getStorageService().aggregate(query, callback, options);
};

/**
 * To get the details of a record
 * 
 * @method details
 * @param {} id id of the record you want to get details  
 * @param {callback} callback The callback to excecute when complete
 * @param {} options Configuration for the database
 */
RService.prototype.details = function(id, callback, options){
	var instance = this;
	options = options||{};
	
	var query = {};
	if(id && typeof id == 'object')
		query = id; 
	else if(instance.service.primaryKeyType == 'Number')
		query[instance.service.primaryKey]=Number(id);
	else if (instance.primaryKeyType == 'BSONUUID')
		query[instance.primaryKey] = DbUtil.getObjectId(id);
	else
		query[instance.service.primaryKey]=id;

	if (id) {
    	if(instance.service['beforeDetailsCallback'])
    		instance.service.getStorageService().findOne(query, function(error, result){
    			if ((error || (!result|| result == '')) && query != id && query[instance.service.primaryKey]&&(query[instance.service.primaryKey].length == 12||query[instance.service.primaryKey].length == 24)){
    				try{
    					instance.details({_id:DbUtil.getObjectId(query[instance.service.primaryKey])}, callback, options);
    				}catch(error){
    					callback(error+''/*JSON.stringify(error)*/);
    				}
    			}else if (!result || result == '')
                    callback("There is no result found for the id " + JSON.stringify(id));
    			else
    				instance.service.beforeDetailsCallback(error, result, callback);	
    	    }, options);
    	else{
    		instance.service.getStorageService().findOne(query, function(error, result){
    			if ((error || (!result || result == '')) && query != id && query[instance.service.primaryKey] &&(query[instance.service.primaryKey].length == 12||query[instance.service.primaryKey].length == 24)){
    				try{
    					instance.details({_id:DbUtil.getObjectId(query[instance.service.primaryKey])}, callback, options);
    				}catch(error){
    					callback(error+''/*JSON.stringify(error)*/);
    				}
    			}else if (!result || result == '') {
                    callback("There is no result found for the id " + JSON.stringify(id));
    			} else
    				callback(error, result);
    	    }, options);
    	}
    } else if(callback){
        callback("Please enter id for getting the details.");
    }
};