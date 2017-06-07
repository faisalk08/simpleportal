"use strict";
/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal
 * MIT Licensed
 */
var simpleportalUtil = require("./../util"),
	editorUtil=require('./../editor').Util,
	TemplateUtils=require('./../template/util'),
	TemplateUtil=require('./../util/templateutil'),
	fs = require("fs"),
	events = require('events'),
	Template=require("./../util/template"),
	simpleportal = require('./../simpleportal'),
	StorageService=require("./storageservice"),
	RService=require("./rservice"),
	CUDService=require("./cudservice"),
	RemoteService=require("./remoteservice");

var DEFAULT_CONFIGURATION = {
	modify : true,
	dbid:'default',
	primaryKey:'id',
	model:{},
	service:{}
};

/**
 * Simpleportal service 
 * 
 * name can not be following keywords bootstrap | jquerymobile | view | api | apiservice
 * 
 * @class Service.CRUDService
 * @module simpleportal
 * @submodule wrapper
 * 
 * @constructor
 * @param {} options Options for the service 
 *  
 */
var Service = module.exports = function(options) {
	events.EventEmitter.call(this);
//    RService.call(this);
    
	var instance = this;
	
	instance.options = options;
	
	instance.status = options.status||'active';
    instance.modify = options.modify||false;
    
    instance.remoteservice = options.remoteservice||false;
    instance.viewservice = options.viewservice||(!options.hasOwnProperty("viewservice"));
    instance.restservice = options.restservice||(!options.hasOwnProperty("restservice"));
    
    instance.localcache = options.localcache;
    instance.scheduler = options.scheduler||false;
    instance.defaultsort = options.defaultsort;
    instance.hiddenFields = options.hiddenFields;
    
    instance.collection = options.collection;
    instance.dbInstance = options.dbInstance;
    
    instance.dbid = options.dbid||'default';
    
    instance.name = options.name;
    if(options.title)
    	instance.title = options.title;
    
    instance.primaryKey = options.primaryKey||'id';
    
    instance.primaryKeyType = options.primaryKeyType;
    if(options.primaryKeyFields && typeof options.primaryKeyFields == 'string')
    	instance.primaryKeyFields = options.primaryKeyFields.split(',');
    else	
    	instance.primaryKeyFields = options.primaryKeyFields||[];
    
    instance.dataformat = options.dataformat;
    instance.model = options.model||{};
    
    if(!options.primaryKey&& (!instance.model||Object.keys(instance.model).length ==0))
		instance.primaryKey="_id";
    
    instance.validation = options.validation||{};
    instance.service = options.service||{};
    instance.userrole = options.userrole;
    
    instance.auditfields = options.auditfields||['_id', 'created_at'];
    instance.csvfields = options.csvfields;
    
    instance._searchqueryparams = {
		_id:'', pipeline:'', $group:'', $match:''	
    };
    
    instance.searchqueryparams = {
		start:'', end : '', orderByCol : '', orderByType:''
    };
    
    if(options.searchqueryparams)
    	instance.searchqueryparams = simpleportalUtil.extendJSON(instance.searchqueryparams, options.searchqueryparams);
    
    instance.dbmodeloptions = {};
    
    instance.statuslist = {
    	imported:'Imported', "default" : 'Default', active : 'Active', archived:'Archived'
    };
    
    if(options.statuslist)
    	instance.statuslist = simpleportalUtil.extendJSON(instance.statuslist, options.statuslist);
    
    instance.eventlist=[];
    /*
    instance.modelsettings={};
    
    if(options.modelsettings)
    	instance.modelsettings=simpleportalUtil.extendJSON(instance.modelsettings, options.modelsettings);
    */
    instance._configuration = {
    	uri:instance.name, modelsettings:{}
    };

    if(instance.primaryKeyFields && instance.primaryKeyFields.length == 1)
    	if(!instance.validation[instance.primaryKeyFields[0]])
    		instance.validation[instance.primaryKeyFields[0]]= "required";
    		
    if(instance.validation){
    	instance.setConfiguration({validation:instance.validation});
    }
    
    if(options.configuration)
    	instance.setConfiguration(options.configuration);
    
    instance.maxrecords=options.maxrecords||100;// can use to limit the number of records fetched per request
    
    options.servicetemplates = simpleportalUtil.extendJSON({
    	"view.js" 	: "view.js", // Generating dynamic backbone model file 
    	"model.js" 	: "model.js", // Generating dynamic backbone model file 
    	"searchform":"searchform"
    }, options.servicetemplates);
    
    instance.servicetemplates = simpleportalUtil.extendJSON({}, simpleportal.Constants.ServiceTemplates, options.servicetemplates);
    instance.rService;
    
    instance._preference={};
    
    return this;
};
//require("util").inherits(Service, RService);
require("util").inherits(Service, events.EventEmitter);

Service.prototype.getApiUrl = function(subpath){
	var instance = this;
	
	var apiurl;
	
	if(!instance.apiurl)
		if(instance.serviceurl)
			apiurl = instance.getServiceloader().serviceUrl + '/' + instance.serviceurl;
		else
			apiurl = instance.getServiceloader().serviceUrl + '/' + instance.name;
	else
		apiurl = instance.apiurl;
	
	if(subpath)
		apiurl = simpleportal.util.appendFilePath(apiurl, subpath);
	
	return apiurl;
}

/**
 * To get the view url if view service is enabled
 * 
 */
Service.prototype.getViewUrl = function(mobile){
	var instance = this;
	
	var apiurl = instance.getApiUrl();
	
	return apiurl.replace(instance.getServiceloader().serviceUrl, (instance.plugin ? "/" + instance.plugin : '') + (mobile ? "/mobile" : "") + instance.getServiceloader().viewUrl);
}

var __getServiceConfiguration = function(servicesetting, subfield, callback){
	var modelfield = simpleportalUtil.getJSONObject(servicesetting.modelfields, "field", subfield);
	if(!modelfield)
		return callback("Not a valid field. - " + subfield);
	
	if(modelfield && modelfield.fieldsetting && modelfield.fieldsetting.model){
		modelfield.fieldsetting.modelfields = TemplateUtils.getFieldFromObject(modelfield.fieldsetting.model, '', null, modelfield.fieldsetting.modelsettings);
	}
	
	modelfield.configuration=modelfield.fieldsetting;
//	delete modelfield.fieldsetting;
	
	var subsettings = simpleportalUtil.extendJSON({subservice:true}, servicesetting, {
		modelfield:subfield,
		configuration:modelfield.configuration,
	});

	TemplateUtil.formatModelData(subsettings);
	
	if(modelfield.fieldsetting && modelfield.fieldsetting.model)
		subsettings.model = modelfield.fieldsetting.model;
	else if(modelfield.configuration)
		subsettings.model = modelfield.configuration.model;
	
	if(modelfield.fieldsetting && modelfield.fieldsetting.modelfields)
		subsettings.modelfields = modelfield.fieldsetting.modelfields;
	else if(modelfield.configuration)
		subsettings.modelfields = modelfield.configuration.modelfields;
	
	return callback(null, subsettings);
}

var _getServiceConfiguration = function(serviceconfig, modelfields, callback){
	if(!modelfields || modelfields.length <= 0){
		callback(null, serviceconfig);
	} else
		__getServiceConfiguration(serviceconfig, modelfields.splice(0, 1), function(error, subserviceconfig){
			if(error || !modelfields || modelfields.length <= 0){
				callback(error, subserviceconfig);
			}else 
				_getServiceConfiguration(subserviceconfig, modelfields, callback);
		});	
}

Service.prototype.getServiceConfig = function(subfield, callback){
	var error,
		servicesetting = this.exportConfig();
	
	var instance = this;

	if(subfield){
		_getServiceConfiguration(servicesetting, subfield.split("/"), function(error, modelfield){
			if(!error){
				modelfield.name = instance.name;
				modelfield.modelfield = subfield;
			}
			
			if(callback)
				return callback(error, modelfield);
			else
				return modelfield;
		});
//		
//		var modelfield = simpleportalUtil.getJSONObject(servicesetting.modelfields, "field", subfield);
//		
//		if(modelfield && modelfield.fieldsetting && modelfield.fieldsetting.model){
//			modelfield.fieldsetting.modelfields = TemplateUtils.getFieldFromObject(modelfield.fieldsetting.model, '');
//		}
//		
//		modelfield.name=this.name;
//		modelfield.configuration=modelfield.fieldsetting;
//		
//		delete modelfield.fieldsetting;
//		
//		var subsettings = simpleportalUtil.extendJSON({}, servicesetting, {
////			model:modelfield.configuration.model,
////			modelfields:modelfield.configuration.modelfields,
//			modelfield:subfield,
//			configuration:modelfield.configuration,
////			name : this.name,
////			stats:servicesetting.stats
//		});
//		
//		subsettings.model = modelfield.configuration.model;
//		subsettings.modelfields = modelfield.configuration.modelfields;
		
//		if(callback)
//			return callback(error, servicesetting);
//		return subsettings;
	}else if(callback)
		return callback(error, servicesetting);
	else
		return servicesetting;
}

