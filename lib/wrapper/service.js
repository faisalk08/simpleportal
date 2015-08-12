/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */
var logger = require("./../logger");
var util = require("./../util");
var simpleportal = require('./../simpleportal');

var defaultconfiguration = {
	modify : true,
	dbid:'default',
	primaryKey:'id',
	model:{},
	service:{}
};

/**
 * Simpleportal service 
 * 
 * @class Service.CRUDService
 * @module simpleportal
 * @submodule wrapper
 * 
 * @constructor
 * @param {} options Options for the service 
 *  
 */
var Service = function(options) {
	var instance = this;
	
    instance.modify = options.modify||false;
    instance.remoteservice = options.remoteservice||false;
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
    instance.service = options.service||{};
    instance.userrole = options.userrole;
    
    instance.auditfields = options.auditfields||['_id', 'created_at'];
    instance.csvfields = options.csvfields;
    
    instance.searchqueryparams = {
    	start:'', end : '', orderByCol : '', orderByType:''
    };
    
    if(options.searchqueryparams)
    	instance.searchqueryparams = simpleportal.util.extendJSON(instance.searchqueryparams, options.searchqueryparams);
    
    instance.dbmodeloptions = {};
};

/**
 * Method which is executed during the Simpleportal server startup
 *  
 * @method onStartup
 * 
 * @param configuration Service configuration from configuration module Service configuration from configuration module
 * 
 * @param {callback} callback The callback to excecute when complete
 */
Service.prototype.onStartup = function(configuration, callback){
	if(callback)
		callback();
}

/**
 * Method which is executed during the Simpleportal server shutdown
 * 
 * @method onShutdown
 * 
 * @param configuration Service configuration from configuration module
 * @param {callback} callback The callback to excecute when complete
 * @return 
 */
Service.prototype.onShutdown = function(configuration, callback){
	if(callback)
		callback();
}

/**
 * Various data format functions to format the data send via http request
 * 
 * @property dataformat_
 * @type Object
 * 
 * @private
 */
Service.prototype.dataformat_ = {
	/*
	 * @method dataformat_.boolean
	 * 
	 * @param {} value
	 * @param {} defaultValue
	 * @param {} body
	 * @return boolvalue
	 * 
	 * @private
	 */
	boolean: function(value, defaultValue, body){
		var boolvalue = defaultValue||false;
		
		if(value == 'true' || value)
			boolvalue = true;
		
		return boolvalue;
	},
	/*
	 * @method dataformat_.array
	 * 
	 * @param {} value
	 * @param {} defaultValue
	 * @param {} body
	 * 
	 * @return array of values
	 * 
	 * @private
	 */
	array: function(value, defaultValue, body){
		if(!value)
			return defaultValue||[];
		return util.getArrayValues(value);
	}
};

/**
 * Various data format functions to format the data send via http request
 * 
 * @property validation_
 * @type Object
 * 
 * @private
 */
Service.prototype.validation_ = {
	/**
	 * To validate whether the value is in a standard time format or not
	 * 
	 * Regular expression used is - /^(\d{1,2}(\.\d{2})?)([ap]m)?$/
	 * 
	 * @method validation_.time
	 * 
	 * @param {} value
	 * @return true if valid time else false
	 * @private
	 */
	time: function(value){
		return {isValid:value.match(/^(\d{1,2}(\.\d{2})?)([ap]m)?$/), message:'Not a valid Time!'};
	},
	
	/**
	 * To validate whether the value is a number
	 * 
	 * @method validation_.number
	 * 
	 * @param {} value
	 * @return true if valid number else false
	 * 
	 * @private
	 */
	number: function(value){
		return {isValid:true};
	},
	/**
	 * To validate whether the value is a url
	 * Regular expression used is - /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
	 * 
	 * @method validation_.url
	 * 
	 * @param {} value
	 * @return true if valid url else false
	 * 
	 * @private
	 */
	url:function(value){
		var regexp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
		return {isValid:regexp.test(value), message:'Not a valid URL'};
	}
};

/**
 * To get the object from the http request object based ont he model object, validation data format
 * 
 * @method getObject
 * 
 * @param {} request http request | object from where the object to be retreived
 * 
 * @return object Object which is Formatted and validated
 */
Service.prototype.getObject = function(request){
	var instance = this;

	var object = {};
	
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
			else if(typeof object[field] == 'string'){
				object[field] = object[field].trim();
			}
		}
	}
	
	var validationmessages = [];
	if(instance.validation){
		for(validation in instance.validation){
			if(validation == 'object'){
				
			//} else if(object[validation]){
			} else if(object.hasOwnProperty(validation)){
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
	
	object.validationmessages=validationmessages;
	return object;
}

/**
 * To get the object id for the object based on the primary key fields
 * 
 * @method getObjectId
 * 
 * @param {} object 
 * 
 * @return id for the object
 */
Service.prototype.getObjectId = function(object){
	var instance = this;

	var id = '';
	if(instance.primaryKeyFields){
		for(i in instance.primaryKeyFields){
			var field = instance.primaryKeyFields[i];
			id += object[field];
		}
	}else
		id = object[instance.primaryKey];
	
	return simpleportal.db.generateId(id);
}

/**
 * To get the id of an object
 * 
 * @method getId
 * 
 * @param {} data
 * @param {callback} callback The callback to excecute when complete 
 */
Service.prototype.getId = function(data, callback){
	var instance = this;
	
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
			callback('No id found');
		} else{
			callback(null, id);
		}
	});
}

/**
 * To get the Object ids 
 * 
 * @method getIds
 * 
 * @param {} data
 * @param {callback} callback The callback to excecute when complete
 */
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

/**
 * To start the Service
 * 
 * @method start
 * 
 * @param {} appInstance 
 * @param {callback} callback The callback to excecute when complete
 */
