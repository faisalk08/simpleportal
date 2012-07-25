/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */
var logger = require("./../logger").getInstance();
var util = require("./../util");

var defaultconfiguration = {
	modify : true,
	dbid:'default',
	primaryKey:'id',
	model:{},
	service:{}
};

var Service = function(options) {
	var instance = this;
	
    instance.modify = options.modify||false;
    instance.defaultsort = options.defaultsort;
    instance.hiddenFields = options.hiddenFields;
    
    instance.collection = options.collection;
    instance.dbInstance = options.dbInstance;
    
    instance.dbid = options.dbid||'default';
    
    instance.configuration = options.configuration||{};
    
    instance.name = options.name;
    
    instance.primaryKey = options.primaryKey||'id';
    instance.primaryKeyType = options.primaryKeyType;
    instance.primaryKeyFields = options.primaryKeyFields||[];
    
    instance.dataformat = options.dataformat;
    instance.model = options.model||{};
    instance.validation = options.validation;
    instance.service = {};
    instance.userrole = options.userrole;
	if(options.configuration){
    	instance.init(instance.configuration);
    }
};

Service.prototype.onStartup = function(){
}

Service.prototype.dataformat_ = {
	boolean: function(value, defaultValue, body){
		var boolvalue = defaultValue||false;
		if(value == 'true' || value)
			boolvalue = true;
		return boolvalue;
	},
	array: function(value, defaultValue, body){
		if(!value)
			return defaultValue||[];
		return util.getArrayValues(value);
	}
};


Service.prototype.validation_ = {
	time: function(value){
		return {isValid:value.match(/^(\d{1,2}(.\d{2})?)([ap]m)?$/), message:'Not a valid Time!'};
	},
	number: function(value){
		return {isValid:true};
	},
	url:function(value){
		var urlPattern = new RegExp("^(((ht|f)tp(s?))\://)?(www.|[a-zA-Z].)[a-zA-Z0-9\-\.]+\.(com|de|edu|gov|mil|net|org|biz|info|name|museum|us|ca|uk|be|bd|in|eu)(\:[0-9]+)*(/($|[a-zA-Z0-9\.\,\;\?\'\\\+&amp;%\$#\=~_\-]+))*$");
		return {isValid:value.search(urlPattern) != -1, message:'Not a valid URL'};
	}
};

Service.prototype.getObject = function(request){
	var instance = this;

	var object = {};
	logger.debug('Simpleportal -Service', 'getting object ');
	
	if(request && request.body && request.body[instance.name] && typeof request.body[instance.name] === 'object' ){
		object = request[instance.name];
	}else if(request && request.body && instance.model){
		var source = request.body;
		for(field in instance.model){
			if(source[field])
				object[field] = source[field];
			else
				object[field] = instance.model[field];
		}
	}
	
	if(instance.dataformat){
		for(format in instance.dataformat){
			if(format == 'object'){
				
			}else if(object[format])
				object[format] = instance.dataformat[format](object[format], object[format], request);
		}
		if(instance.dataformat.hasOwnProperty('object')){
			object = instance.dataformat['object'](object, request);
		}
	}
	
	if(instance.model){
		for(field in instance.model){
			if(typeof instance.model[field] == 'boolean')
				object[field] = instance.dataformat_.boolean(object[field], instance.model[field], request);
			else if(typeof instance.model[field] == 'array')
				object[field] =  instance.dataformat_.array(object[field], instance.model[field], request);
			else if (instance.model[field] instanceof Array)
				object[field] =  instance.dataformat_.array(object[field], instance.model[field], request);
		}
	}
	
	var validationmessages = [];
	if(instance.validation){
		for(validation in instance.validation){
			if(validation == 'object'){
				
			} else if(object[validation]){
				var vdn = instance.validation[validation];
				if(typeof vdn == 'string' && instance.validation_[vdn]){
					var val_ = instance.validation_[vdn](object[validation])
					if(!val_.isValid){
						var message ={};
						message[validation] = val_.message||'Not valid!';
						validationmessages.push(message);
					}	
				}else if(typeof vdn == 'function'){
					var val_ = vdn(object[validation]);
					if(!val_.isValid){
						var message ={};
						message[validation] = val_.message||'Not Valid!';
						validationmessages.push(message);
					}
				}
			}	
		}
		if(instance.validation.hasOwnProperty('object')){
			var vdn = instance.validation[validation];
			var val_ = vdn(object);
			if(!val_.isValid){
				var message ={};
				message['Common Error -'] = val_.message;
				validationmessages.push(message);
			}
		}
	}
	
	logger.debug('Simpleportal - service wrapper', object);
	logger.debug('Simpleportal - service wrapper', validationmessages);
	object.validationmessages=validationmessages;
	return object;
}