function getServiceDetails(instance){
	var _searchqueryparams = [];
	for(var i in instance.searchqueryparams){
		var _searchqueryparam = {key:i, value:instance.searchqueryparams[i]};
		_searchqueryparams.push(_searchqueryparam);
	}
	
	return {
		serviceurl:instance.serviceurl||instance.name,
		plugin:instance.plugin,
		primaryKey:instance.primaryKey,
		primaryKeyFields:instance.primaryKeyFields,
		remoteservice:instance.remoteservice,
		viewservice:instance.viewservice,
		modify:instance.modify,
		dbid:instance.dbid, 
		collection:instance.collection, 
		name:instance.name, 
		servicepath:instance.servicepath, 
		title:instance.title,
		description:instance.description, 
		model:instance.model, 
		validation:instance.validation,
		dataformat:instance.dataformat,
		searchqueryparams:_searchqueryparams,
		configuration:simpleportalUtil.extendJSON({}, instance.getConfiguration()),
		userrole:instance.userrole,
		servicetype:instance.system ? 'system' : instance.serviceurl && (instance.serviceurl.indexOf('system') != -1) ? 'system' : (instance.servicetype ||''),
		totalrecords:instance.totalrecords
	};
}

function formatFieldsetting(serviceobject, fieldsetting){
	if(fieldsetting && fieldsetting.hasOwnProperty('url')){
		if(fieldsetting.url.indexOf('/') != 0)
			if(fieldsetting.url)
				fieldsetting.url=serviceobject.apiurl + '/' + fieldsetting.url;
			else
				fieldsetting.url= serviceobject.apiurl;
	}
	
	// check if it has modelsettings
	if(fieldsetting && fieldsetting.modelsettings){
		for(var subfield in fieldsetting.modelsettings){
			var subfieldsetting = fieldsetting.modelsettings[subfield];
			
			formatFieldsetting(serviceobject, subfieldsetting);
		}
	}
}

/**
 * Method for formatted service config data, replacing relative data with absolute data and inheriting validations from the model data
 * 
 * @Method _getServcieConfig
 * 
 */
function _getServiceConfig(serviceobject, instance){
	if(!serviceobject)
		return null;
	
	if(!serviceobject.apiurl)
		if(serviceobject.serviceurl)
			serviceobject.apiurl = instance.getServiceloader().serviceUrl + '/' + serviceobject.serviceurl;
		else
			serviceobject.apiurl = instance.getServiceloader().serviceUrl + '/' + serviceobject.name;
	
	if(serviceobject.model){
		serviceobject.modelfields = TemplateUtils.getFieldFromObject(serviceobject.model, serviceobject.configuration.modelsettings);
	}else if(!serviceobject.modelfields)
		serviceobject.modelfields=[];
	
	if(!serviceobject.configuration)
		serviceobject.configuration = {};
	
	serviceobject.configuration.modelsettings = simpleportalUtil.extendJSON(editorUtil.getModelSettingsFromSettings(serviceobject.modelfields, serviceobject.dataformat, serviceobject.configuration.modelsettings), serviceobject.configuration.modelsettings);
	serviceobject.configuration.validation = simpleportalUtil.extendJSON(editorUtil.getValidationFromSettings(serviceobject.modelfields), serviceobject.configuration.validation);

	// format model configuration
	for(var fieldIndex in serviceobject.modelfields){
		var modelfield = serviceobject.modelfields[fieldIndex];
		
		formatFieldsetting(serviceobject, modelfield.fieldsetting);
		
		if(serviceobject.configuration.modelsettings[modelfield.field])
			formatFieldsetting(serviceobject, serviceobject.configuration.modelsettings[modelfield.field]);
		
		if(serviceobject.primaryKeyFields && simpleportalUtil.arraycontains(serviceobject.primaryKeyFields, modelfield.field)){
			modelfield.primary = true;
		}
	}
	
	if(serviceobject.remoteservice && serviceobject.configuration){
		// copy remote service configuration
		var _remoteservice=simpleportalUtil.copyJSON(
			{},
			["host", "port", "oauth", "oauthprovider", "skiplogin", "secure", "search", "details", "path"],
			serviceobject.configuration
		);
		serviceobject.configuration.remoteservice = simpleportalUtil.extendJSON({}, _remoteservice, serviceobject.configuration.remoteservice||{});
		
		if(!serviceobject.configuration.remoteservice.path || serviceobject.configuration.remoteservice.path == "")
			serviceobject.configuration.remoteservice.path = serviceobject.configuration.search ? serviceobject.configuration.search.path : '';
		
//		serviceobject.configuration.remoteservice=simpleportalUtil.extendJSON({
//			host:serviceobject.configuration.host,
//			port:serviceobject.configuration.port,
//			oauth:serviceobject.configuration.oauth,
//			oauthprovider:serviceobject.configuration.oauthprovider,
//			skiplogin:serviceobject.configuration.skiplogin,
//			secure:serviceobject.configuration.secure,
//			search:serviceobject.configuration.search,
//			details:serviceobject.configuration.details,
//			path:serviceobject.configuration.path||(serviceobject.configuration.search ? serviceobject.configuration.search.path:'')
//		},  serviceobject.configuration.remoteservice); 
	}
	
	if(serviceobject.viewservice){
		if(!serviceobject.configuration)
			serviceobject.configuration = {};
		
		var filepath = serviceobject.servicepath.substr(0, serviceobject.servicepath.lastIndexOf("/"));
		
		// copy remote service configuration
		serviceobject.configuration.viewservice=simpleportalUtil.extendJSON({
			searchresult:{
				primaryDisplay:serviceobject.primaryKey,
			},
			search:"searchresult",
			details:"details",
			form:"searchform"
		},  serviceobject.configuration.viewservice||{});

		// check u have resource path 
		if(!serviceobject.configuration.viewservice.resourcepath)
			serviceobject.configuration.viewservice.resourcepath = filepath + "/../resources/templates/" + serviceobject.name;
	}
	return serviceobject;
}

Service.prototype.exportConfig = function(callback){
	var instance = this;
	
	var servicedetails = getServiceDetails(instance);
	
	var serviceconfig = _getServiceConfig(servicedetails, instance);
	
	/* Disable if required*/
	if(!serviceconfig.name)
		serviceconfig.name = simpleportal.db.generateId(serviceconfig.title);
	
	if(!serviceconfig.title)
		serviceconfig.title = simpleportalUtil.capitaliseFirstLetter(serviceconfig.name);
	
	if(!serviceconfig.apiurl)
		if(serviceconfig.serviceurl)
			serviceconfig.apiurl = instance.getServiceloader().serviceUrl + '/' + serviceconfig.serviceurl;
		else
			serviceconfig.apiurl = instance.getServiceloader().serviceUrl + '/' + serviceconfig.name;
	
	if(instance.viewservice)
		serviceconfig.viewurl = instance.getViewUrl();
	
	if(!serviceconfig.modelname)
		serviceconfig.modelname = simpleportalUtil.capitaliseFirstLetter(serviceconfig.name);
	/* Disable if required*/
	
	serviceconfig.stats=instance.stats;
	
	if(callback)
		callback(null, serviceconfig);
	else
		return serviceconfig;
}

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
 * To get the object from the http request object based ont he model object, validation data format
 * 
 * @method getObject
 * 
 * @param {} request http request | object from where the object to be retreived
 * 
 * @return object Object which is Formatted and validated
 */
