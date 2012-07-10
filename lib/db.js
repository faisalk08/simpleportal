/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var db = module.exports = {};

var mongodb = require('mongodb');
var fs = require('fs');
var zlib = require('zlib');

var logger = require("./logger").getInstance();
var util = require('./util');
var exec = require('child_process').exec;
var BSON = mongodb.BSONPure;

var dbInstance;
var dbConfiguration;

db.generateId = function(name) {
	if (name) {
		name = name.replace(/(undefined|null|[^a-zA-Z0-9ŠšŸ§]+)/g, '').toLowerCase();
	}
	
	return name;
}

db.getInstance = function(){
    return dbInstance;    
}

db.start = function(options, callback){
	callback = callback || function(){};
	var server = new mongodb.Server(options.host, Number(options.port), options.params||{});
	
	var dbInstance_ = new mongodb.Db(options.dbName, server, {});
	
	dbInstance_.open(function(error, client){
		if(error){
			logger.error('Smple Portal -db', 'Error While initialiing' + error);
			dbInstance_ = null;
			callback(error);
		} else{
			callback(null, dbInstance_);	
		}
	});
}

db.init = function(configuration, callback){
	logger.info('Simple Portal -db', 'Initializing DB');

	var DBPool = require('./wrapper/dbpool');
	
	var dbpool = new DBPool();
	
	if(configuration && configuration.db){
		dbConfiguration  = configuration.db.mongodb;
		/*
		db.start(dbConfiguration, function(error, instance){
			if(!error)
				dbInstance = instance;
			callback(error, dbInstance);
		});*/
		dbpool.registerDB('default', dbConfiguration);
		db.dbpool = dbpool;
		db.dbpool.getInstance('default', function(error, dbInstance_){
			dbInstance = dbInstance_;
			callback(error, dbInstance_);
		});
	} else {
		logger.info('Simple Portal -db', 'DB configuration is not done properly!!!');
		callback('DB configuration is not done properly!!!')
	}
}

db.uploadFile = function(filePath, fileName, contentType, callback, dbInstance){
	dbInstance = dbInstance||db.getInstance(); 
	if(dbInstance){
		
		var gridStore = new mongodb.GridStore(dbInstance, fileName, "w", {
			"contentType": contentType
		});
		
		gridStore.open(function(error, gridStore){
			if(error)
				callback(error);
			gridStore.writeFile(filePath, function(err, gridStore) {
				if(err)
					callback(err);
				else
					callback(null, {fileId : gridStore._id});
			});
		});
	} else
		callback("No db instance found!!");		
}

db.getFileContent = function(fileId, dbInstance, callback){
	dbInstance = dbInstance||db.getInstance(); 
	if(dbInstance){
		mongodb.GridStore.exist(dbInstance, fileId, function(){
			var gridStore = new mongodb.GridStore(dbInstance, fileId , "r");
			gridStore.open(function(error, data){
				gridStore.read([1024*4], function(error, data){
					if(error){
						callback(error.toString());
					} else{
						callback(gridStore.currentChunk.data.buffer);
					}
				});
			});
		});
	} else{
		callback("No db instance found!!");
	}
}

db.sendFile = function(fileId, contentType, response, dbInstance){
	dbInstance = dbInstance||db.getInstance(); 
	if(dbInstance){
		mongodb.GridStore.exist(dbInstance, fileId, function(){
			var gridStore = new mongodb.GridStore(dbInstance, fileId , "r");
			gridStore.open(function(error, data){
				gridStore.read([1024*4], function(error, data){
					if(error){
						response.writeHead(400);
						response.write(error.toString());
						response.end();
					} else{
						response.writeHead(200, { 'Content-Type': contentType});
						if(contentType ='image/png')
							response.write(gridStore.currentChunk.data.buffer, 'base64');
						else
							response.write(gridStore.currentChunk.data.buffer, 'binary');
						response.end();
					}
				});
			});
		});
	} else{
		response.writeHead(400);
		response.write("No db instance found!!");
		response.end();
	}
}

db.writeFile =  function(fileId, contentType, file, callback, dbInstance){
	dbInstance = dbInstance||db.getInstance(); 
	if(dbInstance){
		mongodb.GridStore.exist(dbInstance, fileId, function(){
			var gridStore = new mongodb.GridStore(db.getInstance(), fileId , "r");
			gridStore.open(function(error, data){
				gridStore.read([1024*4], function(error, data){
					if(error){
						callback(error.toString());
					} else{
						var fs = require('fs');
						var stream = fs.createWriteStream(file);
						stream.once('open', function(fd) {
						  stream.write(gridStore.currentChunk.data.buffer, 'binary');  
						});
						callback(null, {});
					}
				});
			});
		});
	} else{
		callback("No db instance found!!");
	}
}

db.downloadBackup = function(options, response){
	var file = options.file;
	var dumpdir = options.dumpdir||dbConfiguration.dumpdir||'./dump';
	
	fs.lstat(dumpdir + '/' + file + '.gz', function(error, stats) {
		if (!error) {
			var raw = fs.createReadStream(dumpdir + '/' + file + '.gz');
			raw.pipe(zlib.createGzip()).pipe(response);
		} else{
			response.writeHead(400);
			response.write("No file found with the detail you provided!!");
			response.end();
		}
	});
}

