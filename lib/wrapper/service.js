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
    
    instance.dbid = options.dbid||'default';
    
    instance.configuration = options.configuration||{};
    
    instance.name = options.name;
    instance.primaryKey = options.primaryKey||'id';
    instance.primaryKeyType = options.primaryKeyType;
    
    instance.service = {};
    if(options.configuration){
    	instance.init(instance.configuration);
    }
};

Service.prototype.onStartup = function(){
}

Service.prototype.getObject = function(request){
	var instance = this;

	var object = {};
	logger.debug('Simpleportal -Service', request.body);
	
	if(request && request.body && request.body[instance.name] && typeof request.body[instance.name] === 'object' ){
		object = request[instance.name];
	}
	return object;
}

Service.prototype.getObjectId = function(object){
	var instance = this;

	var simpleportal = require('simpleportal');
	
	var id = object[instance.primaryKey];
	return simpleportal.db.generateId(id);
}


Service.prototype.getId = function(data, callback){
	var instance = this;

	var simpleportal = require('simpleportal');
	
	var id = simpleportal.db.generateId(data);
	
	var query = {};
	if(instance.primaryKeyType == 'Number')
		query[instance.primaryKey]=Number(id);
	else if (instance.primaryKeyType == 'BSONUUID')
		query[instance.primaryKey]=simpleportal.db.getObjectId(id);
	else
		query[instance.primaryKey]=id;
	
	instance.getStorageService().findOne(query, function(error, object) {
		if(error || !object || object == ''){
			/*instance.localCache.save({id:id, name:category}, function(error, sessionCategory) {
				if (!error && sessionCategory) {
					callback(null, sessionCategory[0].id);
				}else
					callback(error);
			});*/
		} else{
			callback(null, id);
		}
	});
}

Service.prototype.getIds = function(data, callback){
	var instance = this;

	if(!data)
		callback(null, []);
	else{
	 	var count = data.length;
		var checkedCount = 0;	
		var ids = [];
		for(index in data){
			if(categories[index] != '')
				getId(data[index], function(error, id){
					if(!error){
						ids.push(id);
					}
					checkedCount++;
					if(checkedCount == count){
						callback(null, ids);
					}
				});
		}
	}
}

Service.prototype.startup = function(callback){
	var instance = this;

	if(instance.configuration && instance.configuration.hasOwnProperty('callservicestartup')){
		if(!instance.configuration.hasOwnProperty('callservicestartup'))
			this.onStartup(callback);
	}else
		this.onStartup(callback);
}

Service.prototype.getStorageService = function(){
	var instance = this;
	
	if(!instance.storageService){
		return new StorageService({dbid:instance.dbid, collectionName:instance.collection});
	}else
		return instance.storageService;
}

Service.prototype.init = function(configuration, dbInstance){
	var instance = this;

	var simpleportal = require('simpleportal');
	logger.info('Service Wrapper', 'Initializing service - ' + instance.name);
	
	if(configuration.services)
		instance.configuration = configuration.services[instance.name];
	
    if(dbInstance)
    	instance.dbInstance = dbInstance;
    
    if(instance.collection){
    	var dbInstance = instance.dbInstance||require('simpleportal').db.getInstance();
    	try{
            var db = require("simpleportal").db;
            //var LocalCache = require("./localcache").LocalCache;
            
            //instance.localCache = new LocalCache(dbInstance, instance.collection);

        	instance.service = instance.service||{};

        	if(instance.dbid && instance.collection) {
            	instance.storageService = new StorageService({dbid:instance.dbid, collectionName:instance.collection});
        	
            	instance.rService = new RService(instance, {dbid:instance.dbid, collectionName:instance.collection});
        	    
            	for(method in instance.rService){
            		if(instance.rService[method] == instance || method.indexOf('before') == 0)
            			continue;
            		if(!instance[method]){
            			var method_ = method;
            			var functioncall = function(method){
            				instance[method] = function(arg1, arg2, arg3, arg4, arg5){
            					instance.rService[method](arg1, arg2, arg3, arg4, arg5)
                			};
            			}
            			functioncall(method);
            		}
        	    }
        	    
                if(!instance.service['GET /'])
                	instance.service['GET '] = function(request, response, callback) {
                		var options = {sorting:instance.defaultsort};
                		if(request.dbid)
                			options.dbid = request.dbid;
                		instance.rService.search({}, callback, options);
            	    };
                
        	    if(!instance.service['GET /count'])
                	instance.service['GET /count'] = function(request, response, callback) {
                		var options = {sorting:instance.defaultsort};
                		if(request.dbid)
                			options.dbid = request.dbid;
                		
                		instance.rService.count({}, function(error, count){
                			callback(error, {count:count||0});
                		}, options);
            	    };
            	    
                if(!instance.service['GET /:id'])
                	instance.service['GET /:id'] = function(request, response, callback) {
	                	var options = {details:'true'};
	            		if(request.dbid)
	            			options.dbid = request.dbid;
	            	
	            		var o_id = request.pathGroup;
	        			/*if(request.query && request.query.id && (request.query.id.length == 12 || request.query.id.length == 24))
	        				o_id = {_id:simpleportal.db.getObjectId(request.query.id)};
	        		*/
	            		instance.rService.details(o_id, callback, options);
            	    };

                // registerR(instance);

                if(instance.modify){
                	if(instance.dbid && instance.collection){
                		instance.cudService = new CUDService(instance, {dbid:instance.dbid, collectionName:instance.collection});
                		
    	            	instance.service['POST /'] = function(request, response, callback) {
    	            		var options = {};
    	            		if(request.dbid)
    	            			options.dbid = request.dbid;
    	            		
    	            		instance.cudService.add(request, response, callback, options);
    	                };
    	                
    	                instance.service['PUT /:id'] = function(request, response, callback) {
    	                	var options = {};
    	            		if(request.dbid)
    	            			options.dbid = request.dbid;
    	            		
    	                	instance.cudService.update(request, response, callback, options);
    	                };
    	                
    	                instance.service['DELETE /:id'] = function(request, response, callback) {
    	                	var options = {};
    	            		if(request.dbid)
    	            			options.dbid = request.dbid;

    	                	instance.cudService.remove(request, response, callback, options);
    	                };
                	}
                    
                	//registerCUD(instance);
                }
        	}
            
    	}catch(error){
    		console.log(error);
    	}
	} else
		logger.warn('Sponsor Service', 'Service configuration is not done!!!');
};

