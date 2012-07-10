/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var logger = require("simpleportal").logger.getInstance();

var LocalCache = function(dbInstance, collectionName) {
	var instance = this;
	logger.info('Simple Portal -localcache', 'Creating Local cache');
			
	instance.collectionName = collectionName;
	instance.dbInstance = dbInstance;
	
	instance.init();
};

LocalCache.prototype.init = function(){
	var instance = this;
	logger.info('Simple Portal -localcache', 'Init Local cache');
	
	if(!instance.collection)
		instance.getCollection(function(error, data){
			if(error)
				logger.warn('Simple Portal -localcache', 'Some problem while getting collection from db -' + error);
			else
				logger.info('Simple Portal -localcache', 'Collection retreived from db successfully - ' + instance.collectionName);
		});
}

LocalCache.prototype.getDBInstance = function(callback){
	var instance = this;
	return instance.dbInstance;
}

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

LocalCache.prototype.save = function(results, callback){
	var instance = this;
	if(!results){
		logger.warn('Simple Portal -localcache', 'No result skipping save!!');
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

LocalCache.prototype.find = function(query, callback, options) {
	var instance = this;
	options = options||{};
	instance.collection.find(query, options).toArray(function(error, results) {
		callback(error, results);
    });
};

LocalCache.prototype.findAll = function(callback) {
	var instance = this;
	
	instance.collection.find({}, {}).toArray(function(error, results) {
		callback(error, results);
    });
};

LocalCache.prototype.findOne = function(query, callback) {
	var instance = this;
	query = query || {};
	
	instance.collection.findOne(query, callback);
};

LocalCache.prototype.remove = function(query, callback) {
	var instance = this;
	
	instance.collection.remove(query);
};

LocalCache.prototype.update = function(query, data, callback) {
	var instance = this;
	
	instance.collection.update(query, {$set: data}, {safe:true}, function(error, savedData, oneMore){
		callback(error, data);
	});
};

LocalCache.prototype.count = function(callback) {
	var instance = this;
	
	instance.collection.count(function(error, count) {
		callback(error, count);
	});
};

LocalCache.prototype.clear = function(callback) {
	var instance = this;
	
	instance.collection.remove();
};

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

LocalCache.prototype.validate = function(callback) {
	var instance = this;
	
	if(instance.dbInstance)
		callback('No DB Instance!!!');
};

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