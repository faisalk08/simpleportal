/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */
var logger = require("./../logger").getInstance();

var LocalCache = function(dbInstance, collectionName) {
	var instance = this;
	instance.collectionName = collectionName;
	instance.dbInstance = dbInstance;
        
	instance.getCollection(function(error, data){
		if(error)
			logger.warn('DB ', 'We have some problem retreiving collection from local db' + error);
		else
			logger.info('DB ', 'We have no problem retreiving collection from local db');
	});
};

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
		logger.info('DB ', 'No result skipping save!!');
		callback('No result skipping save!!');
	}else {
		logger.info('DB ', 'Saving the data to local db');
		if(results && typeof(results.length) == "undefined")
			results = [results];

		for( var i = 0; i< results.length; i++ ) {
			result = results[i];
			result.created_at = new Date();
		}
		instance.collection.insert(results, callback);
	}
};

LocalCache.prototype.find = function(query, callback) {
	var instance = this;
	
	instance.collection.find(query, {}).toArray(function(error, results) {
		logger.info('DB ', 'Query returns +' + results.length);
		callback(error, results);
    });
};

LocalCache.prototype.findAll = function(callback) {
	var instance = this;
	
	instance.collection.find({}, {}).toArray(function(error, results) {
		logger.info('DB ', 'Query returns +' + results.length);
		callback(error, results);
    });
};

LocalCache.prototype.findOne = function(query, callback) {
	var instance = this;
	query = query || {};
	logger.info('DB ', 'Searching with query - ' + JSON.stringify(query));
	
	instance.collection.findOne(query, callback);
};

LocalCache.prototype.update = function(query, data, callback) {
	var instance = this;
	
	logger.info('DB ', 'Updating the object for - '+ JSON.stringify(query));
	instance.collection.update(query, {$set: data}, {safe:true}, function(error, savedData, oneMore){
		callback(error, data);
	});
};

LocalCache.prototype.count = function(callback) {
	var instance = this;
	
	instance.collection.count(function(error, count) {
		logger.info('DB ', 'Getting the count for - ' + instance.collectionName + ' -- count -- '+ count);
		
		callback(error, count);
	});
};

LocalCache.prototype.clear = function(callback) {
	var instance = this;
	
	instance.collection.remove();
};

LocalCache.prototype.validate = function(callback) {
	var instance = this;
	
	if(instance.dbInstance)
		callback('No DB Instance!!!');
};

exports.LocalCache = LocalCache;