Service.prototype.call = function(path, request, response, callback){
	var instance = this;

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

Service.prototype.remove = function(path, callback){
	var instance = this;

	instance.register(path, callback, 'DELETE');
}

Service.prototype.get = function(path, callback){
	var instance = this;

	instance.register(path, callback, 'GET');
}

Service.prototype.post = function(path, callback){
	var instance = this;
	
	instance.register(path, callback, 'POST');
}

Service.prototype.register = function(path, callback, method){
	var instance = this;
	
	if(path && path.indexOf(method) == -1)
		path = method+ ' '+path;
	instance.service[path] = callback;
}

var RService = function(superService, options){
	var instance = this;
	  
	instance.service = superService;
};

RService.prototype.search = function(query, callback, options){
	var instance = this;
	options = options||{};
	
	if(instance.service['beforeSearchCallback']){
		instance.service.getStorageService().find(query, function(error, result){
			instance.service.beforeSearchCallback(error, result, callback);	
	    }, options);	
	}else
		instance.service.getStorageService().find(query, callback, options);
};


RService.prototype.count = function(query, callback, options){
	var instance = this;
	
	options = options||{};
	
	instance.service.getStorageService().count(query, callback, options);
};

RService.prototype.details = function(id, callback, options){
	var instance = this;
	var simpleportal = require("simpleportal");
	options = options||{};
	
	var query = {};
	if(id && typeof id == 'object')
		query = id; 
	else if(instance.service.primaryKeyType == 'Number')
		query[instance.service.primaryKey]=Number(id);
	else if (instance.primaryKeyType == 'BSONUUID')
		query[instance.primaryKey]=simpleportal.db.getObjectId(id);
	else
		query[instance.service.primaryKey]=id;
	
	if (id) {
    	if(instance.service['beforeDetailsCallback'])
    		instance.service.getStorageService().findOne(query, function(error, result){
    			if ((error || !(result && result == '')) && query != id && query[instance.service.primaryKey]&&(query[instance.service.primaryKey].length == 12||query[instance.service.primaryKey].length == 24)){
    				instance.details({_id:simpleportal.db.getObjectId(query[instance.service.primaryKey])}, callback, options);
    			}else if (!result || result == '') 
                    callback("There is no result found for the id " + id);
    			else
    				instance.service.beforeDetailsCallback(error, result, callback);	
    	    }, options);
    	else{
    		instance.service.getStorageService().findOne(query, function(error, result){
    			if ((error || !(result && result == '')) && query != id && query[instance.service.primaryKey] &&(query[instance.service.primaryKey].length == 12||query[instance.service.primaryKey].length == 24)){
    				instance.details({_id:simpleportal.db.getObjectId(query[instance.service.primaryKey])}, callback, options);
    			}else if (!result || result == '') 
                    callback("There is no result found for the id " + id);
    			else
    				callback(error, result);	
    	    }, options);
    	}
    } else {
        callback("Please enter id for getting the details.");
    }
};

var CUDService = function(superService, options){
	var instance = this;
	  
	instance.service = superService;
};

CUDService.prototype.add = function(request, response, callback, options) {
	var instance = this;
	
	options = options||{};
	
	var object = instance.service.getObject(request);
    var id = instance.service.getObjectId(object);

    if(id){
        object.id = id;
        var query = {};
        if(request.query && request.query.add_update)
        	query = {id:id};
        
        instance.service.getStorageService().add_update(query, object, callback, instance.beforeSave, options);
    }else
        callback('Id is mandatory to proceed..');
}

CUDService.prototype.update = function(request, response, callback, options) {
	var instance = this;
	var id = request.pathGroup;
    
    var object = instance.service.getObject(request);
    
    options = options||{};
	
    if(id){
        var new_id = instance.service.getObjectId(object);

        object.id = new_id;
        instance.service.getStorageService().add_update({id:id}, object, callback, instance.beforeSave, options);
    }else
        callback('Id is mandatory to proceed..');
}

CUDService.prototype.remove = function(request, response, callback, options) {
	var instance = this;
	var id = request.pathGroup;
	
	options = options||{};
	
	var query = {};
	if(id && typeof id == 'object')
		query = id; 
	else if(instance.service.primaryKeyType == 'Number')
		query[instance.service.primaryKey]=Number(id);
	else if (instance.primaryKeyType == 'BSONUUID')
		query[instance.primaryKey]=simpleportal.db.getObjectId(id);
	else
		query[instance.service.primaryKey]=id;
	
    if (id) {
    	instance.service.getStorageService().remove(query, callback, options);
    } else {
        callback("Id is mandatory to proceed..");
    }
}

var StorageService = function(options){
	var instance = this;
	
	instance.dbid = options.dbid||'default';
	instance.collectionName = options.collectionName||'default';
}

StorageService.prototype.getCollection = function(options, callback){
	var instance = this;
	
	options = options||{};
	var simpleportal = require('simpleportal');
	var db = simpleportal.db;
	db.dbpool.getInstance((options.dbid||instance.dbid), function(error, dbInstance){
		if(error){
			callback(error);
		}else{
			dbInstance.collection(instance.collectionName, function(error, collection) {
                if( error ){
                	callback(error);
                } else {
    				callback(null, collection);
                }
            });
		}
	});
}

StorageService.prototype.save = function(results, callback, options){
	var instance = this;
	options = options||{};
	if(!results){
		logger.warn('Simple Portal - storage service', 'No result skipping save!!');
		callback('No result skipping save!!');
	}else {
		if(results && typeof(results.length) == "undefined")
			results = [results];

		for( var i = 0; i< results.length; i++ ) {
			result = results[i];
			result.created_at = new Date();
		}
		instance.getCollection(options, function(error, collection){
			if(error)
				callback(error);
			else
				collection.insert(results, callback);
		});
	}
};

StorageService.prototype.find = function(query, callback, options) {
	var instance = this;
	options = options||{};
	var sorting = options.sorting||{};
	instance.getCollection(options, function(error, collection){
		if(error)
			callback(error);
		else
			collection.find(query, sorting).toArray(function(error, results) {
				callback(error, results);
		    });
	});
};

StorageService.prototype.findAll = function(callback, options) {
	var instance = this;
	
	options = options||{};
	var sorting = options.sorting||{};

	instance.getCollection(options, function(error, collection){
		if(error)
			callback(error);
		else
			collection.find({}, sorting).toArray(function(error, results) {
				callback(error, results);
		    });
	});
};

StorageService.prototype.findOne = function(query, callback, options) {
	var instance = this;
	query = query || {};
	
	instance.getCollection(options, function(error, collection){
		if(error)
			callback(error);
		else
			collection.findOne(query, callback);
	});
};

StorageService.prototype.remove = function(query, callback, options) {
	var instance = this;
	
	instance.getCollection(options, function(error, collection){
		if(error)
			callback(error);
		else{
			collection.remove(query);
			callback(null, {});
		}
	});
};

StorageService.prototype.update = function(query, data, callback, options) {
	var instance = this;
	
	instance.getCollection(options, function(error, collection){
		if(error)
			callback(error);
		else
			collection.update(query, {$set: data}, {safe:true}, function(error, savedData, oneMore){
				callback(error, data);
			});
	});
};

StorageService.prototype.count = function(query, callback, options) {
	var instance = this;
	
	instance.getCollection(options, function(error, collection){
		if(error)
			callback(error);
		else
			collection.count(query, function(error, count) {
				callback(error, count);
			});
	});
};

StorageService.prototype.clear = function(callback, options) {
	var instance = this;
	
	instance.getCollection(options, function(error, collection){
		if(error)
			callback(error);
		else{
			collection.remove();
			callback(null, {});
		}
	});
};

StorageService.prototype.ensureIndex = function(query, arg1, callback, options) {
	var instance = this;
	
	if(query){
		instance.getCollection(options, function(error, collection){
			if(error)
				callback(error);
			else{
				if(arg1)
					collection.ensureIndex(query, arg1);
				else
					collection.ensureIndex(query);
				if(callback)
					callback(null, {});
			}
		});
	} else if(callback)
		callback('No query mentioned!!');
};

StorageService.prototype.add_update = function(query, object, callback, beforeSave){
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

exports.CRUDService = Service;
exports.StorageService = StorageService;