Service.prototype.getObject = function(request, model){
	var instance = this;
	
	if(model)
		return simpleportalUtil.getObject(request, {name:instance.name, model:model, dataformat:instance.dataformat, validation:instance.validation});
	else
		return simpleportalUtil.getObject(request, instance);
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
Service.prototype.getObjectId = function(object, model){
	var instance = this;

	var id = '';
	if(model && object.id)
		id = object.id;
	else if(instance.primaryKeyFields) {
		for(var i in instance.primaryKeyFields){
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
	if(instance.primaryKeyType == 'Number' || instance.primaryKeyType == 'number')
		query[instance.primaryKey]=Number(id);
	else if (instance.primaryKeyType == 'BSONUUID')
		query[instance.primaryKey]=simpleportal.db.getObjectId(id);
	else
		query[instance.primaryKey]=id;
	
	instance.getStorageService().findOne(query, function(error, object) {
		if(error || !object || object == ''){
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
	
	instance.getLogger().debug('Service:start', instance.name + (instance.plugin ? '@' + instance.plugin : '' ));
	
	if(callback)
		callback();
}

/**
 * Function which is called during the Simpleportal server startup
 * 
 * @method startup
 * 
 * @param configuration Service configuration from configuration module
 * @param {callback} callback The callback to excecute when complete
 */
Service.prototype.startup = function(configuration, callback){
	var instance = this;
	instance.getLogger().debug('Service:startup', instance.name + (instance.plugin ? '@' + instance.plugin : '' ));
	
	if(typeof configuration == 'function'){
		callback = configuration;
		configuration = {};
	}	
	
	var startup_callback = function(error, data){
		if(callback)
			callback(error, data);
	};
	
	instance.emit("startup");
	
	if(instance.getConfiguration().hasOwnProperty('callservicestartup')){
		if(instance.getConfiguration('callservicestartup'))
			this.onStartup(instance.getConfiguration(), startup_callback);
		else
			startup_callback();
	}else
		this.onStartup(instance.getConfiguration(),  startup_callback);
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
		callback = configuration;
	}
	instance.getLogger().debug('Service:shutdown', instance.name + (instance.plugin ? '@' + instance.plugin : '' ));
	
	this.onShutdown(instance.getConfiguration(), callback);
}

/**
 * To get the underlying storage service
 * 
 * @method getStorageService
 * 
 * @return The storage service 
 */
Service.prototype.updateTotalRecords = function(){
	var instance =  this;
	
	if(instance.storageService){
		instance.storageService.count({}, function(error, count){
			instance.totalrecords=instance.storageService.totalrecords=instance.totalrecords=count;
		});
	}
}

Service.prototype.getStorageService = function(){
	var instance = this;
	
	if(!instance.storageService) {
		instance.storageService = new StorageService(
			{
				dbid:instance.dbid, 
				collectionName:instance.collection, 
				primaryKey:instance.primaryKey, 
				maxrecords:instance.maxrecords
			}, instance.getServerInstance()
		);
//		
		instance.storageService.getObjectId = (function(instance){
			return function(object){
				return instance.getObjectId(object);
			}
		})(instance);
		
		instance.updateTotalRecords();
//		
//		instance.storageService.count({}, function(error, count){
//			instance.totalrecords=instance.storageService.totalrecords=instance.totalrecords=count;
//		});
//		
		return instance.storageService;
	}else
		return instance.storageService;
}

/**
 * To get the underlying storage service
 * 
 * @method getStorageService
 * 
 * @return The storage service 
 */
Service.prototype.getRemoteService = function(){
	var instance = this;
	
	if(!instance.remoteService){
		return null;
	}else
		return instance.remoteService;
}

var getSubFunction = function(instance, methodName){
	return (function(instance, methodName){
		return function(){
			instance[methodName].apply(instance, arguments);
		}
	})(instance, methodName);
}

/**
 * Initializing function of the service
 * 
 * @method init
 * 
 * @param configuration Service configuration from configuration module
 * @param {callback} callback The callback to excecute when complete
 */
Service.prototype.init = function(serverInstance, callback){
	var instance = this;
	
	if(!serverInstance instanceof simpleportal.Server)
		callback("Not a valid service instance");
	
	instance._serverInstance=serverInstance;
	
	var configuration = serverInstance.getConfiguration();
	
	var serverPreference = serverInstance.getConfiguration("preference");
	if(instance.plugin && serverPreference && serverPreference.plugin && serverPreference.plugin[instance.plugin] && serverPreference.plugin[instance.plugin][instance.name]){
		instance.setPreference(serverPreference.plugin[instance.plugin][instance.name]);
	}
	
	instance.getLogger().debug('Service:init', instance.name + (instance.plugin ? '@' + instance.plugin : '' ));
	
	instance.dbmodeloptions = {};
	
	if(instance.hiddenFields){
		instance.dbmodeloptions.fields={};
		for(field in instance.hiddenFields){
			instance.dbmodeloptions.fields[instance.hiddenFields[field]]=0;
		}
	}
	
	if(instance.defaultsort){
		for(field in instance.defaultsort){
			instance.dbmodeloptions[field] = instance.defaultsort[field];
		}
	}
	
	if(configuration && configuration.services){
		if(configuration.services[instance.name])
			instance.setConfiguration(configuration.services[instance.name]||{});
//			instance._configuration = simpleportalUtil.extendJSON({}, instance._configuration, configuration.services[instance.name]||{});
	} /*else if(configuration&&configuration[instance.name]){
		instance.configuration=simpleportalUtil.extendJSON(instance.configuration, configuration[instance.name]);
		//instance.configuration = configuration[instance.name];
	}	*/
	
	// let us check for preference with in server and if any prerence is available inject it in to the api.
	
	// check for oauth props and if not available set the system oauth provider
	if(instance.getConfiguration() && instance.getConfiguration("oauthprovider") && (!configuration || !configuration.oauth || !configuration.oauth[instance.getConfiguration("oauthprovider")])){
		instance.getLogger().warn('Service Wrapper', 'Service ['  + instance.name + '] need oauth configuration [' + instance.getConfiguration("oauthprovider") + '], please check your configuration or service!');
	} else if(instance.getConfiguration("oauth")){
		if(configuration.oauth && configuration.oauth.use){
			instance.setConfiguration("oauthprovider", configuration.oauth.use);	
		}else
			instance.getLogger().warn('Service Wrapper', 'Service ['  + instance.name + '] need oauth configuration, please check your configuration or service!');
	}
	/*
	if(instance.configuration.modelsettings){
		simpleportalUtil.extendJSON(instance.modelsettings, instance.configuration.modelsettings);
	}*/
	
	// do update validation from configuration
	if(instance.getConfiguration("modelsettings")){
		var modelsettings_ = instance.getConfiguration("modelsettings");
		
		for(var field in modelsettings_){
			
			if(typeof modelsettings_[field] == "object" && modelsettings_[field].validation){
				instance.validation[field] = modelsettings_[field].validation;
				
				// if configuration has validation object set it to the configuration
				instance._configuration.validation[field] = instance.validation[field];
			}
		}
	}
	
	// set the modelservice configuration
	if(instance.remoteservice){
		var remoteconfig = simpleportalUtil.copyJSON(
			instance.getConfiguration("remoteservice", {}),
			["host", "port", "oauth", "oauthprovider", "skiplogin", "secure", "search", "details", "path"],
			instance.getConfiguration()
		);
		
		// copy remote service configuration
		instance.setConfiguration('remoteservice', remoteconfig);
		
		if(!instance.getConfiguration("remoteservice").path || instance.getConfiguration("remoteservice").path == "")
			instance.getConfiguration("remoteservice").path = instance.getConfiguration("search") ? instance.getConfiguration("search").path : '';
	}
	
	if(instance.viewservice){
		var filepath = instance.servicepath.substr(0, instance.servicepath.lastIndexOf("/"));
		
		// copy remote service configuration
		instance.setConfiguration('viewservice', simpleportalUtil.extendJSON(
			{
				searchresult:{
					primaryDisplay:instance.primaryKey,
				},
				search:"searchresult",
				details:"details",
				form:"searchform"
			},  instance.getConfiguration("viewservice")||{})
		);

		// check u have resource path 
		if(!instance.getConfiguration("viewservice").resourcepath)
			instance.getConfiguration("viewservice").resourcepath = filepath + "/../resources/templates/" + instance.name;
	}
	
	if(dbInstance)
    	instance.dbInstance = dbInstance;
    
    if(instance.collection){
    	var dbInstance = instance.dbInstance||simpleportal.db.getInstance();
    	
    	try{
            instance.service = instance.service||{};

        	if(instance.dbid && instance.collection) {
        		instance.storageService = instance.getStorageService();
        		
            	instance.rService = new RService(instance, {dbid:instance.dbid, collectionName:instance.collection});
            	
            	//@TODO
            	if(instance.restservice)
            		updateLocalRESTServiceMethods(instance, "/");
//            	updateLocalRESTServiceMethods(instance, "cudService", "/");
        	}
            
    	} catch(error){
    		console.error(error);
    		console.trace(error);
    	}
    	
    	if(instance.remoteservice){
    		instance.getLogger().debug('Service:init', 'Remote service - '+ instance.name + (instance.plugin ? '@' + instance.plugin :''));
			
			instance.remoteService = new RemoteService(instance);
//			updateRemoteServicemethods(instance, "/");
			
			instance.localcache = instance.localcache||instance.modify;
			updateRemoteRESTServiceMethods(instance, instance.localcache ? "/remote/" : "/")
			
			updateRemoteRESTServiceEvents(instance);
			
			if(!instance.getConfiguration() || Object.keys(instance.getConfiguration()).length === 0) {
				instance.warnings=instance.servicewarnings||[];
				instance.warnings.push("Remote configuration is missing");
				
				instance.getLogger().warn('Service Wrapper', 'Service ['  + instance.name + '] need remote service configuration please update configuration or Service!');
			}
    	}
	} else if(instance.remoteservice){
		instance.getLogger().debug('Service:init', 'Remote service - '+ instance.name + (instance.plugin ? '@' + instance.plugin :''));
		
		instance.service = instance.service||{};
		
		instance.remoteService = new RemoteService(instance);
		
		if(!instance.getConfiguration() || Object.keys(instance.getConfiguration()).length === 0){
			instance.warnings=instance.servicewarnings||[];
			instance.warnings.push("Remote configuration is missing");
			
			instance.getLogger().warn('Service:init', 'Service ['  + instance.name + '] need remote service configuration please update configuration or Service!');
		}
		
		updateRemoteRESTServiceMethods(instance, "/")
	} else{
		instance.getLogger().warn('Service:init', 'No specific configuration for - ' + instance.name);
	}

    // if view service register the view events
    if(instance.viewservice){
    	instance.getServiceConfig();
    	
    	updateViewServiceMethods(instance, instance.restservice ? "/view/" : "/")
    }
    
    if(instance.getConfiguration("admin")){
    	instance.getPluginloader().addPluginService("sp-admin", instance);
    }
    
    instance.emit("init");
    
    if(callback)
    	callback();
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
 * To export the data in to a specified format mentioned
 * 	(uses request query datatype field : csv|json is supported right now)
 * @param data data t be exported
 * @param fields fields to be included inside the export
 * @param request Http request of the client request
 * @param response http response of the client 
 */
Service.prototype.exportData = function(data, fields, request, response){
	var datatype = 'json';
	if(request && request.query && request.query.datatype)
		datatype = request.query.datatype;
	
	if(datatype == 'csv')
		this.sendcsv_(data, fields, request, response);
	else if(typeof response == 'object')
		response.send(200, {'content-type':'application/json; charset=utf8'}, JSON.stringify(data));
}

Service.prototype.exportToFile = function(options, disableNotification, callback) {
	var self = this;
	
	if(typeof options == 'function'){
		callback = options;
		
		disableNotification= false;
	}else if(typeof disableNotification == 'function'){
		callback = disableNotification;
		disableNotification = false;
	}
	
	if(!options)
		options = {};
	
	if(options && !options.datatype)
		options.datatype = 'csv';
	
	var backupath = self.getServiceloader().getBackupPath(self, 'export');
	
	var searchoptions;
	self.search({}, function(error, data){
		var dataresult = data;
		if(data && data.results)
			dataresult=data.results;
		
		simpleportal.util.checkDirSync(backupath);
		var exportFile = simpleportal.util.getServerPath(backupath + "/" + self.name + "." + options.datatype);
		
//		self.exportData(dataresult, self.exportfields, {query:options}, simpleportal.util.getServerPath(backupath + "/" + self.name + "." + options.datatype));
		self.sendcsv_(dataresult, self.exportfields, {query:options}, function(error, csvdata){
			var file = fs.createWriteStream(exportFile);
			file.write(csvdata);
			
			var fileinfo = {servicemodel:{file:self.name+'.' + options.datatype, fullpath:exportFile}};
			self.emit("export."+ options.datatype, fileinfo)
			self.getServiceloader().emit("service.export."+options.datatype, fileinfo);
			
			if(callback)
				callback(null, fileinfo);
		});
	}, self.dbmodeloptions, searchoptions);
}

/**
 * To export the data in to a file or folder including the service configuration and other details
 * 
 * @param options - parameters required for creating the backup file 
 * @param callback callback function after the function 
 */
Service.prototype.backup = function(options, response, callback){
	var serviceInstance = this;
	
	if(typeof response == "function" && !callback)
		callback = response;
	
	// need to find the mongo db dump tool from the system property
	var dboptions = simpleportalUtil.extendJSON({
		dumpfile : serviceInstance.name + '.tar.gz',
		dumptool : 'mongodump' 
	}, options);
	
	if(options.backupath){
		dboptions.dumpdir = options.backupath;
	}
	
	if(!serviceInstance.collection){
		var dumpdir = simpleportalUtil.getServerPath(dboptions.dumpdir||'./dump');
		var dumpservicedir = dumpdir + "/" + serviceInstance.name;
		
		var dumpfile = dboptions.dumpfile;
		
		simpleportalUtil.checkDirSync(dumpservicedir);
		
		var stream = fs.createWriteStream(dumpservicedir + '/README.txt');
		stream.once('open', function(fd) {
			stream.end('/**\n*\n*\nCopyrighted by Simpleportaljs, automatically created simpleportal apiservice, Misusing of this file may invite legal actions!!\n*\n*\n**/');
			
			var result={};
			simpleportalUtil.archiveFolder({
				rootdir:dumpservicedir, 
				archive:dumpservicedir + '.tar.gz', 
				deleteFolder:true
			}, function(error, stdout, stderr){
				if(error){
					serviceInstance.getLogger().debug('Service:init '+ serviceInstance.name, stdout);
					serviceInstance.getLogger().debug('Service:init '+ serviceInstance.name, stderr);
					serviceInstance.getLogger().error('Service:init '+ serviceInstance.name, error);
				}
				result.zip_archive = {stdout : stdout, stderr:stderr, file:dumpfile, fullpath:dumpservicedir + '.tar.gz'}

				simpleportalUtil.addFileToArchive(dumpservicedir + '.tar.gz', serviceInstance.servicefile, function(sierror, stdout, stderr){
					if(!options || !options.disableNotification){
						serviceInstance.emit('backup', {service:serviceInstance.name, error:error, servicemodel:result});
					}
					
					if(callback){
						callback(error, result);
					} else
						return;
				});
			});
		});
	} else {
		dboptions.collection=serviceInstance.collection;
		
		var _dboptions = simpleportalUtil.extendJSON({}, serviceInstance.getServerInstance().getRouter("dbpool").getConfigurations("default"), dboptions);
		
		// Taking backup and callback mentioned
		simpleportal.db.backup(_dboptions, function(error, dbbackupinfo){
			if(!error){
				if(!options.excludeService){
					// let us copy the service file into the dump folder
					serviceInstance.getLogger().debug('Service:init '+ serviceInstance.name, "Including service file in to backup -" + serviceInstance.servicefile);
					simpleportalUtil.addFileToArchive(dbbackupinfo.zip_archive.fullpath, serviceInstance.servicefile, function(sierror, stdout, stderr){
						if(error){
							serviceInstance.getLogger().debug('Service:init '+ serviceInstance.name, stdout);
							serviceInstance.getLogger().debug('Service:init '+ serviceInstance.name, stderr);
							serviceInstance.getLogger().error('Service:init '+ serviceInstance.name, error);
						}
						
						var _cbresult = {service:serviceInstance.name, error:error, servicemodel:dbbackupinfo};
						if(!options || !options.disableNotification){
							
							serviceInstance.emit('backup', _cbresult);
						}
						
						if(callback){
							callback(error, _cbresult);
						} else
							return;
					});
				} else if(!options || !options.disableNotification){
					var _cbresult = {service:serviceInstance.name, error:error, servicemodel:dbbackupinfo};
					
					serviceInstance.emit('backup', _cbresult);
					
					if(callback){
						callback(error, _cbresult);
					} else
						return;
				} else if(callback)
					callback();
				else
					return;
			}else if(callback){
				callback(error);
			} else
				return;
//			callback(error, dbbackupinfo);
		});
	}
};

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
			if(simpleportalUtil.arraycontains(instance.auditfields, field))
				continue;
			
			fields.push(field);
//			fields_.push(field)
			fields_.push('"' + field + '"')
		}
	}else
		for(var i in fields){
			var field = fields[i];
			if(field == '_id'||field == 'created_at')
				continue;
			if(simpleportalUtil.arraycontains(instance.auditfields, field))
				continue;
			
			if(field.indexOf('.') != -1){
//				fields_.push(field.split('.')[0]);
				fields_.push('"' + field.split('.')[0] + '"');
			}else 
//				fields_.push(field);
				fields_.push('"' + field + '"')
		}
	
	result.push(fields_.join(','));
	
	data.forEach(function(obj){
		var obj_ = new Array();
		for(var i in fields){
			var field = fields[i];
			var value;
			
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
			
//			if(value.indexOf(',') != -1)
			value = '"'+value + '"';
//			if(value.indexOf(',') != -1)
//				value = value
			
			obj_.push(value);
		}
		
		result.push(obj_.join(','))
	});
	
	var headers = {'content-type':'text/csv; charset=utf8'};
		headers['Content-disposition'] = 'attachment; filename=' + instance.name + '.csv';
	
	if(request && request.body && request.body.filename )
		headers['Content-disposition'] = 'attachment; filename=' +  instance.name + "-" + (request.body.filename) + '.csv';
		
	if(typeof response == 'string'){
		 var file = fs.createWriteStream(response);
         
         file.write(result.join('\n'));
	} else if(typeof response == "function"){
		response(null, result.join('\n'));
	} else
		response.send(200, headers, result.join('\n'));
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
	// check if it is /searchform || /form then we will call search form using userprofile!!

	if(request.viewservice
		&& path == "GET /:id" 
		&& instance.options 
		&& instance.options.servicetemplates 
		&& instance.options.servicetemplates[request.pathGroup]){
		path = "GET /view/" + request.pathGroup;
	}
	
	var caller = instance.service[path];
	if(!caller)
		callback('no-such-method');
	else{
		if(typeof caller == 'string')
			caller = instance.service[caller];
		
		if(caller){
			caller(request, response, callback);
		}else
			callback('no-such-method');
	}
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
	
	// let us add view api as well
//	if(instance.viewservice)
//		instance.register('/view' + path, callback, 'GET');
	
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
	
	instance.service[path] = (function(serviceprecallback) {
		return function(request, response, callback) {
			if(request.url && request.url.indexOf("/view/") >= 0)
				request.viewservice=true;
			
			instance.servicepre(request, response, serviceprecallback, callback);
		};
	})(servicecallback);
}

/**
 * 
 */
Service.prototype.hasPermission = function(request, response){
	var instance = this;
	
	var userprofile = request.getUserprofile();
	
	if((userprofile && userprofile.role && userprofile.role=='superadmin')
	||
	(
		userprofile && userprofile.roles && 		
		(
			simpleportalUtil.arraycontains(userprofile.roles, instance.userrole)
		)
	)
	||
	(
		userprofile && userprofile.role && 		
		(
			simpleportalUtil.arraycontains(instance.userrole, [ userprofile.role ])
		)
	))
		return true;
	else
		return false;
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
	
	//check whether the service is locked
	if(instance.status == "locked"){
		callback('API Service - "'+ instance.name +'" is locked');
		
	} else if(request.skipfilter)
		servicecallback(request, response, callback);
	else if(instance.permissionCheck){
		instance.permissionCheck(request, null, request.user, function(error){
			if(error)
				callback(error);
			else
				servicecallback(request, response, callback);
		});
	} else if(instance.userrole && !request.skipfilter){
		var userprofile = request.getUserprofile();
		if((userprofile && userprofile.role && userprofile.role=='superadmin')
		||
		(
			userprofile && userprofile.roles && 		
			(
				simpleportalUtil.arraycontains(userprofile.roles, instance.userrole)
			)
		)
		||
		(
			userprofile && userprofile.role && 		
			(
				simpleportalUtil.arraycontains(instance.userrole, [ userprofile.role ])
			)
		))
			servicecallback(request, response, callback);
		else
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
 * To form the search parameters from the search object for search api
 * 
 * @method getSearchQuery
 * 
 * @param {} query exisiting search query
 * @param {} request http request
 * @return queryparams
 * 
 * @private
 */
Service.prototype.getSearchQuery = function(query, request){
	var instance = this;
		
	var params = simpleportalUtil.extendJSON({}, instance._searchqueryparams, instance.searchqueryparams);
	var modelfields = Object.keys(instance.model);
	for(var i in modelfields)
		if(!params[modelfields[i]])
			params[modelfields[i]]=modelfields[i];
	
	if(instance.getConfiguration() && instance.getConfiguration("search") && instance.getConfiguration("search").queryparams)
		params = simpleportalUtil.extendJSON(params, instance.getConfiguration("search").queryparams);
	
	simpleportalUtil.extendJSON(request.body, request.query);
	
	var object = instance.getObject(request);
	request.searchqueryparams = params;
	
	var searchquery = simpleportal.db.getSearchQuery(query, instance, request);
	
	return searchquery;
}

/*Service required for scheduler and invoking the methods using the function props*/
/**
 * @Method("invoke");
 * @modelaction(true);
 * @schedulable(true);
 * @url("invoke");
 */
Service.prototype.invoke = function(serviceaction, callback){
	var instance =  this;
	
	instance.getServiceloader().invoke(instance.name, serviceaction, function(error, data){
		if(error)
			console.error(error);
		
		if(callback && typeof callback == "function")
			callback(error, data);
	});
}

/**
 * To run a function w
 */
Service.prototype.run = function(servicemodelid, callback){
	if(servicemodelid)
		serviceeventService.invoke(serviceeventid, callback);
	else if(callback)
		callback("Not a avalid model id")
};

Service.prototype.serviceCallback =function(callback, premethod, event, request, response){
	var instance = this;
	
	return restServiceCallback(instance, callback, premethod, event, request, response)	
}

function searchResultCallback(serviceInstane, error, data, callback){
	if(typeof data === "object" && typeof data.length == 'number'){
		callback(error, {
			info:{
				count:data.length,
				datadisplay:serviceInstane.datadisplay,
				datakey:serviceInstane.primaryKey
			},
			results:data
		});
	}else if(typeof data === "object" && typeof data.length !== 'number'){
		data.info.datadisplay = serviceInstane.datadisplay||serviceInstane.primaryKey,
		data.info.datakey = serviceInstane.primaryKey;
	
		callback(error, data);
	}
}

/**
 * Callback function for dynamic cmd function for mongodb based api
 * 
 * @param instance
 * @param command
 * @returns {Function}
 */
function dbCMDServiceCallback(instance, command){
	return function(request, response, callback) {
		var options = instance.dbmodeloptions;
		
		if(request.dbid)
			options.dbid = request.dbid;
		
		if(simpleportalUtil.arraycontains(['distinct', 'count', 'aggregate'], command)){
			if(request.query.field)
    			instance.rService[command](instance.getSearchQuery({field:request.query.field}, request), callback, options);
			else
				instance.rService[command](instance.getSearchQuery({}, request), function(error, count){
        			callback(error, {count:count||0});
        		}, options);
		}else
			callback("Not a valid command - " + command)
    };
}

function restServiceCallback(instance, callback, premethod, event, datasource, datadestination){
	if(typeof event == 'object' && !datasource){
		datasource = event;
		event = null;
	}
	
	return (function(serviceInstance, actualcallback, premethod, event, datasource, datadestination){
		return function(error, data){
    		/**
    		 * Trigger event upon callback 
    		 * @TODO different callback if error present
    		 */
			if(event||premethod)
				serviceInstance.emit(event||premethod, {service:serviceInstance.name, error:error, servicemodel:data});
    		
			//now check it has viewservice enabled
			var servicetemplate = (event||premethod) || datasource.servicetemplate;
			
			if(serviceInstance.viewservice && datasource.viewservice && serviceInstance.servicetemplates[servicetemplate]) {
				var viewoptions = simpleportalUtil.extendJSON({}, serviceInstance.getConfiguration('viewservice'));

				viewoptions.resource = serviceInstance.servicetemplates[servicetemplate];

				if(datasource && datasource.servicetemplate)
					viewoptions.resource = datasource.servicetemplate;
				
				viewoptions.apiservice = serviceInstance.name;
				
				if(datasource && datasource.serviceconfig)
					viewoptions.serviceconfig = datasource.serviceconfig;
				
				// sorry we might need to change the resourcepath if webappsetting is 
				if(datasource.webappsetting && datasource.webappsetting.resourcepath){
					if(datasource.viewtemplatedir)
						viewoptions.resourcepath = simpleportalUtil.appendFilePath(datasource.webappsetting.resourcepath, datasource.viewtemplatedir, serviceInstance.name);
					else
						viewoptions.resourcepath = simpleportalUtil.appendFilePath(datasource.webappsetting.resourcepath, serviceInstance.name);
				} else if(datasource.viewtemplatedir && viewoptions.resourcepath && viewoptions.resourcepath.indexOf("/templates/" + serviceInstance.name) != -1){
					viewoptions.resourcepath = viewoptions.resourcepath.replace("/templates/" + serviceInstance.name, "/templates/" + datasource.viewtemplatedir + "/" + serviceInstance.name)
				}
				if(datasource.headers && datasource.headers.referer && datasource.headers.referer.indexOf("/mobile" != -1)) {
					// if it is mobile use resource path from mobile template not from default template
//					if(viewoptions.resourcepath && viewoptions.resourcepath.indexOf("/templates/mobile") == -1)
//						viewoptions.resourcepath  = viewoptions.resourcepath.replace("/templates/", "/templates/jquerymobile/");
					
					if(datasource && !datasource.hasOwnProperty("mobile"))
						viewoptions.mobile = true;
				}
				
				if(premethod && serviceInstance[premethod] && typeof serviceInstance[premethod] == "function"){
					serviceInstance[premethod](error, data, function(error, data){
						viewServiceSearchCallback(serviceInstance, viewoptions, error, data, datasource, datadestination);
					}, datasource);
	    		}else{
	    			viewServiceSearchCallback(serviceInstance, viewoptions, error, data, datasource, datadestination);
	    		}
			}else{
				if(premethod && serviceInstance[premethod] && typeof serviceInstance[premethod] == "function"){
					serviceInstance[premethod](error, data, actualcallback, datasource, datadestination);
	    		}else{
	    			actualcallback(error, data);
	    		}
			}
		};
	})(instance, callback, premethod, event, datasource, datadestination);
}


//var settingService = function(instance, arguments){
//	instance.exportConfig(
//		restServiceCallback(instance, callback, simpleportal.Constants.ServiceEvents.SETTINGS, simpleportal.Constants.ServiceEvents.SETTINGS, request, response)
//	);
//};

/**
 * To update the general methods for the service
 * 
 * @param instance
 * @param subService
 * @param serviceprefix
 */
function updateGeneralMethods(instance, subService, serviceprefix){
	// let us check u have fields which contains sub object and sub array
	var servicesetting = instance.getServiceConfig();
	servicesetting.modelfields
		.filter(function(model){
			return model.dataType == "object"
		})
		.forEach(function(model){
			instance.get('/setting/:subtype', function(request, response, callback) {
				var error,
					servicesetting = instance.getServiceConfig(),
					modelfield = simpleportalUtil.getJSONObject(servicesetting.modelfields, "field", request.pathGroup);
				
				if(modelfield && modelfield.fieldsetting && modelfield.fieldsetting.model){
					modelfield.fieldsetting.modelfields = TemplateUtils.getFieldFromObject(modelfield.fieldsetting.model, '');
				}
				
				modelfield.name=instance.name;
				modelfield.configuration=modelfield.fieldsetting;
				
				delete modelfield.fieldsetting;
				
				restServiceCallback(instance, callback, simpleportal.Constants.ServiceEvents.SETTINGS, simpleportal.Constants.ServiceEvents.SETTINGS, request, response)(error, modelfield);
    	    });
		});
	
	
    if(!instance.service['GET /setting'])
    	instance.get('/setting', function(request, response, callback) {
    		instance.exportConfig(
				restServiceCallback(instance, callback, simpleportal.Constants.ServiceEvents.SETTINGS, simpleportal.Constants.ServiceEvents.SETTINGS, request, response)
			)
	    });
    
	// SET DEFAULT STATUS URI
	if(!instance.service['GET /status'])
        instance.get('/status', function(request, response, callback) {
        	var statuslist = [];
        	var statusfields = Object.keys(instance.statuslist);
        	
        	for(var index in statusfields){
        		statuslist.push({id:statusfields[index], display:instance.statuslist[statusfields[index]]});
        	}
        	
        	callback(null, statuslist);
        });
	
	// SET DEFAULT Events URI
	if(!instance.service['GET /events'])
        instance.get('/events', function(request, response, callback) {
        	var eventlist = [];
        	if(instance.eventlist && instance.eventlist.length > 0)
        		eventlist = eventlist.concat(instance.eventlist);
        	
        	var eventfields = Object.keys(simpleportal.Constants.ServiceEvents);
        	
        	for(var index in eventfields){
        		eventlist.push({id:simpleportal.Constants.ServiceEvents[eventfields[index]], display:simpleportal.Constants.ServiceEvents[eventfields[index]]});
        	}
        	
        	callback(null, {info:{count:eventlist.length}, results:eventlist});
        });
	
	// SET DEFAULT METHODS
	if(!instance.service['GET /methods'])
        instance.get('/methods', function(request, response, callback) {
        	var methodlist = [];
        		
        	if(instance.schedulablemethods && instance.schedulablemethods.length > 0)
        		methodlist = methodlist.concat(instance.schedulablemethods);
        	
        	for(var i in instance.service){
        		if(i.indexOf("GET") == 0){
        			var methoduri = i.trim();
        			
        			methodlist.push({id:methoduri, display:methoduri});
        		}
        	}
        	
        	callback(null, methodlist);
        });
}

/**
 * Update the Retreival methods
 * @param instance
 * @param subService
 * @param serviceprefix
 */
function updateRSMethod(instance, subService, serviceprefix){
	if(!instance.service['GET /']){
    	instance.get('GET /', function(request, response, callback) {
    		var options = instance.dbmodeloptions;
    		if(request.dbid)
    			options.dbid = request.dbid;
    		
    		// check that there is some field called limit 
    		var searchoptions;
    		if(request.query && request.query.limit)
    			searchoptions = {limit:Number(request.query.limit)};
    		
    		if(request.query && request.query.skip){
    			searchoptions = searchoptions||{};
    			searchoptions.skip=Number(request.query.skip);
    		}
    		
    		instance.rService.search(instance.getSearchQuery({}, request), restServiceCallback(instance, callback, simpleportal.Constants.ServiceEvents.AFTER_SEARCH, simpleportal.Constants.ServiceEvents.AFTER_SEARCH, request, response), options, searchoptions);
	    });
    }
    
    if(!instance.service['GET /$cmd/count'])
    	instance.get('/$cmd/count', dbCMDServiceCallback(instance, 'count'));
    
    if(!instance.service['GET /$cmd/distinct'])
    	instance.get('/$cmd/distinct', dbCMDServiceCallback(instance, 'distinct'));
    
    if(!instance.service['GET /$cmd/aggregate'])
    	instance.get('/$cmd/aggregate', dbCMDServiceCallback(instance, 'aggregate'));
    
    if(!instance.service['GET /search'])
    	instance.get('/search', function(request, response, callback) {
        	var options = {};
    		if(request.dbid)
    			options.dbid = request.dbid;
			
    		// check that there is some field called limit 
    		var searchoptions;
    		if(request.query && request.query.limit)
    			searchoptions = {limit:Number(request.query.limit)};
    		else if(request.query && request.query.page_limit)
    			searchoptions = {limit:Number(request.query.page_limit)};
    		
    		if(request.query && request.query.skip){
    			searchoptions = searchoptions||{};
    			searchoptions.skip=Number(request.query.skip);
    		} else if(searchoptions && searchoptions.limit && request.query.page){
    			searchoptions.skip = searchoptions.limit*(request.query.page-1);
    		}
    		
    		instance.rService.search(instance.getSearchQuery({}, request), restServiceCallback(instance, callback, simpleportal.Constants.ServiceEvents.AFTER_SEARCH, simpleportal.Constants.ServiceEvents.AFTER_SEARCH, request, response), options, searchoptions);
        });
    
    if(!instance.service['GET /count'])
    	instance.get('/count', function(request, response, callback) {
    		var options = instance.dbmodeloptions;
    		if(request.dbid)
    			options.dbid = request.dbid;
    		
    		instance.rService.count({}, function(error, count){
    			callback(error, {count:count||0});
    		}, options);
	    });
	    
    if(!instance.service['GET /export'])
    	instance.get('/export', function(request, response, exportCallback) {
    		var options = simpleportalUtil.extendJSON({}, instance.dbmodeloptions);
        	if(request.dbid)
    			options.dbid = request.dbid;
    		
    		// check that there is some field called limit 
    		var searchoptions;
    		if(request.query && request.query.limit){
    			if(request.query.limit != "none")
    				searchoptions = {limit:Number(request.query.limit)};
    		}
    		if(request.query && request.query.skip){
    			searchoptions = searchoptions||{};
    			searchoptions.skip=Number(request.query.skip);
    		}
    		
    		var searchquery = instance.getSearchQuery({}, request);
    		
    		if((!searchquery || Object.keys(searchquery).length == 0) 
    			&& (!searchoptions || Object.keys(searchoptions).length == 0)){
    			instance.exportToFile(function(error, exportinfo){
    				if(exportinfo){
    					var headers = {'content-type':'text/csv; charset=utf8'};
    						headers['Content-disposition'] = 'attachment; filename=' + exportinfo.servicemodel.file;
    					
    					if(request && request.body && request.body.filename )
    						headers['Content-disposition'] = 'attachment; filename=' +  exportinfo.servicemodel.file;
    					
    					var stat = fs.statSync(exportinfo.servicemodel.fullpath);
					    response.writeHead(200, {
					        'Content-Type': simpleportal.util.getMimeType(exportinfo.servicemodel.file),
					        'Content-Length': stat.size
					    });

					    var readStream = fs.createReadStream(exportinfo.servicemodel.fullpath);
					    // We replaced all the event handlers with a simple call to readStream.pipe()
					    readStream.pipe(response);
//    					response.send(200, headers, result.join('\n'));
    				} else
    					response.send('');
    			});
    		}else
	    		instance.rService.search(searchquery, function(error, data){
	    			var dataresult = data;
	    			if(data && data.results)
	    				dataresult=data.results;
	    			
		    		instance.exportData(dataresult, instance.exportfields, request, response);
		    	}, options, searchoptions);
	    });
    	
    if(!instance.service['GET /:id'])
    	instance.get('/:id', function(request, response, callback) {
    		var options = simpleportalUtil.extendJSON({}, instance.dbmodeloptions);
        	
        	options.details = 'true';
    		if(request.dbid)
    			options.dbid = request.dbid;
    		
    		var o_id = unescape(request.pathGroup);
    		
    		var queryParamvalues = simpleportalUtil.getParamValues(request)
    		if(queryParamvalues.fields){
    			if(!options.fields)options.fields=options.fields;// =simpleportalUtil.extendJSON({fields:{}}, options);
    			for(var field in queryParamvalues.fields){
    				if(instance.model[field])
    					options.fields[field]=Number(queryParamvalues.fields[field]);
    			}
    		}
    		instance.rService.details(o_id, restServiceCallback(instance, callback, simpleportal.Constants.ServiceEvents.AFTER_DETAILS, simpleportal.Constants.ServiceEvents.AFTER_DETAILS, request, response), options);
	    });
    
    if(!instance.service['GET /:id/next'])
    	instance.get('/:id/next', function(request, response, callback) {
        	var options = simpleportalUtil.extendJSON({}, instance.dbmodeloptions);
        	
        	options.details = 'true';
        	options.next = true;
    		if(request.dbid)
    			options.dbid = request.dbid;
    		
    		var o_id = unescape(request.pathGroup);
    		
    		var queryParamvalues = simpleportalUtil.getParamValues(request)
    		if(queryParamvalues.fields){
    			if(!options.fields)options.fields=options.fields;// =simpleportalUtil.extendJSON({fields:{}}, options);
    			for(var field in queryParamvalues.fields){
    				if(instance.model[field])
    					options.fields[field]=Number(queryParamvalues.fields[field]);
    			}
    		}
    		instance.rService.details(o_id, restServiceCallback(instance, callback, simpleportal.Constants.ServiceEvents.AFTER_DETAILS, simpleportal.Constants.ServiceEvents.AFTER_DETAILS, request, response), options);
	    });
}

/**
 * Update the Create, Update, Remove method
 * @param instance
 * @param subService
 * @param serviceprefix
 */
function updateCUDSMethod(instance, subService, serviceprefix){
	if(!instance.service['POST /'])
		instance.post('/', function(request, response, callback) {
    		var options = {};
    		if(request.dbid)
    			options.dbid = request.dbid;
    		
    		instance.cudService.add(request, response, restServiceCallback(instance, callback, simpleportal.Constants.ServiceEvents.AFTER_UPDATE, simpleportal.Constants.ServiceEvents.AFTER_ADD, request, response), options);
        });
    
	if(!instance.service['PUT /:id'])
		instance.put('/:id', function(request, response, callback) {
			
			var options = instance.dbmodeloptions;
    		if(request.dbid)
    			options.dbid = request.dbid;
    		
        	instance.cudService.update(request, response, restServiceCallback(instance, callback, simpleportal.Constants.ServiceEvents.AFTER_UPDATE, simpleportal.Constants.ServiceEvents.AFTER_UPDATE, request, response), options);
        });
    
	if(!instance.service['DELETE /:id'])
        instance.remove('/:id', function(request, response, callback) {
        	var options = {};
    		if(request.dbid)
    			options.dbid = request.dbid;
    		
        	instance.cudService.remove(request, response, restServiceCallback(instance, callback, simpleportal.Constants.ServiceEvents.AFTER_DELETE, simpleportal.Constants.ServiceEvents.AFTER_DELETE, request, response), options);
        });
}

/**
 * Function to update the rest service with the relevent methods for adding / updating /searching/delete
 * @TODO merge this method with the updateRESTServiceMethods method
 */
function updateLocalRESTServiceMethods(instance, serviceprefix){
	updateRSMethod(instance, serviceprefix);
    
    if(instance.modify){
    	if(instance.dbid && instance.collection){
    		instance.cudService = new CUDService(instance, {dbid:instance.dbid, collectionName:instance.collection});
    		
    		updateCUDSMethod(instance, serviceprefix);
    	}
    }
    
    //@TODO
    updateGeneralMethods(instance, serviceprefix);
}

function updateRemoteRESTServiceEvents(instance){
	if(instance.localcache /*&& instance.remoteService&& instance.storageService*/){
		instance.on(simpleportal.Constants.ServiceEvents.AFTER_SEARCH, function(data){
			var searchresult = [];
			if(data && data.servicemodel && data.servicemodel && typeof data.servicemodel.length == 'number')
				searchresult = data.servicemodel;
			else if(data && data.servicemodel && data.servicemodel.result)
				searchresult = data.servicemodel.result;
			
			if(searchresult){
				if(false){
					instance.getStorageService().save(searchresult, function(error, data){
						if(error)
							console.error(error);
					});	
				}else
					for(var i in searchresult){
						// set the id 
						var id = instance.getObjectId(searchresult[i]);
						if(!searchresult[i].id && instance)
							searchresult[i].id = instance.getObjectId(searchresult[i]);
						
						instance.getStorageService().add_update({id:id}, searchresult[i], function(error, data){
							if(error)
								console.error(error);
						});
					}
			}
		});
		
		instance.on(simpleportal.Constants.ServiceEvents.AFTER_DETAILS, function(data){
			if(data && data.data){
				instance.getStorageService().save(data.data, function(error, data){
					if(error)
						console.error(error);
				});
			}
		});
	}
}

function viewServiceSearchCallback(instance, viewoptions, error, result, request, response){
	var viewoptions = simpleportalUtil.extendJSON({}, {
		exception:error,
		data:{
			serverconfig:instance.getServerInstance().getConfiguration(),
			serviceconfig:viewoptions.serviceconfig||instance.getServiceConfig(),
			webappsetting:request.webappsetting||{},
			userprofile:request.getUserprofile(),
			pagination:request.query.pagination=='true',
			result:[], info:{count:0, start:0, end:0, pagination:false}	
		}
	}, viewoptions);
	
//	if(viewoptions.resourcepath && request.viewtemplatedir)
//		viewoptions.resourcepath = simpleportalUtil.appendFilePath(viewoptions.resourcepath, request.viewtemplatedir);
	
	if(!viewoptions.file)
		viewoptions.file = simpleportalUtil.appendFilePath(viewoptions.resourcepath, viewoptions.resource + '.ejs');
	
	/*
	if(!error && result && result.result && result.result.length == 1){
		viewoptions.data = simpleportalUtil.extendJSON(viewoptions.data, result[0]);
		
		new simpleportal.Template(viewoptions).render(response);
	}else{*/

	if(result && typeof result.length == "number")
		viewoptions.data = simpleportalUtil.extendJSON({}, viewoptions.data, {info:{count:result.length}, result:result});
	else
		viewoptions.data = simpleportalUtil.extendJSON({}, viewoptions.data, result);
	
	if(!viewoptions.data.result || viewoptions.data.result.length == 0){
		viewoptions.data.result = viewoptions.data.results || [];
	}
	
	if(request.plugin && request.webappsetting){
		delete request.plugin;
		delete request.webappsetting;
	}
	
	if(request.url && request.url.indexOf(".") != -1 && simpleportalUtil.getMimeType(request.url))
		response.setHeader('Content-Type', simpleportalUtil.getMimeType(request.url));
	
//	new simpleportal.Template(viewoptions).render(response);
	
	viewoptions.data.filename = "autogeneratedfile"; 
	
	viewoptions.systemincludes = [];
	//@TODO should be handled in a better way
//	if(simpleportal.pluginloader){
	viewoptions.systemincludes.push(instance.getPluginloader().templatedir + '/../apiservice/internationalization.ejs');
	viewoptions.systemincludes.push(instance.getPluginloader().templatedir + '/webapp/templates/html5/templates/system/fieldtemplates.ejs');
//	}
	// need to include the uri mappings as well
//	viewoptions.systemincludes.push(instance.getPluginloader().templatedir + '/webapp/templates/html5/templates/system/urimapping.ejs');
	//viewoptions.exceptionfile = viewoptions.resourcepath + "/../" + "exception.ejs";
	viewoptions.exceptionfile = instance.getServerInstance().getServerCorePath("resources/templates/apiservice/exception.ejs");//__dirname + "/../../server/resources/templates/apiservice/exception.ejs";
	
	//@TODO should be handled in a better way
	viewoptions.filelookups = [
	     simpleportalUtil.appendFilePath(instance.servicepath.substring(0, instance.servicepath.lastIndexOf("/")), '../resources/templates', instance.name, viewoptions.resource + '.ejs'),
	     simpleportalUtil.appendFilePath(simpleportalUtil.getServerPath("resources/templates"), instance.name, viewoptions.resource + '.ejs'),
	     simpleportalUtil.appendFilePath(instance.getPluginloader().templatedir, "../apiservice", viewoptions.resource + '.ejs')
    ];
	
	if(viewoptions.mobile){
		// change the view url
		if(viewoptions.serviceconfig && viewoptions.serviceconfig.viewurl)
			viewoptions.serviceconfig.viewurl = instance.getViewUrl(viewoptions.mobile);
		
		viewoptions.filelookups = [
            // let us include the temporary file using pluginloader
            instance.getPluginloader().getTempPath(request.webappsetting||{id:instance.plugin}, "/templates/" + instance.name + "/templates/jquerymobile/" + viewoptions.resource + ".html"),
           	simpleportalUtil.appendFilePath(instance.getPluginloader().templatedir, "../apiservice/templates/jquerymobile", viewoptions.resource + '.ejs'),
			simpleportalUtil.appendFilePath(simpleportalUtil.getServerPath("resources/templates/jquerymobile"), instance.name, viewoptions.resource + '.html.ejs'),
			simpleportalUtil.appendFilePath(instance.getPluginloader().templatedir, "../apiservice/templates/jquerymobile", viewoptions.resource + '.html.ejs')      

			// include the api relative path to the list
        ].concat(viewoptions.filelookups)
	}
	if(viewoptions && !viewoptions.data.templatedir)
		viewoptions.data.templatedir = instance.getServerInstance().getServerCorePath("resources/templates/public");
	
	var templateProcess = new Template(viewoptions); 
	templateProcess.render(response, function(error, html){

		if(error) {
			if(response)
				response.send(500, null, error);
		}else {
			templateProcess.sendToResponse(response);

			if(!templateProcess.templateError)
				instance.emit("viewready", {templateFile : templateProcess.templateFile, content:html, viewoptions:viewoptions});
			else
				instance.getLogger().error('Service:init '+ instance.name, templateProcess.templateError)
		}
	});
	
//	simpleportal.template.render(viewoptions.file, viewoptions.data, function(error, html){
//		if(!error){
////			response.contentType(simpleportalUtil.getMimeType(request.templateoptions.htmlfile));
////			response.send(200, request.headers, html);
//			
//			instance.getServiceloader().emit("viewready", {content:html, viewoptions:viewoptions});
//		}
//	});
	
	//}
}

function viewServiceCallback(instance, viewoptions, resource, error, result){
	viewoptions.serviceconfig = instance.getServiceConfig();
	
	return (function(instance, viewoptions, resource, error, result){
		return function(request, response, callback) {
			viewoptions.resource = resource;
			
			if(request.webappsetting && request.webappsetting.resourcepath){
				if(request.viewtemplatedir)
					viewoptions.resourcepath = simpleportalUtil.appendFilePath(request.webappsetting.resourcepath, request.viewtemplatedir, instance.name);
				else
					viewoptions.resourcepath = simpleportalUtil.appendFilePath(request.webappsetting.resourcepath, instance.name);
			}
			
			viewServiceSearchCallback(instance, viewoptions, error, result, request, response);
		};
	})(instance, viewoptions, resource, error, result);
} 

function updateViewServiceMethods(instance, serviceprefix){
	serviceprefix = serviceprefix||'/';
	
	var viewoptions = simpleportalUtil.extendJSON({}, instance.getConfiguration('viewservice'));

	var servicetemplates = simpleportalUtil.extendJSON({}, instance.options.servicetemplates);
	
	for(var i in servicetemplates) {
		if(!instance.service['GET ' + serviceprefix + i]) {
			instance.get(serviceprefix + i, viewServiceCallback(instance, viewoptions, servicetemplates[i], null, {}));
		}
	}
}

function updateRemoteRESTServiceMethods(instance, serviceprefix){
	updateRESTServiceMethods(instance, 'remoteService', serviceprefix);	
}

/**
 * Function to update the rest service with the relevent methods for adding / updating /searching/delete
 * @TODO use one method for both remote service and storage service locally.
 */
function updateRESTServiceMethods(instance, subService, serviceprefix){
	serviceprefix = serviceprefix||'/';
		
	if(!instance.service['GET '+serviceprefix])
    	instance.get(serviceprefix, function(request, response, callback) {
    		var options = instance.dbmodeloptions;
    		if(request.dbid)
    			options.dbid = request.dbid;
    		
    		instance[subService].search({}, request, restServiceCallback(instance, callback, simpleportal.Constants.ServiceEvents.AFTER_LIST, simpleportal.Constants.ServiceEvents.AFTER_LIST, request, response), options);
	    });
    
    if(!instance.service['GET '+serviceprefix+'count'])
    	instance.get(serviceprefix+'count', function(request, response, callback) {
    		var options = instance.dbmodeloptions;
    		if(request.dbid)
    			options.dbid = request.dbid;
    		
    		instance[subService].count({}, request, callback, options);
	    });
    
    if(!instance.service['GET '+serviceprefix+'search'])
    	instance.get(serviceprefix+'search', function(request, response, callback) {
        	var options = {};
    		if(request.dbid)
    			options.dbid = request.dbid;
    		
			instance[subService].search({}, request, restServiceCallback(instance, callback, simpleportal.Constants.ServiceEvents.AFTER_SEARCH, simpleportal.Constants.ServiceEvents.AFTER_SEARCH, request, response), options);
        });
	
    if(!instance.service['GET '+serviceprefix+':id'])
    	instance.get(serviceprefix+':id', function(request, response, callback) {
        	var options = instance.dbmodeloptions;
        	options.details = 'true';
    		if(request.dbid)
    			options.dbid = request.dbid;
    		var o_id = request.pathGroup;
    		
    		instance[subService].details(o_id, request, restServiceCallback(instance, callback, simpleportal.Constants.ServiceEvents.AFTER_DETAILS, simpleportal.Constants.ServiceEvents.AFTER_DETAILS, request, response), options);
	    });
    
    if(!instance.service['POST '+serviceprefix])
		instance.post(serviceprefix, function(request, response, callback) {
			var object = instance.getObject(request);
			
			if(object.validationmessages && object.validationmessages.length > 0){
				callback(object.validationmessages, object);
			}else{
				delete object.validationmessages;
				
				instance[subService].add_update(null, object, request, restServiceCallback(instance, callback, simpleportal.Constants.ServiceEvents.AFTER_UPDATE, simpleportal.Constants.ServiceEvents.AFTER_UPDATE, simpleportal.Constants.ServiceEvents.AFTER_ADD, request, response));
			}
        });
    
    if(!instance.service['PUT '+serviceprefix])
    	instance.put(serviceprefix+':id', function(request, response, callback) {
			var object = instance.getObject(request);
			
			if(object.validationmessages && object.validationmessages.length > 0){
				callback(object.validationmessages, object);
			}else{
				delete object.validationmessages;
				
				instance[subService].add_update(request.pathGroup, object, request, restServiceCallback(instance, callback, simpleportal.Constants.ServiceEvents.AFTER_UPDATE, simpleportal.Constants.ServiceEvents.AFTER_UPDATE, request, response));
			}
        });
    
    if(!instance.service['DELETE '+serviceprefix])
        instance.remove(serviceprefix+':id', function(request, response, callback) {
        	var options = {};
    		if(request.dbid)
    			options.dbid = request.dbid;
    		
    		instance[subService].remove(request.pathGroup, request, restServiceCallback(instance, callback, simpleportal.Constants.ServiceEvents.AFTER_DELETE, simpleportal.Constants.ServiceEvents.AFTER_DELETE, request, response), options);
        });
}

Service.prototype.getRService=function(){
	return this.rService;
}

Service.prototype.search=function(r, callback){
	var instance = this;
	
	if(this.getRService())
		this.getRService().search.apply(this.rService, arguments);
	else
		callback("no-such-method");
};

Service.prototype.details=function(r, callback){
	if(this.getRService())
		this.getRService().details.apply(this.rService, arguments);
	else
		callback("no-such-method");
};

Service.prototype.getLogger = function(){
	return instance.getLogger();
}

Service.prototype.getConfiguration = function(key, defaultvalue){
	if(key)
		return this._configuration[key]||defaultvalue;
	else
		return this._configuration;
}

Service.prototype.setConfiguration = function(key, value){
	if(key && typeof key != "object" && value)
		this._configuration[key] = value;
	
	else if(typeof key == "object")
		simpleportalUtil.extendJSON(this._configuration, key);
}

Service.prototype.getLogger = function(){
	return this.getServerInstance().getLogger();
}

Service.prototype.getServerInstance = function(){
	return this._serverInstance;
}

Service.prototype.getPluginloader = function(){
	// get the pluginloader asociated witht he instance
	return this._serverInstance.pluginloader;
}

Service.prototype.getServiceloader = function(){
	// get the pluginloader asociated witht he instance
	return this._serverInstance.serviceloader;
}

Service.prototype.getModelFieldValue = function(source, field){
	var instance = this,
		fieldvalue;
	
	if(source[field] && source.hasOwnProperty(field) )
		fieldvalue = source[field];
	else{
		var fieldsettings = instance.getModelsettings(field);
		
		if(fieldsettings && fieldsettings.alternatenames){
			for(var index in fieldsettings.alternatenames){
				var _field = fieldsettings.alternatenames[index];
				
				if(!fieldvalue && source.hasOwnProperty(_field)){
					if(typeof instance.model[field] == 'object' && typeof instance.model[field].length == 'number' && typeof source[_field] == "string")
						fieldvalue = [source[_field]];
					else
						fieldvalue = source[_field];
				}	
			}
		} else if( typeof instance.model[field] == 'array' || instance.model[field] instanceof Array && instance.model[field].length == 1 ){
			if(typeof instance.model[field][0] == 'string')
				fieldvalue = [];
			else if(typeof instance.model[field][0] == 'object')
				fieldvalue = [];
		} else	
			fieldvalue = instance.model[field];	
	}
	
	return fieldvalue;
}

Service.prototype.getModelsettings = function(field){
	// get the pluginloader asociated witht he instance
	if(field){
		return this.getConfiguration("modelsettings")[field];
	} else
		return this.getConfiguration("modelsettings");
};

Service.prototype.setPreference = function(key, value){
	if(key && typeof key != "object" && value)
		this._preference[key] = value;
	
	else if(typeof key == "object")
		simpleportalUtil.extendJSON(this._preference, key);
};

/**
 * To save the preference in to the db
 */
Service.prototype.savePreference = function(preferencekey, value, callback){
	var instance = this;
	
	var preferenceobject = {};
	if(typeof preferencekey == 'object'){
		preferenceobject  = preferencekey;
		if(typeof value == "function"){
			callback = value;
			value=null;
		}
	} else if(preferencekey && value){
		preferenceobject.title = preferenceobject.key = preferencekey;
		preferenceobject.preference = value;
	}
	
	// use serverpreference api
	if(preferenceobject && preferenceobject.key && preferenceobject.preference){
		preferenceobject.key = instance.name + "_" + preferenceobject.key;
		
		instance.getServiceloader()
			.getService("serverpreference")
			.registerPreference(preferenceobject, callback)
	} else if(callback)
		callback("not a valid preference object");
}

Service.prototype.removeSavedPreference = function(preferencekey, callback){
	var instance = this;
	
	// to save the preference to the db use service name prefixed while saving the preference
	var uniquepreferencekey = instance.name + "_" + preferencekey;
	
	// use serverpreference api
	instance.getServiceloader().getService("serverpreference").removeByKey(uniquepreferencekey, callback);
};

Service.prototype.getSavedPreference = function(preferencekey, defaultvalue, callback){
	var instance = this;
	
	if (typeof preferencekey == 'function'){
		// aggregate based on the instance.name
		instance.getServiceloader().getService("serverpreference").getStorageService().find({key:new RegExp("^"+instance.name+"_")}, function(error, response){
			var preference = {};
			var results = response.results;
			if(results && results.length > 0)
				for(var i in results){
					var pref = results[i];
					preference[pref.key.replace(instance.name +"_", "")] = pref.preference;
				}
			
			preferencekey(null, preference)
		});
	}else{
		if(typeof defaultvalue == 'function'){
			callback = defaultvalue;
			defaultvalue=null;
		}
		

		// to save the preference to the db use service name prefixed while saving the preference
		var uniquepreferencekey = instance.name + "_" + preferencekey;
		
		// use serverpreference api
		instance.getServiceloader().getService("serverpreference").getByKey(uniquepreferencekey, callback);
	}
};

Service.prototype.getPreferenceSetting = function(preferencekey, defaultvalue){
	var instance = this,
		preferencesetting = {};
	
	if(instance.options && instance.options.preferencesetting)
		preferencesetting = simpleportalUtil.extendJSON(preferencesetting, instance.options.preferencesetting);

	if(preferencekey)
		return preferencesetting[preferencekey]||defaultvalue;
	
	return preferencesetting;
}

Service.prototype.getPreference = function(preferencekey, defaultvalue){
	var instance = this,
		preference = {};
	
	if(instance.options && instance.options.preferencesetting)
		preference = simpleportalUtil.extendJSON(preference, instance.options.preferencesetting, instance._preference);
	
	if(preferencekey)
		return preference[preferencekey]||defaultvalue;

	return preference;
};

Service.prototype.getDataDirectory=function(subpath, subpath1, subpath2, subpath3){
	var instance = this;
	
	if(!instance.plugin)
		return instance.getServerInstance().getDataDirectory(instance.name, subpath, subpath1, subpath2, subpath3);
	else
		//@TODO assuming services are only loaded using the webapp
		return instance.getPluginloader().getDataDirectory({id:instance.plugin, plugintype:'webapp'}, instance.name, subpath, subpath1, subpath2, subpath3);
}