db.backup = function(options, callback){
	options = options||{};
	var dumptool = options.dumptool||dbConfiguration.dumptool||'mongodump';
	var dbName = options.dbName||dbConfiguration.dbName;	
	var dumpdir = options.dumpdir||dbConfiguration.dumpdir||'./dump';
	
	util.checkDir(dumpdir, function(error){
		if(error){
			callback(error);
		} else{
			var cmd = dumptool + " --db " + dbName;
			if(dumpdir)
				cmd += ' -o' + dumpdir;
			
			
			var date = new Date();
			var dumpfile = dbName + '-' + date.getDate()  + '-' + date.getMonth()  + '-' + date.getYear() + '-'+ date.getHours() + '-'+ date.getMinutes() + '-' + date.getSeconds();
			
			exec(cmd, function (error, stdout, stderr) {
				if(error){
					callback(error);
				} else{
					var stream = fs.createWriteStream(dumpdir + '/'+ dbName + '/README.txt');
					stream.once('open', function(fd) {
					  stream.write('Copyrighted by EviMed online GmbH, Misusing of this file may invite legal actions!!');  
					});
					
					var cmd_bckup = 'cd ' + dumpdir + '/' + dbName + ' && tar -zcvf ../' + dumpfile + '.gz  *';
					
					var result = {mongodump:{stdout : stdout, stderr:stderr}};
					
					exec(cmd_bckup, function (error, stdout, stderr) {
						result.zip_archive = {stdout : stdout, stderr:stderr, file:dumpfile}
						callback(error, result);
					});	
				}
			});
		}
	});
}

function restoreCollection(options, callback){
	options = options||{};
	var restoretool = options.restoretool||dbConfiguration.restoretool||'mongorestore';
	var dbName = options.dbName||dbConfiguration.dbName;	
	var restoredir = options.restoredir||dbConfiguration.restoredir||'./dump_import';
	
	var collectionName = options.collectionName;
	var filePath = options.filePath;
	
	if(collectionName && filePath){
		db.backup(options, function(error){
			if(!error){
				var date = new Date();
				var restorefile = 'import-' + collectionName + '-' + date.getDate()  + '-' + date.getMonth()  + '-' + date.getYear() + '-'+ date.getHours() + '-'+ date.getMinutes() + '-' + date.getSeconds() + '.bson';
				
				util.moveFile(restoredir, restorefile, filePath, function(error){
					var cmd = restoretool + " -v -d " + dbName + ' -c ' + collectionName + ' ' + restoredir + '/' + restorefile;
					
					exec(cmd, function (error, stdout, stderr) {
						if(error){
							callback(error);
						} else{
							var result = {mongorestore:{stdout : stdout, stderr:stderr}};
							callback(error, result);
						}
					}); 
				});
			}else
				callback('Some problem while taking the back up the collection');
		});
	} else
		callback('Collection and file is missing!!!');
}

function restoreDatabase(options, callback){
	options = options||{};
	var restoretool = options.restoretool||dbConfiguration.restoretool||'mongorestore';
	var dbName = options.dbName||dbConfiguration.dbName;	
	var restoredir = options.restoredir||dbConfiguration.restoredir||'./dump_import';
	
	var filePath = options.filePath;
	
	if(filePath){
		db.backup(options, function(error){
			if(!error){
				var date = new Date();
				var inputFile = dbName + '-' + date.getDate()  + '-' + date.getMonth()  + '-' + date.getYear() + '-'+ date.getHours() + '-'+ date.getMinutes() + '-' + date.getSeconds();
				
				util.moveFile(restoredir, inputFile + '.gz', filePath, function(){
					util.checkDir(restoredir +'/'+ inputFile, function(){
						var cmd_bckup = 'tar -xvzf ' + restoredir +'/' + inputFile + '.gz' + ' -C ' + restoredir +'/'+ inputFile;

						var result = {};
						
						exec(cmd_bckup, function (error, stdout, stderr) {
							var cmd = restoretool + " -v -d " + dbName + ' ' + restoredir +'/'+ inputFile;
							
							exec(cmd, function (error, stdout, stderr) {
								if(error){
									callback(error);
								} else{
									var result = {mongorestore:{stdout : stdout, stderr:stderr}};
									callback(error, result);
								}
							}); 
						});
					});
				});
			} else{
				callback('Some problem while taking the back up the collection -' + error);
			}
		});
	} else
		callback('DB and file is missing!!!');
}

db.importCollection = function(options, callback){
	restoreCollection(options, callback);
}

db.importDB = function(options, callback){
	restoreDatabase(options, callback);
}

db.getObjectId = function(id) {
	return BSON.ObjectID.createFromHexString(id); /* Alternate is new BSON.ObjectID(id) */
}

db.LocalCache = require('./wrapper/localcache').LocalCache;