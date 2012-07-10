/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */
var mongodb = require('mongodb');
var logger = require("./../logger").getInstance();

var DBPool = module.exports = function DBPool(options) {
	var instance = this;
	
	instance.dbInstance = [];
	instance.dbConfiguration = [];	
}

DBPool.prototype.registerDB = function(dbid, configuration){
	var instance = this;
	logger.debug('Simpleportal -dbpool', 'Registering db -' + dbid);
	
	instance.dbConfiguration[dbid] = configuration;    
}

DBPool.prototype.getConfiguration = function(dbid){
	var instance = this;
	return instance.dbConfiguration[dbid];    
}

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

DBPool.prototype.start = function(dbid, callback){
	var instance = this;
	if(dbid && instance.getConfiguration(dbid)){
		logger.debug('Smple Portal -dbpool', 'Db starting and keeping in db pool -' + dbid);
		
		callback = callback || function(){};
		var options = instance.getConfiguration(dbid);
		
		var server = new mongodb.Server(options.host, Number(options.port), options.params||{});
		
		var dbInstance_ = new mongodb.Db(options.dbName, server, {});
		
		dbInstance_.open(function(error, client){
			if(error){
				logger.error('Smple Portal -dbpool', 'Error While initialiing' + error);
				dbInstance_ = null;
				callback(error);
			} else{
				callback(null, dbInstance_);	
			}
		});
	}else {
		callback("we didn't find any confguration for db id -"+ dbid);
	}
}