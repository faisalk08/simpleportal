/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */
var mongodb = require('mongodb');
var logger = require("./../logger");

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
	
	instance.dbInstance = [];
	instance.dbConfiguration = [];	
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
	logger.getInstance().debug('Simpleportal -dbpool', 'Registering db -' + dbid);
	
	instance.dbConfiguration[dbid] = configuration;    
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
	logger.getInstance().info('feasibilityclinetdb:unRegisterDB', dbid);
	
	if(instance.dbInstance[dbid]){
		delete instance.dbInstance[dbid];
	}
	
	delete instance.dbConfiguration[dbid];    
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
	return instance.dbConfiguration[dbid];    
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
	callback = callback||function(){};
	
	if(instance.dbInstance[dbid]){
		//return dbInstance[dbid];
		callback(null, instance.dbInstance[dbid]);
	}else{
		instance.start(dbid, function(error, dbInstance){
			if(!error){
				instance.dbInstance[dbid] = dbInstance; 
			}
			callback(error, instance.dbInstance[dbid]);
		});
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
		logger.getInstance().debug('Simple Portal -dbpool', 'Db starting and keeping in db pool -' + dbid);
		
		callback = callback || function(){};
		var options = instance.getConfiguration(dbid);
		
		var server = new mongodb.Server(options.host, Number(options.port), options.params||{});
		
		var dbInstance_ = new mongodb.Db(options.dbName, server, {safe:true});
		
		dbInstance_.open(function(error, client){
			if(error){
				logger.getInstance().error('Simple Portal -dbpool', 'Error While initializing' + error);
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
	}else {
		callback("we didn't find any configuration for db id -"+ dbid);
	}
}