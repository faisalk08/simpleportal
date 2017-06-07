"use strict";

/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012-2017 Faisal(admin@simpleportaljs.com)
 *	
 * MIT Licensed
 */
var DbUtil = require("./../util/db"),
	util = require("./../util");

/**
 * CUDService
 * Service class for Create,Update,Delete 
 * 
 * @class Service.CUDService
 * 
 * @constructor
 * 
 * @param {} superService Parent service 
 * @param {} options Options for the service
 * 
 * @private
 */
var CUDService = module.exports = function(superService, options){
	var instance = this;
	
	instance.service = superService;
	
	return instance;
};

/**
 * To add a record to the database table|collection
 * 
 * @method add
 * 
 * @param {} request http request
 * @param {} response http response
 * @param {callback} callback The callback to excecute when complete
 * @param {} options Configuration for the database
 */
CUDService.prototype.add = function(request, response, callback, options) {
	var instance = this;
	
	options = options||{};
	
	var object = instance.service.getObject(request);
	
    var id = instance.service.getObjectId(object);
    if(object.validationmessages && object.validationmessages.length > 0){
    	callback(object.validationmessages, object);
    } else if(id){
        object.id = id;
        var query = {};
        if(request.query && request.query.add_update)
        	query = {id:id};
        if(object.hasOwnProperty('validationmessages'))
        	delete object.validationmessages;
        
        if(instance.service['afterSave'])
        	instance.service.getStorageService().add_update(query, object, function(error, result){
        		if(error)
        			callback(error, result);
        		else
        			instance.service.afterSave(error, result, callback, options);
        	}, instance.service.beforeSave, options);
        else
        	instance.service.getStorageService().add_update(query, object, callback, instance.service.beforeSave, options, request);
    }else{
        callback({id:'Id is mandatory to proceed..'});
    }
}

/**
 * To update a record in to the database
 * 
 * @method update
 * 
 * @param {} request http request
 * @param {} response http response
 * @param {callback} callback The callback to excecute when complete
 * @param {} options Configuration for the database
 */
CUDService.prototype.update = function(request, response, callback, options) {
	var instance = this;
	var id = request.pathGroup;
    
	var update_fields=[];
	var update_model;
	
	if(request.query&&request.query.update_fields)
		update_fields = request.query.update_fields;
	
	if(request.body&&request.body.update_fields)
		update_fields = request.body.update_fields;
	if(update_fields && typeof update_fields.length == 'number' && update_fields.length > 0){
		update_model={};
		for(var i in update_fields){
			update_model[update_fields[i]]='';
		}
	}
	
    var object = instance.service.getObject(request, update_model);
    
    options = options||{};
    var query = { 'id' : id };
    try{
		var o_id = DbUtil.getObjectId(id);
		query = { '_id' : o_id };
	}catch(error){
		instance.service.getLogger().error('cudservice:update-' + instance.service.name, error);
	}
	
    if(object.validationmessages && object.validationmessages.length > 0){
    	callback(object.validationmessages, object);
    } else if(id){
        var new_id = instance.service.getObjectId(object, update_model);

        object.id = new_id;

        if(object.hasOwnProperty('validationmessages'))
        	delete object.validationmessages;
        
        if(instance.service['afterSave'])
        	instance.service.getStorageService().add_update(query, object, function(error, result){
        		if(error)
        			callback(error, result);
        		else
        			instance.service.afterSave(error, result, callback, options);
        	}, instance.service.beforeSave, options);
        else
        	instance.service.getStorageService().add_update(query, object, callback, instance.service.beforeSave, options, request);
    }else
        callback('Id is mandatory to proceed..');
}

/**
 * To get the formatted object Ids from an array of nonformatted ids
 * 
 * @method getObjectIds
 * 
 * @param {Array} ids array of id strings
 * @param {} instance Service instance
 * 
 * @return obj array of formatted ids
 * @private
 */
function getObjectIds(ids, instance){
	var obj;
	if(ids&&ids.indexOf(',') != -1){
		obj=[];
		var idsarray=ids.split(',');
		for(var i in idsarray){
			var objid=getObjectIds(idsarray[i], instance);
			if(objid)
				obj.push(objid);
		}
		
		return obj;
	}else if(ids&&ids.length >0){
		if(ids && typeof ids == 'object')
			return ids; 
		else if(instance.service.primaryKeyType == 'Number')
			return Number(ids);
		else if (instance.primaryKeyType == 'BSONUUID'){
			return DbUtil.getObjectId(ids);
		}else{
			try{
				var o_id = DbUtil.getObjectId(ids);
				
				return o_id;
			}catch(error){
				return ids;
			}
		}
	}
	
	return obj;
}

/**
 * To remove a record from the database table|collection
 * 
 * @method remove
 * 
 * @param {} request http request
 * @param {} response http response
 * @param {callback} callback The callback to excecute when complete
 * @param {} options Configuration for the database
 */
CUDService.prototype.remove = function(request, response, callback, options) {
	var instance = this;
	var id = unescape(request.pathGroup);
	
	options = util.extendJSON({justOne:true}, options);
	
	var query = {};
	
	var objid;
	if(id&&id.indexOf(',') != -1) 
		objid=getObjectIds(id, instance);
	
	if(id&&id.indexOf(',') != -1 && objid &&  typeof objid=='object'){
		query={ '_id' : {$in : objid} };
		options.justOne=false;
	}else {
		if(id && typeof id == 'object')
			query = id; 
		else if(instance.service.primaryKeyType == 'Number')
			query[instance.service.primaryKey]=Number(id);
		else if (instance.service.primaryKeyType == 'BSONUUID'){
			query[instance.service.primaryKey]=DbUtil.getObjectId(id);
		}else
			query[instance.service.primaryKey]=id;

		var searchquery = query;
		
		try{
			var o_id = DbUtil.getObjectId(id);
//			query= {_id:o_id};
			query = {$or: [{ '_id' : o_id }, searchquery]};
		}catch(error){
			console.error(error);
		}
	}
	
	if (id) {
    	if(instance.service['beforeRemove']){
    		instance.service['beforeRemove'](id, function(error){
    			if(error)
    				callback(error);
    			else
	    			if(instance.service['afterRemove'])
	                	instance.service.getStorageService().remove(query, function(error, result, callback){
	                		instance.service.afterRemove(error, result, callback, options);
	                	}, options);
	                else
	                	instance.service.getStorageService().remove(query, callback, options);
    		}, request, response, options);
    	}else{
    		if(instance.service['afterRemove'])
            	instance.service.getStorageService().remove(query, function(error, result, callback){
            		instance.service.afterRemove(error, result, callback, options);
            	}, options);
            else
            	instance.service.getStorageService().remove(query, callback, options);
    	}
    } else {
        callback("Id is mandatory to proceed..");
    }
}