Service.prototype.getObjectId = function(object){
	var instance = this;

	var simpleportal = require('simpleportal');
	var id = '';
	if(instance.primaryKeyFields){
		for(i in instance.primaryKeyFields){
			var field = instance.primaryKeyFields[i];
			id += object[field]
		}
	}else
		id = object[instance.primaryKey];
	
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
		if(instance.configuration.callservicestartup)
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
	
	instance.dbmodeloptions = {};
	
	if(instance.hiddenFields){
		for(field in instance.hiddenFields){
			instance.dbmodeloptions[instance.hiddenFields[field]]=0;
		}
	}
	if(instance.defaultsort){
		for(field in instance.defaultsort){
			instance.dbmodeloptions[field] = instance.defaultsort[field];
		}
	}
	
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
                	instance.get('/',function(request, response, callback) {
                		var options = instance.dbmodeloptions;
                		//{sorting:instance.defaultsort};
                		if(request.dbid)
                			options.dbid = request.dbid;
                		instance.rService.search({}, callback, options);
            	    });/* 
                	instance.service['GET '] = function(request, response, callback) {
                		var options = instance.dbmodeloptions;
                		//{sorting:instance.defaultsort};
                		if(request.dbid)
                			options.dbid = request.dbid;
                		instance.rService.search({}, callback, options);
            	    };*/
                
        	    if(!instance.service['GET /count'])
        	    	instance.get('/count', function(request, response, callback) {
        	    		var options = instance.dbmodeloptions;
        	    		//var options = {sorting:instance.defaultsort};
                		if(request.dbid)
                			options.dbid = request.dbid;
                		
                		instance.rService.count({}, function(error, count){
                			callback(error, {count:count||0});
                		}, options);
            	    });

            	    
        	    if(!instance.service['GET /export-csv'])
        	    	instance.get('/export-csv', function(request, response, callback) {
	        	    	instance.rService.search({}, function(error, data){
	        	    		instance.sendcsv(data, null, request, response);
	        	    	}, options);
            	    });
            	    
                if(!instance.service['GET /:id'])
                	instance.get('/:id', function(request, response, callback) {
	                	var options = instance.dbmodeloptions;
	                	options.details = 'true';
	            		if(request.dbid)
	            			options.dbid = request.dbid;
	            		var o_id = request.pathGroup;
	        			/*if(request.query && request.query.id && (request.query.id.length == 12 || request.query.id.length == 24))
	        				o_id = {_id:simpleportal.db.getObjectId(request.query.id)};
	        		*/
	            		instance.rService.details(o_id, callback, options);
            	    });
            	    
                // registerR(instance);

                if(instance.modify){
                	if(instance.dbid && instance.collection){
                		instance.cudService = new CUDService(instance, {dbid:instance.dbid, collectionName:instance.collection});
                		instance.post('/', function(request, response, callback) {
    	            		var options = {};
    	            		if(request.dbid)
    	            			options.dbid = request.dbid;
    	            		
    	            		instance.cudService.add(request, response, callback, options);
    	                });
    	                
                		instance.put('/:id', function(request, response, callback) {
    	                	var options = instance.dbmodeloptions;
    	            		if(request.dbid)
    	            			options.dbid = request.dbid;
    	            		
    	                	instance.cudService.update(request, response, callback, options);
    	                });
    	                
    	                instance.remove('/:id', function(request, response, callback) {
    	                	var options = {};
    	            		if(request.dbid)
    	            			options.dbid = request.dbid;

    	                	instance.cudService.remove(request, response, callback, options);
    	                });
    	                //instance.service['DELETE /:id'] = ;
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

Service.prototype.sendcsv = function(data, fields, request, response){
	this.sendcsv_(data, fields, request, response);
}

Service.prototype.sendcsv_ = function(data, fields, request, response){
	var result = new Array();
	
	var fields_ = [];
	if(!fields && data){
		fields = fields||[];
		var _fields = data[0];
		for(var field in _fields){
			if(field == '_id'||field == 'created_at')
				continue;
			fields.push(field);
			fields_.push('"' + field + '"')
		}
	}else
		for(var i in fields){
			var field = fields[i];
			if(field == '_id'||field == 'created_at')
				continue;
			
			fields_.push('"' + field + '"')
		}
	
	result.push(fields.join(','));
	
	data.forEach(function(obj){
		var obj_ = new Array();
		for(var i in fields){
			var field = fields[i];
			value = obj[field]||'';
			
			if(value instanceof Array || Array.isArray(value)){
				value = value.join(',');
			}
			
			value = String(value);
			
			if(value.indexOf(',') != -1)
				value = '"'+value + '"'
			
			obj_.push(value);
		}
		
		result.push(obj_.join(','))
	});
	response.send(200, {'content-type':'text/csv; charset=utf8'}, result.join('\n'));
}

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

Service.prototype.put = function(path, callback){
	var instance = this;
	instance.register(path, callback, 'PUT');
}

Service.prototype.post = function(path, callback){
	var instance = this;
	instance.register(path, callback, 'POST');
}

Service.prototype.register = function(path, servicecallback, method){
	var instance = this;
	
	if(path && path.indexOf(method) == -1)
		path = method+ ' '+path;
	instance.service[path] =(function(servicecallback) {
	  return function(request, response, callback) {
		  instance.servicepre(request, response, servicecallback, callback);
	  }
	})(servicecallback);
}

Service.prototype.servicepre = function(request, response, servicecallback, callback){
	var instance = this;
	
	if(instance.userrole && !request.isAuthenticated()){
		callback('Permission denied');
	}else if(instance.userrole && (instance.userrole =='admin' && !request.user.admin) ){
		callback('Permission denied');
	}else{
		/*
		servicepost = (function(error, result, callback) {
			return function(request, response, callback) {
				  instance.servicepre(request, response, servicecallback, callback);
			  }
			})(servicecallback);
		*/
		servicecallback(request, response, callback);
	}
}

Service.prototype.servicepost = function(error, result, servicecallback, callback){
	var instance = this;
	servicecallback(error, result, callback);
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
    			if ((error || (!result|| result == '')) && query != id && query[instance.service.primaryKey]&&(query[instance.service.primaryKey].length == 12||query[instance.service.primaryKey].length == 24)){
    				try{
    					instance.details({_id:simpleportal.db.getObjectId(query[instance.service.primaryKey])}, callback, options);
    				}catch(error){
    					callback(JSON.stringify(error));
    				}
    			}else if (!result || result == '') 
                    callback("There is no result found for the id " + id);
    			else
    				instance.service.beforeDetailsCallback(error, result, callback);	
    	    }, options);
    	else{
    		instance.service.getStorageService().findOne(query, function(error, result){
    			if ((error || (!result || result == '')) && query != id && query[instance.service.primaryKey] &&(query[instance.service.primaryKey].length == 12||query[instance.service.primaryKey].length == 24)){
    				try{
    					instance.details({_id:simpleportal.db.getObjectId(query[instance.service.primaryKey])}, callback, options);
    				}catch(error){
    					callback(JSON.stringify(error));
    				}
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
    if(object.validationmessages && object.validationmessages.length > 0){
    	callback(object.validationmessages, object);
    } else if(id){
        object.id = id;
        var query = {};
        if(request.query && request.query.add_update)
        	query = {id:id};
        if(object.hasOwnProperty('validationmessages'))
        	delete object.validationmessages;
        instance.service.getStorageService().add_update(query, object, callback, instance.beforeSave, options);
    }else{
        callback({id:'Id is mandatory to proceed..'});
    }
}

CUDService.prototype.update = function(request, response, callback, options) {
	var instance = this;
	var id = request.pathGroup;
    
    var object = instance.service.getObject(request);
    
    options = options||{};
	
    if(object.validationmessages && object.validationmessages.length > 0){
    	callback(object.validationmessages, object);
    } else if(id){
        var new_id = instance.service.getObjectId(object);

        object.id = new_id;

        if(object.hasOwnProperty('validationmessages'))
        	delete object.validationmessages;
        
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

StorageService.prototype.getDBInstance = function(options, callback){
	var instance = this;
	
	var simpleportal = require('simpleportal');
	var db = simpleportal.db;
	if(typeof options == 'function' ){
		callback = options;
		options = {};
	}
	options = options||{};
	
	db.dbpool.getInstance((options.dbid||instance.dbid), callback);
};
		
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
		var single = true;
		if(results && typeof(results.length) == "undefined"){
			results.created_at = new Date();

			instance.getCollection(options, function(error, collection){
				if(error)
					callback(error);
				else
					collection.insert(results, function(error, data){
						if(data && typeof(data.length) == "undefined"){
							callback(error, data);
						} else if(data)
							callback(error, data[0]);
						
					});
			});
		}else{
			for( var i = 0; i< results.length; i++ ) {
				result = results[i];
				result.created_at = new Date();
			}	

			instance.getCollection(options, function(error, collection){
				if(error)
					callback(error);
				else
					collection.insert(results, function(error, data){
						callback(error, data);
					});
			});
		}
	}
};
function clone(o) {
  var ret = {};
  Object.keys(o).forEach(function (val) {
    ret[val] = o[val];
  });
  return ret;
}
StorageService.prototype.find = function(query, callback, options) {
	var instance = this;
	options = options||{};
	var dboptions = clone(options);//options||{};
	
	instance.getCollection(options, function(error, collection){
		if(error)
			callback(error);
		else{
			if(dboptions.dbid)
				delete dboptions.dbid;
			
			collection.find(query, dboptions).toArray(function(error, results) {
				callback(error, results);
		    });
		}
	});
};

StorageService.prototype.findAll = function(callback, options) {
	var instance = this;
	
	options = options||{};
	//var dboptions = options;
	var dboptions = clone(options);//options||{};
	
	instance.getCollection(options, function(error, collection){
		if(error)
			callback(error);
		else{
			if(dboptions.dbid)
				delete dboptions.dbid;
			collection.find({}, dboptions).toArray(function(error, results) {
				callback(error, results);
		    });
		}
	});
};

StorageService.prototype.findOne = function(query, callback, options) {
	var instance = this;
	query = query || {};
	//var dboptions = options||{};
	options = options||{};
	var dboptions = clone(options);//options||{};
	
	if(dboptions && dboptions.details)
		delete dboptions.details;
	
	instance.getCollection(options, function(error, collection){
		if(error)
			callback(error);
		else{
			if(dboptions && dboptions.dbid)
				delete dboptions.dbid;
			collection.findOne(query, dboptions, callback);
		}	
	});
};

StorageService.prototype.remove = function(query, callback, options) {
	var instance = this;

	//var dboptions = options||{};
	options = options||{};
	var dboptions = clone(options);//options||{};
	instance.getCollection(dboptions, function(error, collection){
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
	options = options||{};
	var dboptions = clone(options);//options||{};
	
	instance.getCollection(dboptions, function(error, collection){
		if(error)
			callback(error);
		else
			collection.update(query, {$set: data}, {safe:true}, function(error, savedData, oneMore){
				collection.findOne(query, callback);
			});
	});
};

StorageService.prototype.count = function(query, callback, options) {
	var instance = this;
	options = options||{};
	var dboptions = clone(options);//options||{};
	
	instance.getCollection(dboptions, function(error, collection){
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

	options = options||{};
	var dboptions = clone(options);//options||{};
	instance.getCollection(dboptions, function(error, collection){
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
	options = options||{};
	var dboptions = clone(options);//options||{};
	
	if(query){
		var dboptions = options||{};
		instance.getCollection(dboptions, function(error, collection){
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

StorageService.prototype.add_update = function(query, object, callback, beforeSave, options){
	var instance = this;
	
	if(beforeSave){
		beforeSave(object, function(error, object){
			if(error)
				callback('Some problem while updating');
			else
				instance.add_update(query, object, callback, null, options);
		});
	} else{
		if(query && query.id){
			if (query.id) {
				if(query.id != object.id){
					instance.findOne({id: object.id}, function(err, objectFromDB) {
						if (!objectFromDB || objectFromDB == '') {
							instance.update({id: query.id}, object, callback, options);
						} else {
							callback({id:"A  record with id -" + object.id + " is already exists in our database. Please enter new values."});
						}
					}, options);
				}else
					instance.update({id: query.id}, object, callback, options);
			} else {
				callback({id:"Please enter the id-" + query.id + " for updating"});
			}
		} else{
			var id = object.id;
			if(id){
				instance.findOne({id: id}, function(err, objectFromDB) {
					if (!objectFromDB || objectFromDB == '') {
						instance.save(object, callback, options);
					} else {
						callback({id:"A  record with id -" + object.id + " is already exists in our database. Please enter new values."});
					}
				}, options);
			} else{
				callback({id:"The id is missing. Please enter new values."});
			}
		}
	}
}

exports.CRUDService = Service;
exports.StorageService = StorageService;