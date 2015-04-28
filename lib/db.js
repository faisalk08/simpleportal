/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */
/**
 * Database middleware for `simpleportal.Server`
 *
 * @property db
 * @for simpleportal
 * @type {db}
 * @static
 */

/**
 * Database middleware for `simpleportal.Server`
 * 
 * @class db
 * @module middleware
 * @static
 */
var db = module.exports = {};

var mongodb = require('mongodb');
var fs = require('fs');
var zlib = require('zlib');

var logger = require("./logger");
var util = require('./util');
var exec = require('child_process').exec;

//var BSON = mongodb.BSONPure;

var ObjectID;
if(mongodb.BSONPure)
	ObjectID = mongodb.BSONPure.ObjectID;
else
	ObjectID = mongodb.ObjectID;

var dbInstance;
var dbConfiguration;

/**
 * To generate the id from the text
 * 
 * @method generateId
 * @param {string} name text to be formatted
 * @return name formatted id
 */
db.generateId = function(name) {
	return util.generateId(name);
}

/**
 * To get the default database instance 
 * 
 * @method getInstance
 * @return dbInstance Database instance
 */
db.getInstance = function(){
    return dbInstance;    
}

/**
 * To start the database instance
 * 
 * @method start
 * 
 * @param {object} options Options for the database instance
 * @param {callback} callback The callback to excecute when complete
 */
db.start = function(options, callback){
	callback = callback || function(){};
	var server = new mongodb.Server(options.host, Number(options.port), options.params||{});
	
	var dbInstance_ = new mongodb.Db(options.dbName, server, {});
	
	dbInstance_.open(function(error, client){
		if(error){
			logger.getInstance().error('Smple Portal -db', 'Error While initialiing' + error);
			dbInstance_ = null;
			callback(error);
		} else{
			callback(null, dbInstance_);	
		}
	});
}

/**
 * To initialize the database instance
 * @method init
 * @param {} configuration Configurations for the database instance
 * @param {callback} callback The callback to excecute when complete
 */
db.init = function(configuration, callback){
	logger.getInstance().info('Simple Portal -db', 'Initializing DB');

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
		logger.getInstance().info('Simple Portal -db', 'DB configuration is not done properly!!!');
		callback('DB configuration is not done properly!!!')
	}
}

/**
 * To get the information of a file uploaded in database file storage
 * 
 * @todo should support couchdb and othe nosql databases
 * @method fileInfo
 * 
 * @param {} fileName Name of the file
 * @param {callback} callback The callback to excecute when complete
 * @param {} dbInstance Optional db instance object if not mentioned will use default db instance
 */
db.fileInfo = function(fileName, callback, dbInstance){
	dbInstance = dbInstance||db.getInstance(); 
	var gridStore = new mongodb.GridStore(dbInstance, fileName, "r");

	gridStore.open(callback);
};

/**
 * To check whether a file exists in database file storage or not
 * 
 * @todo should support couchdb and other nosql databases
 * @method existFile
 * 
 * @param {} fileName Name of the file
 * @param callback The callback to excecute when complete
 * @param {} dbInstance Optional db instance object if not mentioned will use default db instance
 */
db.existFile = function(fileName, callback, dbInstance){
	dbInstance = dbInstance||db.getInstance(); 
	mongodb.GridStore.exist(dbInstance, fileName, callback);
};

/**
 * To upload file in to the databases file storage
 * 
 * @todo should support couchdb and othe nosql databases
 * @method uploadFile
 * 
 * @param {string} filePath Absolute path of the file to upload in to the database
 * @param {string} fileName Name of the file 
 * @param {string} contentType File content type
 * @param {callback} callback The callback to excecute when complete
 * @param {} dbInstance Optional db instance object if not mentioned will use default db instance
 */
db.uploadFile = function(filePath, fileName, contentType, callback, dbInstance){
	dbInstance = dbInstance||db.getInstance(); 
	if(dbInstance){
		
		var gridStore = new mongodb.GridStore(dbInstance, fileName, "w", {
			"contentType": contentType/*,
			"chunk_size": 1024*4*/
		});
		
		gridStore.open(function(error, gridStore){
			if(error)
				callback(error);
			else
				gridStore.writeFile(filePath, function(err, object) {
					if(err)
						callback(err);
					else{
						callback(null, {fileId : object.fileId});
					}	
				});
		});
	} else
		callback("No db instance found!!");		
}

