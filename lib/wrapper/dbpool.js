"use strict";
/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */
var mongodb = require('mongodb'),
	TemplateUtils = require('simpleportal/lib/template/util');
//	logger = require("./../logger");

/**
 * Database Pool (NOSQL)
 *
 	var dbpool = require('simpleportal.DBPool')({database configuration});
 	
 * @class DBPool
 * @module simpleportal
 * @submodule wrapper
 * 
 * @todo support for couch db and other nosql databases
 * 
 * @constructor
 * @param {} options Options for the database pool
 *  
 */
var DBPool = 
 module.exports = function DBPool(options) {
	var instance = this;
	
	instance._dbInstance = [];
	instance._dbConfiguration = {};
	
	instance.preferencekey = "db";
	instance.routerid = 'Database';
}

/**
 * To register a database instance 
 * 
 * @method registerDB
 * 
 * @param {string} dbid unique id for the database instance in the db pool
 * @param {} configuration Configuration for the db instance
 * @return 
 */
DBPool.prototype.registerDB = function(dbid, configuration){
	var instance = this;
	
	instance._dbConfiguration[dbid] = configuration;    
}

/**
 * To unregister a database fromt he db pool
 * 
 * @method unRegisterDB
 * @param {string} dbid id of the db instance to be un registerd
 *  
 */
DBPool.prototype.unRegisterDB = function(dbid){
	var instance = this;
//	logger.getInstance().info('feasibilityclinetdb:unRegisterDB', dbid);
	
	if(instance._dbInstance[dbid]){
		delete instance._dbInstance[dbid];
	}
	
	delete instance._dbConfiguration[dbid];    
};

/**
 * To ge the configuration of db instance fromt he db pool
 * 
 * @method getConfiguration
 * @param {string} dbid id for the db instance
 * 
 * @return {object} database instance configuration
 */
DBPool.prototype.getConfiguration = function(dbid){
	var instance = this;
	
	return instance._dbConfiguration[dbid];    
}

/**
 * @method getConfigurations
 * 
 * @return {object} list pf database configurations
 * 
 */
DBPool.prototype.getDbIds = function(){
	var instance = this;
	
	return Object.keys(instance._dbConfiguration);    
}

/**
 * @method getConfigurations
 * 
 * @return {object} list pf database configurations
 * 
 */
DBPool.prototype.getConfigurations = function(dbpoolid){
	var instance = this;
	
	if(dbpoolid)
		return instance._dbConfiguration[dbpoolid];
	else
		return instance._dbConfiguration;    
}

/**
 * To ge the db instance basd on the db id provided
 * 
 * @method getInstance
 * @param {string} dbid id for the db instance
 * 
 * @param {callback} callback The callback to excecute when complete
 */
DBPool.prototype.getInstance = function(dbid, callback){
	var instance = this;
//	
//	callback = callback;
	
	if(instance._dbInstance[dbid]) {
		return callback(null, instance._dbInstance[dbid]);
	} else {
		try{
			instance.start(dbid, function(error, dbInstance){
				if(!error){
					instance._dbInstance[dbid] = dbInstance; 
				}
				
				return callback(error, instance._dbInstance[dbid]);
			});
		} catch(error){
			console.error(error);
			console.trace(error);
//			throw error;
			return callback(error);
		}
	}    
}

/**
 * To start a db instance
 * 
 * @method start
 * 
 * @param {string} dbid id for the db instance
 * @param {callback} callback The callback to excecute when complete
 * @private
 */
DBPool.prototype.start = function(dbid, callback){
	var instance = this;
	if(dbid && instance.getConfiguration(dbid)){
		console.log('Simple Portal -dbpool' + 'Db starting and keeping in db pool -' + dbid);
		callback = callback || function(){};
		
		var options = instance.getConfiguration(dbid);
		
		try {
			var server = new mongodb.Server(options.host, Number(options.port), options.params||{});
			var dbInstance_ = new mongodb.Db(options.dbName, server, {safe:true});
			
			dbInstance_.open(function(error, client){
				if(error){
					console.error(error);
					console.trace(error);
					
					dbInstance_ = null;
					callback(error);
				} else{
					if(options.user && options.password){
						dbInstance_.authenticate(options.user, options.password, {authSource:options.authSource||'admin'}, function(error, status){
							if(error) {
								dbInstance_ = null;
								callback(error);
							}else
								callback(null, dbInstance_);
						})
					}else
						callback(null, dbInstance_);	
				}
			});
		} catch(error){
			console.error(error);
			console.trace(error);
			throw error;
			callback(error);
		}
	}else {
		callback("we didn't find any configuration for db id -"+ dbid);
	}
}

/**
 * To get the default properties of the db setting
 */
DBPool.prototype.getRouterDefaults = function(){
	return DBPool.DEFAULT_PROPS;
}

/**
 * To return router fields
 */
DBPool.prototype.getRouterFields = function(routerid){
	var instance = this;
	
	//default fields must be via a function
	var routerdefaults = instance.getRouterDefaults();
	var routerdefaultfields = Object.keys(routerdefaults);
	
	var routerfields = [];
	var routerFieldProps = TemplateUtils.getFieldFromObject(routerdefaults, instance.preferencekey + "__" + routerid + "__");
	if(routerFieldProps)	
		for(var fieldIndex in routerFieldProps){
			var routerField = routerFieldProps[fieldIndex];
			if(fieldIndex == 0)
				routerField.html.category = instance.routerid + ' - Configuration for - ' + routerid;
			
			routerfields.push(routerField);
		}
	
	return routerfields;
}

DBPool.DEFAULT_PROPS = {
	port: "",
	host: "",
	user: "",
	password: "",
	dbName: ""
};