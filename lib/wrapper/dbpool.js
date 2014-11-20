/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */
var mongodb = require('mongodb');
var logger = require("./../logger");

var DBPool = module.exports = function DBPool(options) {
	var instance = this;
	
	instance.dbInstance = [];
	instance.dbConfiguration = [];	
}

DBPool.prototype.registerDB = function(dbid, configuration){
	var instance = this;
	logger.getInstance().debug('Simpleportal -dbpool', 'Registering db -' + dbid);
	
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