/**
 * To get the file content from the databases file storage
 * 
 * @method getFileContent
 * 
 * @param {} fileId Id of the file
 * @param {} dbInstance Optional database instance object if not mentioned will use default database instance
 * @param {callback} callback The callback to excecute when complete
 */
db.getFileContent = function(fileId, dbInstance, callback){
	dbInstance = dbInstance||db.getInstance(); 
	if(dbInstance){
		mongodb.GridStore.exist(dbInstance, fileId, function(){
			var gridStore = new mongodb.GridStore(dbInstance, fileId , "r");
			gridStore.open(function(error, data){
				if(data)
				gridStore.read(/*[1024*4], */function(error, data){
					if(error){
						callback(error.toString());
					} else{
						callback(gridStore.currentChunk.data.buffer);
					}
				});
				else if(error)
					callback(error.toString());
				else
					callback('');
			});
		});
	} else{
		callback("No db instance found!!");
	}
}

/**
 * To send the file content in to the http response
 * 
 * @method sendFile
 * @param {} fileId Id of the file
 * @param {} contentType Content type of the file
 * @param {} response http response 
 * @param {} dbInstance Optional database instance object if not mentioned will use default database instance
 */
db.sendFile = function(fileId, contentType, response, dbInstance){
	dbInstance = dbInstance||db.getInstance(); 
	if(dbInstance){
		mongodb.GridStore.exist(dbInstance, fileId, function(){
			var gridStore = new mongodb.GridStore(dbInstance, fileId , "r");
			gridStore.open(function(error, data){
				mongodb.GridStore.read(dbInstance, fileId, function(err, fileData) {
					if(error){
						response.writeHead(400);
						response.write(error.toString());
						response.end();
					} else{
						if(contentType == 'binary/octet-stream'){
							response.write(fileData, 'binary');
							
							response.end();
						}else{
							response.writeHead(200, { 'Content-Type': contentType});
							if(contentType ='image/png')
								response.write(fileData, 'base64');
							else
								response.write(fileData, 'binary');
							response.end();							
						}
					}
				});/*
				gridStore.read([1024*4], function(error, data){
					if(error){
						response.writeHead(400);
						response.write(error.toString());
						response.end();
					} else{
						if(contentType == 'binary/octet-stream'){
							response.write(gridStore.currentChunk.data.buffer, 'binary');
							
							response.end();
						}else{
							response.writeHead(200, { 'Content-Type': contentType});
							if(contentType ='image/png')
								response.write(gridStore.currentChunk.data.buffer, 'base64');
							else
								response.write(gridStore.currentChunk.data.buffer, 'binary');
							response.end();							
						}
					}
				});*/
			});
		});
	} else{
		response.writeHead(400);
		response.write("No db instance found!!");
		response.end();
	}
}

/**
 * To write the file from the database in to the file storage
 * 
 * @method writeFile
 * @param {} fileId Id of the file 
 * @param {} contentType Content type of the file
 * @param {} file Path for the filesystem where the file will be stored
 * @param {callback} callback The callback to excecute when complete
 * @param {} dbInstance Optional database instance object if not mentioned will use default database instance 
 */