Service.prototype.start = function(appInstance, callback){
	var instance = this;
	logger.getInstance().info('Simpleportal - Service : start', instance.name);
	
	if(typeof configuration == 'function'){
		callback=configuration;
		configuration={};
	}
	
	if(callback)
		callback();
}

/**
 * Fnction which is called during the Simpleportal server startup
 * 
 * @method startup
 * 
 * @param configuration Service configuration from configuration module
 * @param {callback} callback The callback to excecute when complete
 */
Service.prototype.startup = function(configuration, callback){
	var instance = this;
	logger.getInstance().info('Simpleportal - Service : startup', instance.name);
	
	if(typeof configuration == 'function'){
		callback=configuration;
		configuration={};
	}	
	
	if(instance.configuration && instance.configuration.hasOwnProperty('callservicestartup')){
		if(instance.configuration.callservicestartup)
			this.onStartup(configuration, callback);
		else if(callback)
			callback();
	}else
		this.onStartup(configuration, callback);
}

/**
 * Function which will be executed during Simpleportal server shutdown
 * 
 * @method shutdown
 * 
 * @param configuration Service configuration from configuration module
 * @param {callback} callback The callback to excecute when complete
 */
Service.prototype.shutdown = function(configuration, callback){
	var instance = this;
	if(typeof configuration == 'function'){
		callback=configuration;
		configuration={};
	}	
	logger.getInstance().info('Simpleportal - Service : shutdown', instance.name);
	
	this.onShutdown(configuration, callback);
}

/**
 * To get the underlying storage service
 * 
 * @method getStorageService
 * 
 * @return The storage service 
 */
Service.prototype.getStorageService = function(){
	var instance = this;
	
	if(!instance.storageService){
		return new StorageService({dbid:instance.dbid, collectionName:instance.collection});
	}else
		return instance.storageService;
}

/**
 * Initializing function of the service
 * 
 * @method init
 * 
 * @param configuration Service configuration from configuration module
 * @param {callback} callback The callback to excecute when complete
 */
