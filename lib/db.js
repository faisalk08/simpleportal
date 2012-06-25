/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var db = module.exports = {};

var mongodb = require('mongodb');

var logger = require("./logger").getInstance();

var dbInstance;

db.getInstance = function(){
    return dbInstance;    
}

db.start = function(options, callback){
	callback = callback || function(){};
	var server = new mongodb.Server(options.host, Number(options.port), options.params||{});
	
	dbInstance = new mongodb.Db(options.dbName, server, {});
	
	dbInstance.open(function(error, client){
		if(error){
			console.log(error);
			dbInstance = null;
			callback(error);
		} else{
			callback(null, dbInstance);	
		}
	});
}

db.init = function(configuration, callback){
	logger.info('DB ', 'Initializing DB');
	
	if(configuration && configuration.db){
		options  = configuration.db;
		db.start(options.mongodb, callback);
	} else {
		logger.info('DB ', 'DB configuration is not done properly!!!');
		callback('DB configuration is not done properly!!!')
	}
}

db.LocalCache = require('./wrapper/localcache').LocalCache;