db.writeFile =  function(fileId, contentType, file, callback, dbInstance){
	dbInstance = dbInstance||db.getInstance(); 
	if(dbInstance){
		mongodb.GridStore.exist(dbInstance, fileId, function(){
			var gridStore = new mongodb.GridStore(db.getInstance(), fileId , "r");
			gridStore.open(function(error, data){
				gridStore.read(/*[1024*4], */function(error, data){
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

/**
 * To download the database backup across the http response
 * 
 * @method downloadBackup
 * 
 * @param {} options database options
 * @param {} response Http response 
 */
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

/**
 * To take a database backup 
 * 
 * @method backup
 * @param {} options database instance configurations
 * @param {callback} callback The callback to excecute when complete
 */
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

/**
 * To restore a database collection from a backup
 * 
 * @method restoreCollection
 * @param {} options database collection options
 * @param {callback} callback The callback to excecute when complete
 * @private
 */
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

/**
 * To restore a complete database from a backup
 * 
 * @method restoreDatabase
 * @param {} options database configuration
 * @param {callback} callback The callback to excecute when complete
 * @private
 */
function restoreDatabase(options, callback){
	options = options||{};
	var restoretool = options.restoretool||dbConfiguration.restoretool||'mongorestore';
	var dbName = options.dbName||dbConfiguration.dbName;	
	var restoredir = options.restoredir||dbConfiguration.restoredir||'./dump_import';
	
	var filePath = options.filePath;
	var filemapping = options.filemapping||{};
	if(filePath){
		db.backup(options, function(error){
			if(!error){
				var date = new Date();
				var inputFile = dbName + '-' + date.getDate()  + '-' + date.getMonth()  + '-' + date.getYear() + '-'+ date.getHours() + '-'+ date.getMinutes() + '-' + date.getSeconds();
				
				var response = fs.createWriteStream(restoredir +'/'+ inputFile + '.gz');
				var raw = fs.createReadStream(filePath);
				raw.pipe(zlib.createGunzip()).pipe(response);
				
				filePath = restoredir +'/'+ inputFile + '.gz';
					
				util.checkDir(restoredir +'/'+ inputFile, function(error){
					if(error)
						callback(error);
					else{
						var cmd_bckup = 'tar -xvzf ' + restoredir +'/' + inputFile + '.gz' + ' -C ' + restoredir +'/'+ inputFile;
					
						var result = {};
						logger.getInstance().info('Simpleportal -db', 'Exeuting the extracting tool command' + cmd_bckup);
						
						exec(cmd_bckup, function (error, stdout, stderr) {
							if(error)
								callback(error);
							else{
								fs.readdirSync(restoredir +'/'+ inputFile).forEach(function(filename){
								    if (/\.bson$/.test(filename) && filemapping[filename]) {
								    	var newfilename = filemapping[filename];
								    	logger.getInstance().info('Simpleportal -db', 'Renaming file filename - '+ filename + ' -- to -- '+ newfilename);
								    	fs.renameSync(restoredir +'/'+ inputFile + '/' + filename, restoredir +'/'+ inputFile + '/' + newfilename);
								    }
								});
								
								var cmd = restoretool + " -v -d " + dbName + ' ' + restoredir +'/'+ inputFile;
								logger.getInstance().info('Simpleportal -db', 'Executing the restore tool command' + cmd);
								
								exec(cmd, function (error, stdout, stderr) {
									if(error){
										callback(error);
									} else{
										var result = {mongorestore:{stdout : stdout, stderr:stderr}};
										callback(error, result);
									}
								});
							}
						});
					}
				});
			} else{
				callback('Some problem while taking the back up the collection -' + error);
			}
		});
	} else
		callback('DB and file is missing!!!');
}

/**
 * To restore a database collection from a backup
 * 
 * @method importCollection
 * @param {} options Options for the restore
 * @param {callback} callback The callback to excecute when complete
 */
db.importCollection = function(options, callback){
	restoreCollection(options, callback);
}

/**
 * To import / restore a database from an exisiting backup
 * @method importDB
 * @param {} options
 * @param {callback} callback The callback to excecute when complete
 * @return 
 */
db.importDB = function(options, callback){
	restoreDatabase(options, callback);
}

/**
 * To get the BSON formatted id from the text string
 * 
 * @method getBSONObjectId
 * @param {string} id ID to e formatted
 * @return {object} BSON ID object
 */
db.getBSONObjectId = function(id) {
	try{
		return new ObjectID(id);
	} catch(error){
		console.log(error);
		return null;
	}
}

/**
 * To get the BSON Object id from hexa decimal string 
 * 
 * @method getObjectId
 * @param {string} id text which will be used to generate the id
 * @return formatted db object id
 */
db.getObjectId = function(id) {
	return ObjectID.createFromHexString(id); /* Alternate is new BSON.ObjectID(id) */
}

db.LocalCache = require('./wrapper/localcache').LocalCache;