Service.prototype.init = function(configuration, callback){
	var instance = this;
	logger.getInstance().info('Simpleportal - Service wrapper: init', instance.name);
	
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
	
	if(configuration&&configuration.services){
		if(configuration.services[instance.name])
			simpleportal.util.extendJSON(instance.configuration, configuration.services[instance.name]);
	} else if(configuration&&configuration[instance.name]){
		simpleportal.util.extendJSON(instance.configuration, configuration[instance.name]);
		//instance.configuration = configuration[instance.name];
	}	
	
	// check for oauth props and if not available set the system oauth provider
	if(instance.configuration && instance.configuration.oauthprovider && (!configuration || !configuration.oauth || !configuration.oauth[instance.configuration.oauthprovider])){
		logger.getInstance().warn('Service Wrapper', 'Service ['  + instance.name + '] need oauth configuration [' + instance.configuration.oauthprovider + '], please check your configuration or service!');
	} else if(instance.configuration.oauth){
		if(configuration.oauth && configuration.oauth.use){
			instance.configuration.oauthprovider = configuration.oauth.use;	
		}else
			logger.getInstance().warn('Service Wrapper', 'Service ['  + instance.name + '] need oauth configuration, please check your configuration or service!');
	}
	
	if(dbInstance)
    	instance.dbInstance = dbInstance;
    
    if(instance.collection){
    	var dbInstance = instance.dbInstance||simpleportal.db.getInstance();
    	
    	try{
            //var db = simpleportal.db;
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
            	
                if(!instance.service['GET /']){
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
                }
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
        	    		var options = instance.dbmodeloptions;
        	    		//var options = {sorting:instance.defaultsort};
                		if(request.dbid)
                			options.dbid = request.dbid;
                		
        	    		instance.rService.search({}, function(error, data){
	        	    		instance.sendcsv(data, instance.csvfields, request, response);
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
                		
                		if(!instance.service['POST /'])
	                		instance.post('/', function(request, response, callback) {
	    	            		var options = {};
	    	            		if(request.dbid)
	    	            			options.dbid = request.dbid;
	    	            		
	    	            		instance.cudService.add(request, response, callback, options);
	    	                });
    	                
                		if(!instance.service['PUT /:id'])
	                		instance.put('/:id', function(request, response, callback) {
	    	                	var options = instance.dbmodeloptions;
	    	            		if(request.dbid)
	    	            			options.dbid = request.dbid;
	    	            		
	    	                	instance.cudService.update(request, response, callback, options);
	    	                });
    	                
                		if(!instance.service['DELETE /:id'])
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
    	
    	if(instance.remoteservice){
			logger.getInstance().info('Service Wrapper', 'Creating proxy services for Remote service - ' + instance.name);

			instance.remoteService = new RemoteService(instance);
			
			if(!instance.configuration || Object.keys(instance.configuration).length === 0){
				logger.getInstance().warn('Service Wrapper', 'Service ['  + instance.name + '] need remote service configuration please update configuration or Service!');
			}
    	}
    	
        if(callback)
        	callback();
	} else if(instance.remoteservice){
		logger.getInstance().info('Service Wrapper', 'Registering proxy services for Remote service - ' + instance.name);
		instance.remoteService = new RemoteService(instance);
		
		if(!instance.configuration || Object.keys(instance.configuration).length === 0){
			logger.getInstance().warn('Service Wrapper', 'Service ['  + instance.name + '] need remote service configuration please update configuration or Service!');
		}
		
		if(!instance.service['GET /'])
        	instance.get('/', function(request, response, callback) {
        		var options = instance.dbmodeloptions;
        		if(request.dbid)
        			options.dbid = request.dbid;
        		
        		var func_ = function(error, data){
        			if(instance.aftersearch){
            			instance.aftersearch(error, data, callback);
            		}else
            			callback(error, data);
        		}
        		
        		instance.remoteService.search({}, request, func_, options);
    	    });
        
	    if(!instance.service['GET /count'])
	    	instance.get('/count', function(request, response, callback) {
	    		var options = instance.dbmodeloptions;
	    		if(request.dbid)
        			options.dbid = request.dbid;
        		
	    		instance.remoteService.count({}, request, callback, options);
    	    });
        
	    if(!instance.service['GET /search'])
	    	instance.get('/search', function(request, response, callback) {
	        	var options = {};
	    		if(request.dbid)
	    			options.dbid = request.dbid;
					
					var func_ = function(error, data){
	        			if(instance.aftersearch){
	            			instance.aftersearch(error, data, callback);
	            		}else
	            			callback(error, data);
	        		}
        		
	    		instance.remoteService.search({}, request, func_, options);
	        });
		
        if(!instance.service['GET /:id'])
        	instance.get('/:id', function(request, response, callback) {
            	var options = instance.dbmodeloptions;
            	options.details = 'true';
        		if(request.dbid)
        			options.dbid = request.dbid;
        		var o_id = request.pathGroup;
        		
        		var func_ = function(error, data){
        			if(instance.afterdetails){
            			instance.afterdetails(error, data, callback);
            		}else
            			callback(error, data);
        		}
        		
        		instance.remoteService.details(o_id, request, func_, options);
    	    });
        
        if(!instance.service['POST /'])
			instance.post('/', function(request, response, callback) {
				var object = instance.getObject(request);
				
				if(object.validationmessages && object.validationmessages.length > 0){
					callback(object.validationmessages, object);
				}else{
					delete object.validationmessages;

					var func_ = function(error, data){
	        			if(instance.afterupdate){
	            			instance.afterupdate(error, data, callback);
	            		}else
	            			callback(error, data);
	        		}
					
					instance.remoteService.add_update(null, object, request, func_);
				}
	        });
        
        if(!instance.service['PUT /'])
        	instance.put('/:id', function(request, response, callback) {
				var object = instance.getObject(request);
				
				if(object.validationmessages && object.validationmessages.length > 0){
					callback(object.validationmessages, object);
				}else{
					delete object.validationmessages;
					
					var func_ = function(error, data){
	        			if(instance.afterupdate){
	            			instance.afterupdate(error, data, callback);
	            		}else
	            			callback(error, data);
	        		}
					
					instance.remoteService.add_update(request.pathGroup, object, request, func_);
				}
	        });
        
        if(!instance.service['DELETE /'])
	        instance.remove('/:id', function(request, response, callback) {
	        	var options = {};
	    		if(request.dbid)
	    			options.dbid = request.dbid;
	
	    		var func_ = function(error, data){
        			if(instance.afterremove){
            			instance.afterremove(error, data, callback);
            		}else
            			callback(error, data);
        		}
	    		
	    		instance.remoteService.remove(request.pathGroup, request, func_, options);
	        });
        
        if(callback)
        	callback();
	} else{
		logger.getInstance().warn('Sponsor Service', 'Service configuration is not done!!!');
    
	    if(callback)
	    	callback();
	}
};

/**
 * To send the data from the table|collection in a csv format
 * 
 * @method sendcsv
 * 
 * @param {} data 
 * @param {} fields Fields that need to be included in the csv
 * 
 * @param {} request http request from the user
 * @param {} response http response
 */
Service.prototype.sendcsv = function(data, fields, request, response){
	this.sendcsv_(data, fields, request, response);
}

/**
 * To send the data from the table|collection in a csv format
 * 
 * @method sendcsv_
 * 
 * @param {} data 
 * @param {} fields Fields that need to be included in the csv
 * 
 * @param {} request http request from the user
 * @param {} response http response
 * 
 * @private
 */
Service.prototype.sendcsv_ = function(data, fields, request, response){
	var result = new Array();
	
	var instance = this;
	var fields_ = [];
	if(!fields && data){
		fields = fields||[];
		var _fields = data[0];
		for(var field in _fields){
			if(field == '_id'||field == 'created_at')
				continue;
			if(simpleportal.util.arraycontains(instance.auditfields, field))
				continue;
			
			fields.push(field);
			fields_.push('"' + field + '"')
		}
	}else
		for(var i in fields){
			var field = fields[i];
			if(field == '_id'||field == 'created_at')
				continue;
			if(simpleportal.util.arraycontains(instance.auditfields, field))
				continue;
			
			if(field.indexOf('.') != -1){
				fields_.push('"' + field.split('.')[0] + '"');
			}else 
				fields_.push('"' + field + '"')
		}
	
	result.push(fields_.join(','));
	
	data.forEach(function(obj){
		var obj_ = new Array();
		for(var i in fields){
			var field = fields[i];
			
			if(field.indexOf('.') != -1){
				var field_ = field.split('.')[1];
				var valueobj = obj[field.split('.')[0]];
				var values =[];
				if((valueobj instanceof Array || Array.isArray(valueobj)) && typeof valueobj[0] == 'string'){
					value = valueobj.join(',');
				}else if((valueobj instanceof Array || Array.isArray(valueobj)) && typeof valueobj[0] == 'object'){
					for(var itemi in valueobj){
						var item = valueobj[itemi];
						values.push(item[field_]);
					}
					value = values.join(',');
				} else if(typeof valueobj == 'object')
					value = valueobj[field_];
				else
					value = valueobj;
			}else{
				value = obj[field]||'';
				
				if(value instanceof Array || Array.isArray(value) && typeof value[0] != 'object'){
					value = value.join(',');
				} else if(typeof value == 'object')
					value = JSON.stringify(value);
			}
			if(value)
				value = String(value);
			else
				value = '';
			if(value.indexOf(',') != -1)
				value = '"'+value + '"'
			
			obj_.push(value);
		}
		
		result.push(obj_.join(','))
	});
	response.send(200, {'content-type':'text/csv; charset=utf8'}, result.join('\n'));
}

/**
 * Callback function when an api request is made to the service
 * 
 * @method call
 * 
 * @param {} path URI path requested
 * @param {} request http request of the user
 * @param {} response http response
 * 
 * @param {callback} callback The callback to excecute when complete
 */
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

/**
 * To register api for removing the records from the service
 * 
 * @method remove
 * 
 * @param {} path URI path 
 * @param {callback} callback The callback to excecute when complete
 */
Service.prototype.remove = function(path, callback){
	var instance = this;

	instance.register(path, callback, 'DELETE');
}

/**
 * To register api for getting records from the service
 * 
 * @method get
 * @param {} path URI path
 * @param {callback} callback The callback to excecute when complete
 */
Service.prototype.get = function(path, callback){
	var instance = this;

	instance.register(path, callback, 'GET');
}

/**
 * To register api for putting records in to the service
 * 
 * @method put
 * 
 * @param {} path URI path
 * @param {callback} callback The callback to excecute when complete
 */
Service.prototype.put = function(path, callback){
	var instance = this;
	instance.register(path, callback, 'PUT');
}

/**
 * To register api for posting records in to the service
 * @method post
 * 
 * @param {} path URI path
 * @param {callback} callback The callback to excecute when complete
 */
Service.prototype.post = function(path, callback){
	var instance = this;
	instance.register(path, callback, 'POST');
}

/**
 * To register sub api to the service
 * 
 * @method register
 * 
 * @param {string} path URI path
 * @param {function} servicecallback calback function for the api
 * @param {string} method http method
 * 
 * @private
 */
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

/**
 * Method which is called before the service function is called
 * 
 * @method servicepre
 * 
 * @param {object} request http request
 * @param {object} response http reponse
 * @param {function} servicecallback service function
 * @param {callback} callback The callback to excecute when complete
 */
Service.prototype.servicepre = function(request, response, servicecallback, callback){
	var instance = this;
	if(request.skipfilter)
		servicecallback(request, response, callback);
	else if(instance.userrole && !request.isAuthenticated() && !request.skipfilter){
		callback('Permission denied');
	}else if(instance.userrole && (request.user&&instance.userrole != request.user.role) && !request.skipfilter){
		callback('Permission denied');
	}else{
		if(instance.permissionCheck)
			instance.permissionCheck(request, null, request.user, function(error){
				if(error)
					callback(error);
				else
					servicecallback(request, response, callback);
			});
		else
			servicecallback(request, response, callback);
	}
}

/**
 * Method which is called after the service function is called
 * 
 * @method servicepost
 * @param {} error error during the service pre function
 * @param {} result data returend from the service pre function
 * @param {} servicecallback service function
 * 
 * @param {callback} callback The callback to excecute when complete
 */
Service.prototype.servicepost = function(error, result, servicecallback, callback){
	var instance = this;
	servicecallback(error, result, callback);
}

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
var RService = function(superService, options){
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
var CUDService = function(superService, options){
	var instance = this;
	
	instance.service = superService;
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
        	instance.service.getStorageService().add_update(query, object, callback, instance.service.beforeSave, options);
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
    
    var object = instance.service.getObject(request);
    
    options = options||{};
	
    if(object.validationmessages && object.validationmessages.length > 0){
    	callback(object.validationmessages, object);
    } else if(id){
        var new_id = instance.service.getObjectId(object);

        object.id = new_id;

        if(object.hasOwnProperty('validationmessages'))
        	delete object.validationmessages;
        
        if(instance.service['afterSave'])
        	instance.service.getStorageService().add_update({id:id}, object, function(error, result){
        		if(error)
        			callback(error, result);
        		else
        			instance.service.afterSave(error, result, callback, options);
        	}, instance.service.beforeSave, options);
        else
        	instance.service.getStorageService().add_update({id:id}, object, callback, instance.service.beforeSave, options);
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
			return simpleportal.db.getObjectId(ids);
		}else{
			try{
				var o_id = simpleportal.db.getObjectId(ids);
				
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
	
	options = options||{};
	
	var query = {};
	
	var objid;
	if(id&&id.indexOf(',') != -1) 
		objid=getObjectIds(id, instance);
	
	if(id&&id.indexOf(',') != -1 && objid &&  typeof objid=='object'){
		query={ '_id' : {$in : objid} };
	}else {
		if(id && typeof id == 'object')
			query = id; 
		else if(instance.service.primaryKeyType == 'Number')
			query[instance.service.primaryKey]=Number(id);
		else if (instance.service.primaryKeyType == 'BSONUUID'){
			query[instance.service.primaryKey]=simpleportal.db.getObjectId(id);
		}else
			query[instance.service.primaryKey]=id;

		var searchquery = query;
		
		try{
			var o_id = simpleportal.db.getObjectId(id);
			query = {$or: [{ '_id' : o_id }, searchquery]};
		}catch(error){
			//console.log(error);
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

/**
 * @class Service.StorageService
 * 
 * @constructor
 * 
 * @param {object} options Options for the service
 */
var StorageService = function(options){
	var instance = this;
	
	instance.dbid = options.dbid||'default';
	instance.collectionName = options.collectionName||'default';
}

/**
 * To get the underlying db instance
 * 
 * @method getDBInstance
 * 
 * @param {} options Options for the db instance
 * 
 * @param {callback} callback The callback to excecute when complete
 */
StorageService.prototype.getDBInstance = function(options, callback){
	var instance = this;
	
	var db = simpleportal.db;
	if(typeof options == 'function' ){
		callback = options;
		options = {};
	}
	options = options||{};
	
	db.dbpool.getInstance((options.dbid||instance.dbid), callback);
};
		
/**
 * To get the underlying database table|collection
 * 
 * @method getCollection
 * 
 * @param {} options Options for the db instance
 * @param {callback} callback The callback to excecute when complete
 */
StorageService.prototype.getCollection = function(options, callback){
	var instance = this;
	
	if(typeof options =='fiunction'){
		callback=options;
		options = {};
	}
	
	options = options||{};
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

/**
 * To re save an exisiting object in the database table|collection
 * 
 * @method resaveobject
 * 
 * @param {} object Object that need to be resaved
 * 
 * @param {callback} callback The callback to excecute when complete
 * 
 * @param {} service Service instance
 * @param {} options dataabse configuration
 */
StorageService.prototype.resaveobject = function(object, callback, service, options){
	var instance = this;
	delete object._id;
	
	if(service['afterSave'])
		instance.add_update({id:object.id}, object, function(error, newobj){
			if(error)
    			callback(error, newobj);
    		else
    			service.afterSave(error, newobj, callback, options);
		}, service.beforeSave, options);
    else
		instance.add_update({id:object.id}, object, function(error, newobj){
			callback(error, newobj);
		}, service.beforeSave, options);
}

/**
 * To check the data for integrity check
 * 
 * @method checkcollection
 * 
 * @param {callback} callback The callback to excecute when complete
 * @param {} service Service instance
 * @param {} options datatabse configuration
 */
StorageService.prototype.checkcollection = function(callback, service, options){
	var instance = this;
	options = options||{};
	logger.getInstance().info('Simpleportal -servicewrapper', 're saving the data, incase of any audit field is missing! - ' + service.name);
	instance.findAll(function(error, result){
		if(result && !error){
			var count = result.length;
			var callbackcount = 0;
			result.forEach(function(object){
				instance.resaveobject(object, function(error, newobj){
					if(count == ++callbackcount)
						callback(null);
				}, service, options);
			});
		}else
			callback(error);
	}, options);
};

/**
 * To save the record in to the underlying databse table|collection
 * 
 * @method save
 * 
 * @param {} results objest as array or single object 
 * @param {callback} callback The callback to excecute when complete
 * @param {} options databse configuration
 */
StorageService.prototype.save = function(results, callback, options){
	var instance = this;
	options = options||{};
	if(!results){
		logger.getInstance().warn('Simple Portal - storage service', 'No result skipping save!!');
		callback('No result skipping save!!');
	}else {
		var single = true;
		if(results && typeof(results.length) == "undefined"){
			results.created_at = new Date();
			results.ctimestamp = new Date().getTime();
			
			instance.getCollection(options, function(error, collection){
				if(error)
					callback(error);
				else
					collection.insert(results, function(error, data){
						if(data && typeof(data.length) == "undefined"){
							callback(error, data);
						} else if(data)
							callback(error, data[0]);
						else 
							callback(error, data);
					});
			});
		}else{
			for( var i = 0; i< results.length; i++ ) {
				result = results[i];
				result.created_at = new Date();
				results.ctimestamp = new Date().getTime();
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

/**
 * To find records from the databse table|collection
 * 
 * @method find
 * 
 * @param {} query JSON search query
 * @param {callback} callback The callback to excecute when complete
 * @param {} options databse configuration
 */
StorageService.prototype.find = function(query, callback, options) {
	var instance = this;
	options = options||{};
	var dboptions = util.extendJSON({}, options);//options||{};
	
	if(dboptions && dboptions.hasOwnProperty('details'))
		delete dboptions.details;
	if(dboptions && dboptions.hasOwnProperty('dbid'))
		delete dboptions.dbid;
	
	instance.getCollection(options, function(error, collection){
		if(error)
			callback(error);
		else{
			collection.find(query, dboptions).toArray(function(error, results) {
				callback(error, results);
		    });
		}
	});
};

/**
 * To find all records from the database table|collection
 * 
 * @method findAll
 * @param {callback} callback The callback to excecute when complete
 * @param {} options databse configuration
 */
StorageService.prototype.findAll = function(callback, options) {
	var instance = this;
	
	options = options||{};
	//var dboptions = options;
	var dboptions = util.extendJSON({}, options);//options||{};

	if(dboptions && dboptions.hasOwnProperty('details'))
		delete dboptions.details;
	if(dboptions.hasOwnProperty('dbid'))
		delete dboptions.dbid;
	
	instance.getCollection(options, function(error, collection){
		if(error)
			callback(error);
		else{
			collection.find({}, dboptions).toArray(function(error, results) {
				callback(error, results);
		    });
		}
	});
};

/**
 * To find a record from the databse table|collection
 * 
 * @method findOne
 * @param {} query JSON search query
 * @param {callback} callback The callback to excecute when complete
 * @param {} options databse configuration
 */
StorageService.prototype.findOne = function(query, callback, options) {
	var instance = this;
	query = query || {};
	//var dboptions = options||{};
	options = options||{};
	var dboptions = util.extendJSON({}, options)
	
	if(dboptions && dboptions.hasOwnProperty('details'))
		delete dboptions.details;
	if(dboptions.hasOwnProperty('dbid'))
		delete dboptions.dbid;
	
	instance.getCollection(options, function(error, collection){
		if(error)
			callback(error);
		else{
			collection.findOne(query, dboptions, callback);
		}	
	});
};

/**
 * To remove a record from the database table|çollection
 * 
 * @method remove
 * 
 * @param {} query JSON search query
 * @param {callback} callback The callback to excecute when complete
 * @param {} options databse configuration
 */
StorageService.prototype.remove = function(query, callback, options) {
	var instance = this;

	//var dboptions = options||{};
	options = options||{};
	var dboptions = util.extendJSON({}, options);
	
	instance.getCollection(dboptions, function(error, collection){
		if(error)
			callback(error);
		else{
			collection.remove(query, function(error, removedCount){
				
				if(removedCount==0&&!error)
					error='No record deleted!';
				
				if(callback)
					callback(error, removedCount);
			});
			//callback(null, {});
		}
	});
};

/**
 * To update a record in to the databse table|collection
 * @method update
 * 
 * @param {} query JSON search query
 * @param {} data data to be updated
 * @param {callback} callback The callback to excecute when complete
 * @param {} options databse configuration
 */
StorageService.prototype.update = function(query, data, callback, options) {
	var instance = this;
	options = options||{};
	var dboptions = util.extendJSON({}, options);
	
	instance.getCollection(dboptions, function(error, collection){
		if(error)
			callback(error);
		else{
			data.modified_at = new Date();
			data.timestamp = new Date().getTime();
			
			collection.update(query, {$set: data}, {safe:true}, function(error, updateCount, updatedetails){
				if(updateCount == 0)
					callback({updateCount:updateCount, messaeg : 'No record updated'}, updatedetails);
				else if(error)
					callback(error, updatedetails);
				else
					collection.findOne(query, callback);
			})
		}
	});
};

/**
 * To ge the number of records in the database table|collection
 * 
 * @method count
 * @param {} query JSON search query
 * @param {callback} callback The callback to excecute when complete
 * @param {} options databse configuration
 */
StorageService.prototype.count = function(query, callback, options) {
	var instance = this;
	options = options||{};
	var dboptions = util.extendJSON({}, options);
	
	instance.getCollection(dboptions, function(error, collection){
		if(error)
			callback(error);
		else
			collection.count(query, function(error, count) {
				callback(error, count);
			});
	});
};

/**
 * To clear all records in a database table|collection
 * 
 * @method clear
 * @param {callback} callback The callback to excecute when complete
 * @param {} options databse configuration
 */
StorageService.prototype.clear = function(callback, options) {
	var instance = this;

	options = options||{};
	var dboptions = util.extendJSON({}, options);
	
	instance.getCollection(dboptions, function(error, collection){
		if(error)
			callback(error);
		else{
			collection.remove();
			callback(null, {});
		}
	});
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
 * @param {} options databse configuration
 */
StorageService.prototype.ensureIndex = function(query, arg1, callback, options) {
	var instance = this;
	options = options||{};
	var dboptions = util.extendJSON({}, options);
	
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

/**
 * To add or update record, if the record is available then it will update the record, else it will add a new record
 * @method add_update
 * 
 * @param {} query JSON Query to check for existing record, mostly the primary key|unique fields in the database
 *  
 * @param {object} object Object to be saved in to the database
 * 
 * @param {callback} callback The callback to excecute when complete
 * @param {function} beforeSave Function which will be executed before saving the record
 * @param {} options databse configuration
 */
StorageService.prototype.add_update = function(query, object, callback, beforeSave, options){
	var instance = this;
	
	if(beforeSave){
		beforeSave(object, function(error, object){
			if(error)
				callback(error);
			else
				instance.add_update(query, object, callback, null, options);
		}, options);
	} else{
		if(query && query.id){
			if (query.id) {
				if(query.id != object.id){
					var dbquery={};
					if(query.id.length == 24){
						dbquery={$or:[{id:object.id}, {_id:simpleportal.db.getObjectId(query.id)}]}
					}else
						dbquery={id: query.id};
					
					instance.findOne({id: object.id}, function(err, objectFromDB) {
						if ((!objectFromDB || objectFromDB == '')||(objectFromDB&&objectFromDB._id==query.id)) {
							instance.update(dbquery, object, callback, options);
						} else {
							callback({id:"A  record with id -" + object.id + " is already exists in our database. Please enter new values."});
						}
					}, options);
				}else{
					var dbquery={};
					if(query.id.length == 24){
						dbquery={$or:[{id:object.id}, {_id:simpleportal.db.getObjectId(query.id)}]}
					}else
						dbquery={id: query.id};
						
					instance.findOne(dbquery, function(err, objectFromDB) {
						if((!objectFromDB || objectFromDB == '')){
							instance.save(object, function(error, data){
								if(!error/*&&!data*/){
									instance.findOne(dbquery, callback);
								}else
									callback(error, data);
							}, options);
						} else if((objectFromDB.id == object.id)||(objectFromDB&&objectFromDB._id==object.id)) {
							instance.update(dbquery, object, callback, options);
						} else {
							callback({id:"A  record with id -" + object.id + " is already exists in our database. Please enter new values."});
						}
					}, options);
				}/*
					instance.update({id: query.id}, object, callback, options);*/
			} else {
				callback({id:"Please enter the id-" + query.id + " for updating"});
			}
		} else{
			var id = object.id;
			if(id){
				if(id.length == 24){
					dbquery={$or:[{id:id}, {_id:simpleportal.db.getObjectId(id)}]}
				}else
					dbquery={id: id};
				
				instance.findOne(dbquery, function(err, objectFromDB) {
					if ((!objectFromDB || objectFromDB == '')||(objectFromDB&&objectFromDB._id==object.id)) {
						instance.save(object, function(error, data){
							if(!error/*&&!data*/){
								instance.findOne(dbquery, callback);
							}else
								callback(error, data);
						}, options);
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

/**
 * To get the distinct values from the database table|collection
 * 
 * @method distinct
 * 
 * @param {} field field for which the distinct values are searched
 * @param {} query JSON search query
 * @param {callback} callback The callback to excecute when complete
 */
StorageService.prototype.distinct = function(field, query, callback) {
	var instance = this;
	
	instance.getCollection({}, function(error, collection){
		if(error)
			callback(error);
		else{
			var ary = collection.distinct(field);
			callback(ary);
		}
	});
};


/**
 * Getting the max value of a field in the collection
 * 
 * @method maxValueFeasibilityDb
 * @param {} field
 * @param {} callback
 * @return 
 */
StorageService.prototype.getMaxValue = function(field, callback){
	var instance = this;
	
	logger.getInstance().info('StorageService : getMaxValue - ', field);
	
	instance.getCollection({}, function(error, collection){
		if(error)
			callback(error);
		else{
			var options = {};
			options[field] = 1;
			
			var sort={};
			sort[field]=-1;
			
			options.sort = sort;
			
			collection.findOne({}, function(error, data){
				if(data)
					callback(null, data[field]);
				else
					callback(error);
			}, options);
		}
	});
};

/**
 * RemoteService
 * 
 * Servcie wrapper for connecting to remote Service
 * 
 * @class Service.RemoteService
 * @constructor
 * 
 * @param {} service Parent service
 */
var RemoteService = function(service){
	var instance = this;
	
	instance.service = service;
	instance.serveroptions = instance.service.configuration||{};
}

/**
 * To add or update record, if the record is available then it will update the record, else it will add a new record
 * 
 * @method add_update
 * @param {} id id ofthe record
 * @param {object} object Object to be saved in to the database
 * @param {} request http request
 * @param {callback} callback The callback to excecute when complete
 * @param {} cache whether to cache the data in to the local database or not
 */
RemoteService.prototype.add_update = function(id, object, request, callback, cache){
	var instance = this;
	
	logger.getInstance().info('Simpleportal -service wrapper', instance.serveroptions);
	logger.getInstance().info('Simpleportal -service wrapper', instance.service.configuration);
	
	var path = instance.service.configuration.search.path;
	if(instance.service.configuration.details && instance.service.configuration.search.details)
		path = instance.service.configuration.details.path + '/' + id;
	
	if(id){
        path = path + '/' + id;
        
        if(id.indexOf('/') == -1 && instance.serveroptions.details && instance.serveroptions.details.sub_path)
            path = path + '/' + instance.serveroptions.details.sub_path;
    }else if(instance.serveroptions.details && instance.serveroptions.details.sub_path)
        path = path + '/' + instance.serveroptions.details.sub_path;
	
	var server_options = {
		host: instance.service.configuration.host,
		port: instance.service.configuration.port,
		path: path,
		method:(id ? 'PUT' : 'POST'),
		oauth:instance.service.configuration.oauth,
		oauthprovider:instance.service.configuration.oauthprovider,
		secure:instance.service.configuration.secure||false,
		skiplogin:instance.service.configuration.skiplogin||false
    };
	
	server_options.postdata = JSON.stringify(object);
	
	util.post(server_options, request, function(err, results){
		if(err){
			logger.getInstance().warn('Simpleportal -service wrapper', 'Some Error while add/update to remote server!!' + err);
			callback(err);
		}else{
			callback(err, results);
		}
	});
}

/**
 * To form the search parameters from the search object for search api
 * 
 * @method searchqueryparams_
 * 
 * @param {} query exisiting search query
 * @param {} request http request
 * @return queryparams
 * 
 * @private
 */
RemoteService.prototype.searchqueryparams_ = function(query, request){
	var instance = this;
	
	var params = instance.serveroptions.search.queryparams||instance.service.searchqueryparams;
	
	var queryfields = [];
	if(params){
		for(var param in params){
			var fields = params[param];
			if(!fields || fields == ''){
				queryfields.push({field:param, remotefield:param});
			}else{
				queryfields.push({field:param, remotefield:fields});
			}
		}
	}
	
	var queryparams =[];
	if(queryfields && request.query)
		for(var querfield in queryfields){
			var field = queryfields[querfield];
			
			if(request.query[field.field] && request.query[field.field] != ''){
				queryparams.push(field.remotefield + '=' + escape(request.query[field.field]));
			}
		}
	if(query){
		for(var q in query)
			queryparams.push(q + '=' + query[q]);
		
	}
	return queryparams;
}

/**
 * To get the search parameters as JSON object
 * 
 * @method searchqueryparamsAsJSON
 * 
 * @param {} query search query object
 * @param {} request http request
 * 
 * @return queryparams JSON object with search parameters
 * @private
 */
RemoteService.prototype.searchqueryparamsAsJSON = function(query, request){
	var instance = this;
	
	var params = instance.serveroptions.search.queryparams||instance.service.searchqueryparams;
	
	var queryfields = [];
	if(params){
		for(var param in params){
			var fields = params[param];
			if(!fields || fields == ''){
				queryfields.push({field:param, remotefield:param});
			}else{
				queryfields.push({field:param, remotefield:fields});
			}
		}
	}
	
	var queryparams = {};
	if(queryfields && request.query)
		for(var querfield in queryfields){
			var field = queryfields[querfield];
			
			if(request.query[field.field] && request.query[field.field] != ''){
				queryparams[field.remotefield] = request.query[field.field];
			}
		}
	if(query){
		for(var q in query)
			queryparams[q] = query[q];
		
	}
	return queryparams;
}

/**
 * To get the server options for sending to the remote server request
 * 
 * @method serach_remoteoptions
 * 
 * @param {} query uery parameters to include
 * @param {} request http request
 * 
 * @return server_options fromatted server options
 * @private
 */
RemoteService.prototype.serach_remoteoptions = function(query, request){
	var instance = this;

	var path = instance.serveroptions.search.path;
	
	// TO pass remote server path , after seting path remove path variable
	if(query&&query.path){
		path = query.path;
		delete query.path;
	}	

	// incase to fetch using sub path
	if(query&&query.sub_path){
		path = path + '/' + query.sub_path;
		
		delete query.sub_path;
	}else if(instance.serveroptions.search && instance.serveroptions.search.sub_path)
		path = path + '/' + instance.serveroptions.search.sub_path;
	
	var querystring;
	var queryparams = instance.searchqueryparams_(query, request);
	
	if(queryparams)
		querystring = queryparams.join('&');
	if(querystring && path.indexOf('?') == -1)
		path = path + '?' + querystring;
	
	else if(querystring)
		path = path + '&' + querystring;
	
	var server_options = {
      host: instance.serveroptions.host,
      port: instance.serveroptions.port,
      path: path,
      oauth:instance.serveroptions.oauth,
      oauthprovider:instance.service.configuration.oauthprovider,
      secure:instance.serveroptions.secure||false,
      skiplogin:instance.service.configuration.skiplogin||false
    };
	
	return server_options;
}

/**
 * To search for records 
 * 
 * @method search
 * 
 * @param {} query search query
 * @param {} request http request
 * @param {callback} callback The callback to excecute when complete
 * @param {} cache Whether to cache the record in to the local database or not
 * @return 
 */
RemoteService.prototype.search = function(query, request, callback, cache){
	var instance = this;
	
	var server_options = instance.serach_remoteoptions(query, request);
	
	util.getJSON(server_options, request, function(err, results){
		if(err){
			logger.getInstance().warn('Simpleportal -ervice wrapper', 'Some Error while retreiving data from remote server!!' + err);
			callback(err);
		}else{
			callback(err, results);
		}
	});
}


/**
 * To search for records 
 * 
 * @method search
 * 
 * @param {} query search query
 * @param {} request http request
 * @param {callback} callback The callback to excecute when complete
 * @param {} cache Whether to cache the record in to the local database or not
 * @return 
 */
RemoteService.prototype.count = function(query, request, callback, cache){
	var instance = this;
	
	if(!instance.serveroptions.count||!instance.serveroptions.count.path)
		query.sub_path ="count";
	
	var server_options = instance.serach_remoteoptions(query, request);
	
	util.getJSON(server_options, request, function(err, results){
		if(err){
			logger.getInstance().warn('Simpleportal -ervice wrapper', 'Some Error while retreiving data from remote server!!' + err);
			callback(err);
		}else{
			callback(err, results);
		}
	});
}

/**
 * To ge the details of a record from the remote server
 * @method details
 * 
 * @param {} id id of the object
 * @param {} request http request
 * @param {callback} callback The callback to excecute when complete
 * @param {} cache Whether to cache the record in to the local database or not
 * @return 
 */
RemoteService.prototype.details = function(id, request, callback, cache){
	var instance = this;
	
	var path = instance.service.configuration.search.path;
	if(instance.service.configuration.details && instance.service.configuration.search.details)
		path = instance.service.configuration.details.path + '/' + id;
	
	if(id){
        path = path + '/' + id;
        
        if(id.indexOf('/') == -1 && instance.serveroptions.details && instance.serveroptions.details.sub_path)
            path = path + '/' + instance.serveroptions.details.sub_path;
    }else if(instance.serveroptions.details && instance.serveroptions.details.sub_path)
        path = path + '/' + instance.serveroptions.details.sub_path;
	
	var server_options = {
      host: instance.service.configuration.host,
      port: instance.service.configuration.port,
      path: path,
      oauth:instance.serveroptions.oauth||instance.service.configuration.oauth,
      oauthprovider:instance.service.configuration.oauthprovider,
      secure:instance.serveroptions.secure||instance.service.configuration.secure,
      skiplogin:instance.service.configuration.skiplogin||false
    };
	
	logger.getInstance().info('Simpleportal -service wrapper', 'Getting details from remote server.');
	logger.getInstance().info('Simpleportal -service wrapper', server_options);
	
	util.getJSON(server_options, request, function(err, results){
		if(err){
			logger.getInstance().warn('Simpleportal -service wrapper', 'Some Error while retreiving data from remote server!!' + err);
			callback(err);
		}else{
			callback(err, results);
		}
	});
}

/**
 * To remove a record from the remote server
 * 
 * @method remove
 * @param {} id id of the record
 * @param {} request http request
 * 
 * @param {callback} callback The callback to excecute when complete
 */
RemoteService.prototype.remove = function(id, request, callback){
	var instance = this;
	
	var path = instance.service.configuration.search.path;
	if(instance.service.configuration.details && instance.service.configuration.details.path)
		path = instance.service.configuration.details.path;
	
	if(id){
        path = path + '/' + id;
        
        if(instance.service.configuration.details && instance.service.configuration.details.path){}
        else if(id.indexOf('/') == -1 && instance.serveroptions.details && instance.serveroptions.details.sub_path)
            path = path + '/' + instance.serveroptions.details.sub_path;
    }else if(instance.serveroptions.details && instance.serveroptions.details.sub_path)
        path = path + '/' + instance.serveroptions.details.sub_path;
	
	var server_options = {
      host: instance.service.configuration.host,
      port: instance.service.configuration.port,
      path: path,
      oauth:instance.serveroptions.oauth,
      oauthprovider:instance.service.configuration.oauthprovider,
      secure:instance.serveroptions.secure||false,
      method: 'DELETE',
      skiplogin:instance.service.configuration.skiplogin||false
    };
	
	logger.getInstance().info('Simpleportal -service wrapper', 'Getting details from remote server.');
	logger.getInstance().info('Simpleportal -service wrapper', server_options);
	
	util.post(server_options, request, function(err, results){
		if(err){
			logger.getInstance().warn('Simpleportal -service wrapper', 'Some Error while retreiving data from remote server!!' + err);
			callback(err);
		}else{
			callback(err, results);
		}
	});
};

exports.CRUDService = Service;
exports.StorageService = StorageService;
exports.RemoteService = RemoteService;
exports.RService = RService;