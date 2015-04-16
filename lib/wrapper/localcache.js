/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var logger = require("simpleportal").logger;

/**
 * LocalCache class for wrapping the database table
 * 
 * @class LocalCache
 * @module simpleportal
 * @submodule wrapper
 * 
 * @constructor
 * 
 * @param {object} dbInstance database instance 
 * @param {string} collectionName Name of the collection
 */
var LocalCache = function(dbInstance, collectionName) {
	logger.getInstance().debug('Simple Portal -localcache', 'Creating Local cache');
	
	var instance = this;
			
	instance.collectionName = collectionName;
	instance.dbInstance = dbInstance;
	
	instance.init();
};

/**
 * To initialize theLocalCache object, called by the default constructor
 * 
 * @method init
 * 
 * @private 
 */
LocalCache.prototype.init = function(){
	logger.getInstance().info('Simple Portal -localcache', 'Init Local cache');
	var instance = this;
	
	if(!instance.collection)
		instance.getCollection(function(error, data){
			if(error)
				logger.getInstance().warn('Simple Portal -localcache', 'Some problem while getting collection from db -' + error);
			else
				logger.getInstance().info('Simple Portal -localcache', 'Collection retreived from db successfully - ' + instance.collectionName);
		});
}

/**
 * To get the underlying database instance for the localcache object
 * 
 * @method getDBInstance
 * 
 * @param {callback} callback The callback to excecute when complete
 * @return database instance
 */
LocalCache.prototype.getDBInstance = function(callback){
	var instance = this;
	return instance.dbInstance;
}

/**
 * To get the underlying database table|collection 
 * 
 * @method getCollection
 * 
 * @param {callback} callback The callback to excecute when complete 
 */
LocalCache.prototype.getCollection = function(callback){
	var instance = this;
	
	if(instance.collection)
		callback(null, instance.collection);
	else{
		if(instance.dbInstance){
			instance.dbInstance.collection(instance.collectionName, function(error, collection) {
                if( error ) callback(error);
                else {
    				instance.collection = collection;

    				callback(null, collection);
                }
            });
		} else{
			callback('Some problem while getting collection.');
		}	
	}
}

/**
 * To save a record|object on to the database
 * 
 * @method save
 * 
 * @param {} results Array of objects or instance of an object 
 * 
 * @param {callback} callback The callback to excecute when complete
 */
LocalCache.prototype.save = function(results, callback){
	var instance = this;
	if(!results){
		logger.getInstance().warn('Simple Portal -localcache', 'No result skipping save!!');
		callback('No result skipping save!!');
	}else {
		if(results && typeof(results.length) == "undefined")
			results = [results];

		for( var i = 0; i< results.length; i++ ) {
			result = results[i];
			result.created_at = new Date();
		}
		instance.collection.insert(results, callback);
	}
};

/**
 * To find records in the database table|collection
 * 
 * @method find
 * 
 * @param {object} query JSON query to be used for searching the database
 * @param {callback} callback The callback to excecute when complete
 * @param {} options
 * @return 
 */
LocalCache.prototype.find = function(query, callback, options) {
	var instance = this;
	options = options||{};
	instance.collection.find(query, options).toArray(function(error, results) {
		callback(error, results);
    });
};

/**
 * To find all records from the table|collection
 * 
 * @method findAll
 * 
 * @param {callback} callback The callback to excecute when complete
 */
LocalCache.prototype.findAll = function(callback) {
	var instance = this;
	
	instance.collection.find({}, {}).toArray(function(error, results) {
		callback(error, results);
    });
};

/**
 * To find the first matching record from table|collection
 * 
 * @method findOne
 * 
 * @param {} query JSON query to be used for searching the database
 * @param {callback} callback The callback to excecute when complete
 * @return 
 */
LocalCache.prototype.findOne = function(query, callback) {
	var instance = this;
	query = query || {};
	
	instance.collection.findOne(query, callback);
};

/**
 * Description
 * @method remove
 * @param {} query
 * @param {callback} callback The callback to excecute when complete
 * @return 
 */
LocalCache.prototype.remove = function(query, callback) {
	var instance = this;
	
	instance.collection.remove(query);
};

/**
 * Description
 * @method update
 * @param {} query
 * @param {} data
 * @param {callback} callback The callback to excecute when complete
 * @return 
 */
LocalCache.prototype.update = function(query, data, callback) {
	var instance = this;
	
	instance.collection.update(query, {$set: data}, {safe:true}, function(error, savedData, oneMore){
		callback(error, data);
	});
};

/**
 * To get the count of records in the table|collection
 * @method count
 * @param {callback} callback The callback to excecute when complete
 * @return 
 */
LocalCache.prototype.count = function(callback) {
	var instance = this;
	
	instance.collection.count(function(error, count) {
		callback(error, count);
	});
};

/**
 * To clear all the records in the table|collection
 * 
 * @method clear
 * 
 * @param {callback} callback The callback to excecute when complete
 * @return 
 */
LocalCache.prototype.clear = function(callback) {
	var instance = this;
	
	instance.collection.remove();
};

/**
 * To make a particular field in the table|collection to be induxed for faster read
 * 
 * @method ensureIndex
 * 
 * @param {} query
 * @param {} arg1
 * 
 * @param {callback} callback The callback to excecute when complete
 * @return 
 */
LocalCache.prototype.ensureIndex = function(query, arg1, callback) {
	var instance = this;
	if(query){
		if(arg1)
			instance.collection.ensureIndex(query, arg1);
		else
			instance.collection.ensureIndex(query);
		if(callback)
			callback(null, {});
	} else if(callback)
		callback('No query mentioned!!');
};

/**
 * To validate whether the underlying db instance is already available or not
 * 
 * @method validate 
 * 
 * @param {callback} callback The callback to excecute when complete
 * @private
 */
LocalCache.prototype.validate = function(callback) {
	var instance = this;
	
	if(instance.dbInstance)
		callback('No DB Instance!!!');
};

/**
 * To add or update record, if the record is available then it will update the record, else it will add a new record 
 * 
 * @method add_update
 * 
 * @param {} query JSON Query to check for existing record, mostly the primary key|unique fields in the database
 *  
 * @param {object} object Object to be saved in to the database
 * 
 * @param {callback} callback The callback to excecute when complete
 * @param {function} beforeSave Function which will be executed before saving the record
 *  
 */
LocalCache.prototype.add_update = function(query, object, callback, beforeSave){
	var instance = this;
	
	if(beforeSave){
		beforeSave(object, function(error, object){
			if(error)
				callback('Some problem while updating');
			else
				instance.add_update(query, object, callback);
		});
	} else{
		if(query && query.id){
			if (query.id) {
				instance.update({id: query.id}, object, callback);
			} else {
				callback("Please enter the id-" + query.id + " for updating");
			}
		} else{
			var id = object.id;
			if(id){
				instance.findOne({id: id}, function(err, objectFromDB) {
					if (!objectFromDB || objectFromDB == '') {
						instance.save(object, callback);
					} else {
						callback("The " + object.id + " already exists in our database. Please enter new values.");
					}
				});
			} else{
				callback("The id is missing. Please enter new values.");
			}
		}
	}
}

exports.LocalCache = LocalCache;