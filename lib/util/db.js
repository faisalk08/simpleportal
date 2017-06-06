"use strict";
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

var mongodb = require('mongodb'),
	fs = require('fs'),
	zlib = require('zlib'),
//	logger = require("./logger"),
	util = require('./../util'),
	exec = require('child_process').exec,
	DBPool = require('./../wrapper/dbpool');

//var BSON = mongodb.BSONPure;

var ObjectID,
	dbInstance,
	dbpool,
	dbConfiguration;

if(mongodb.BSONPure)
	ObjectID = mongodb.BSONPure.ObjectID;
else
	ObjectID = mongodb.ObjectID;

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

db.registerDB = function(dbid, configuration){
	dbpool.registerDB(dbid, configuration);
}

/**
 * Method to check the connectivity options for the db is given properly during server setup!
 * @method checkDBConfig
 * @param {object} options for the db connection
 * @callback callback function after the connection check
 */
db.checkDBConfig = function(options, callback){
	var mongoserver = new mongodb.Server(options.host, Number(options.port), options.params||{});
	
	var mongoinstance = new mongodb.Db(options.dbName, mongoserver, {});
	
	mongoinstance.open(function(error, client){
		callback(error, client);
	});
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
//db.init = function(configuration, callback){
//	logger.getInstance().info('Simple Portal -db', 'Initializing DB');
//
//	db.dbpool = dbpool = new DBPool();
//	
//	if(configuration && configuration.db){
//		dbConfiguration  = configuration.db.mongodb;
//		
//		dbpool.registerDB('default', dbConfiguration);
//		
//		db.dbpool.getInstance('default', function(error, dbInstance_){
//			dbInstance = dbInstance_;
//			callback(error, dbInstance_);
//		});
//	} else {
//		logger.getInstance().info('Simple Portal -db', 'DB configuration is not done properly!!!');
//		callback('DB configuration is not done properly!!!')
//	}
//}

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
	dbInstance = dbInstance || db.getInstance(); 
	
	if(false){
		var gridStore = new mongodb.GridStore(dbInstance, fileName, "r");

		gridStore.open(callback);
	} else {
		if(typeof fileName == "object"){
			if(typeof fileName == "object" && fileName._id){
				fileName._id  = db.getBSONObjectId(fileName._id);
			}
			
			dbInstance.collection("fs.files").findOne(fileName, callback);
		}else
			dbInstance.collection("fs.files").findOne({filename:fileName}, callback);
	}
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
db.uploadFile = function(filePath, fileName, contentoptions, callback, dbInstance){
	dbInstance = dbInstance||db.getInstance(); 
	if(dbInstance){
		//
		if(false){
			var gridStore = new mongodb.GridStore(dbInstance, fileName, "w", contentoptions);
			
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
		}else{
			var gridStore = new mongodb.GridFSBucket(dbInstance, {writeConcern:{ w: 1} });
			var uploadStream = gridStore.openUploadStream(fileName, contentoptions);
			fs.createReadStream(filePath).pipe(uploadStream);
			uploadStream.once('finish', function(error, upoadedobject) {
				callback(null, {fileId : uploadStream.id});
			});
//			
//			gridStore.open(function(error, gridStore){
//				if(error)
//					callback(error);
//				else
//					gridStore.writeFile(filePath, function(err, object) {
//						if(err)
//							callback(err);
//						else{
//							callback(null, {fileId : object.fileId});
//						}	
//					});
//			});
		}
		
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
		//mongodb.GridStore.exist(dbInstance, fileId, function(){
			var gridStore = new mongodb.GridStore(dbInstance, fileId , "r");
			gridStore.open(function(error, data){
				if(data)
					mongodb.GridStore.read(dbInstance, fileId, function(err, fileData) {
						if(error){
							callback(error.toString());
						} else{
							callback(null, gridStore.currentChunk.data.buffer);
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
		if(false){
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
					});
				});
			});
		}else{
			var bucket = new mongodb.GridFSBucket(dbInstance);
			var downloadStream = bucket.openDownloadStream(fileId);
			
			if(downloadStream)
				downloadStream.pipe(response);
			else {
				response.writeHead(400);
				response.write(error.toString());
				response.end();
			}
			
//			gridStore.open(function(error, data){
//				mongodb.GridStore.read(dbInstance, fileId, function(err, fileData) {
//					if(error){
//						response.writeHead(400);
//						response.write(error.toString());
//						response.end();
//					} else{
//						if(contentType == 'binary/octet-stream'){
//							response.write(fileData, 'binary');
//							
//							response.end();
//						}else{
//							response.writeHead(200, { 'Content-Type': contentType});
//							if(contentType ='image/png')
//								response.write(fileData, 'base64');
//							else
//								response.write(fileData, 'binary');
//							response.end();							
//						}
//					}
//				});
//			});
			
		}
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
		if(true){
			var bucket = new mongodb.GridFSBucket(dbInstance);
			var downloadStream = bucket.openDownloadStream(fileId);
			
			if(downloadStream){
				var fs = require('fs');
				var stream = fs.createWriteStream(file);
				downloadStream.pipe(stream);
				
				callback(null, {});
			} else
				callback('No downloadstream found.');
		}else{
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
		}
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
	
	var dumptool = options.dumptool||dbConfiguration.dumptool || 'mongodump';
	var dbName = options.dbName || dbConfiguration.dbName;
	var dumpdir = util.getServerPath(options.dumpdir||dbConfiguration.dumpdir||'./dump');
	var dumpfile = options.dumpfile;
	
	var dumpdbdir = dumpdir;// + '/' + dbName;
	
	// check if collection name is mentioned
	if(options.collection){
		dumpdbdir = dumpdbdir + "/" + options.collection;
	}else
		dumpdbdir = dumpdir + '/' + dbName;
	
	util.checkDirSync(dumpdir);
	util.checkDirSync(dumpdbdir);
	
	var cmd = dumptool + " --db " + dbName;
	if(options.collection){
		cmd += ' -c ' + options.collection;
	}
	
	if(dumpdbdir)
		cmd += ' -o ' + dumpdbdir;
	
	var date = new Date();
	
	if(!dumpfile){
		dumpfile = dbName;
		
		if(options.collection){
			dumpfile += '-' + options.collection;
		}
		
		if(!options.excludeTimeStamp){
			var timestamp = date.getDate()  + '-' + date.getMonth()  + '-' + date.getYear() + '-'+ date.getHours() + '-'+ date.getMinutes() + '-' + date.getSeconds();
			
			dumpfile += '-backup_'+timestamp;				
		}	
	}
	
	exec(cmd, function (error, stdout, stderr) {
		if(error && (error+'').indexOf("no collection") == -1){
			console.trace(error);
			callback(error);
		} else {
//			var stream = fs.createWriteStream(dumpdbdir + '/README.txt');
//			
//			stream.once('open', function(fd) {
//				stream.write('/**\n*\n*\nCopyrighted by Simpleportaljs, Misusing of this file may invite legal actions!!\n*\n*\n**/');
//				stream.end();
				
				var cmd_bckup = 'cd ' + dumpdbdir + ' && tar -zcvf ' + dumpdir + '/' + dumpfile + '.tar.gz  * && rm -r '+ dumpdbdir;
				
				var result = {
					mongodump:{stdout : stdout, stderr:stderr}
				};
				
				util.archiveFolder({
					rootdir:dumpdbdir, 
					archive:dumpdir + '/' + dumpfile + '.tar.gz', 
					deleteFolder:true
				}, function(error, stdout, stderr){
					if(error) {
						console.log(stdout);
						console.log(stderr);
						console.log("Some problem while zippping folder - " + error);
					}
					result.zip_archive = {stdout : stdout, stderr:stderr, file:dumpfile, fullpath:dumpdir + '/' + dumpfile + '.tar.gz'}
					
					callback(error, result);
				});
//			});
		}
	});
//		}
//	});
}

/**
 * To restore a database collection from a backup
 * 
 * @method restoreCollection
 * @param {} options database collection options
 * 	- options.filePath - file from which database need to be imported
 *  - options.collectionName - collection to which database need to be imported
 *  - options.dbName - db to which database collecitonneed to be imported
 *  - options.restoredir - Restore directory to which file will be moved and restored to db and collection
 *  
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
		console.error(error);
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
	return ObjectID.createFromHexString(id + ''); /* Alternate is new BSON.ObjectID(id) */
}

/**
 * To form the search parameters from the search object for search api
 * 
 * @method getSearchQuery
 * 
 * @param {} query exisiting search query
 * @param {} searchqueryparams field settings for the search query
 * @param {} request http request
 * @return queryparams
 */
db.getSearchQuery = function(query, modelprops, request){
	var instance = this;
	
	// check it has $match then use body.$match
	var searchquery  = util.getSearchQuery(query, modelprops, request);
	
	return formatSearchQuery(searchquery);
}

function formatSearchQuery(searchquery){
	if(!searchquery)
		return searchquery;
	else{
		for(var field in searchquery){
			// do check the fields come with search formatter for mongo db
			var lastchar = field.substring(field.length-1),
				lasttwochar = field.substring(field.length-2);
			
			if(field == '_id' || "_id>" == field || "_id<" == field || "_id<=" == field || "_id>=" == field){
				if(searchquery[field].indexOf("{") == 0 ){
					searchquery[field] = JSON.parse(searchquery[field]);
					for(var _idquery in searchquery[field]){
						if(typeof searchquery[field][_idquery] != 'object')
							searchquery[field][_idquery] = db.getBSONObjectId(searchquery[field][_idquery]);
					}
				}else
					searchquery[field] = db.getBSONObjectId(searchquery[field]);
			}
			
			if(queryformatter[lasttwochar]){
				var orig_field = field.substring(0, field.length-2);
				searchquery[orig_field] = queryformatter[lasttwochar](orig_field, searchquery[field]);
				
				delete searchquery[field];
			} else if(queryformatter[lastchar]){
				var orig_field = field.substring(0, field.length-1);
				searchquery[orig_field] = queryformatter[lastchar](orig_field, searchquery[field]);
				
				delete searchquery[field];
			} else if( searchquery[field] && typeof searchquery[field] == "string" && searchquery[field].charAt(0) == '%'){// check value starts with
				searchquery[field] = queryformatter['$'](field, searchquery[field].substring(1));
			}  else if( searchquery[field] && typeof searchquery[field] == "string" && searchquery[field].charAt(searchquery[field].length-1) == '%' ){// check value ends with
				searchquery[field] = queryformatter['^'](field, searchquery[field].substring(0, searchquery[field].length-1));
			} else if(queryformatter[field]){
				searchquery[field] = queryformatter[field](field, searchquery[field]);
			} else
				searchquery[field] = searchquery[field];
		}
	}
	
	return searchquery;
}

var queryformatter={
	"$group":function(key, value){
		// process match field
		if(typeof value == 'string' && value.indexOf("{") == 0){
			value = unescape(value);
			
			try{
				value =value.replace(/\'/ig, '"');
				
				valueobject = JSON.parse(value);
			} catch(error){
				console.log(error);
			}
		}else{
			var valueobject = {};
			if(typeof value == 'object')
				valueobject=value;
			else{
				value = unescape(value);
				
				var multiplequery = value.split("&");
				
				for(var m = 0; m < multiplequery.length; m++){
					var queryarray = multiplequery[m].split("=");
					for(var i = 0; i < queryarray.length; i++){
						var field = queryarray[i++];
						valueobject[field]=queryarray[i];
					}
				}
				//valueobject = formatSearchQuery(valueobject);
			}
		}
		
		if(valueobject){
			if(Object.keys(valueobject).length == 1)
				valueobject['count'] = {$sum:1};
		}
		
		if(valueobject["_id"] && valueobject["_id"].indexOf(",") != -1){
			var idfields = valueobject["_id"].split(",");
			
			valueobject["_id"]={};
			
			for(var index in idfields){
				if( index  == 0)
					valueobject["_id"]['x']='$'+idfields[index];
				else if( index  == 1)
					valueobject["_id"]['y']='$'+idfields[index];
				else if( index  == 2)
					valueobject["_id"]['z']='$'+idfields[index];
				else
					valueobject["_id"][idfields[index]]='$'+idfields[index];
			}	
		} else if(valueobject["_id"] && valueobject["_id"].indexOf("$") != 0)
			valueobject["_id"] = "$" + valueobject["_id"];
		//valueobject["_id"]={x:"$Phase",y:"$Countries"};
		
		return valueobject;
	},"$match":function(key, value){
		// process match field
		if(typeof value == 'string' && value.indexOf("{") == 0){
			value = unescape(value);
			
			try{
				value =value.replace(/\'/ig, '"');
				
				valueobject = JSON.parse(value);
			} catch(error){
				console.log(error);
			}
		}else{
			var valueobject = {};
			if(typeof value == 'object')
				valueobject=formatSearchQuery(value);
			else{
				value = unescape(value);
				
				var multiplequery = value.split("&");
				
				for(var m = 0; m < multiplequery.length; m++){
					var queryarray = multiplequery[m].split("=");
					for(var i = 0; i < queryarray.length; i++){
						var field = queryarray[i++];
						valueobject[field]=queryarray[i];
					}
				}
				
				valueobject = formatSearchQuery(valueobject);
			}
		}
		
		return valueobject;
	},"=":function(key, value){
		return value;
	},"!=":function(key, value){
		return {$ne:value};
	},"!":function(key, value){
		return {$ne:value};
	},">":function(key, value){
		return {$gt:value};
	},">=":function(key, value){
		return {$gte:value};
	},"<":function(key, value){
		return {$lt:value};
	},"<=":function(key, value){
		return {$lte:value};
	},"^":function(key, value){// starts with
		return {$regex:new RegExp("^"+value)};
	},"$":function(key, value){// starts with
		return {$regex:new RegExp(value+"$")};
	},"%":function(key, value){
		if(value&& typeof value == 'object' && typeof  value.length == 'number')
			// should use in operation
			return {$in:value};
		else if(value&& value.indexOf(","))
			// should use in operation
			return {$in:value.split(",")};
		else	
			return {$in:[value]};
	},"!%":function(key, value){
		if(value && typeof value == 'object' && typeof value.length == 'number')
			// should use in operation
			return {$nin:value};
		else if(value&& value.indexOf(","))
			// should use in operation
			return {$nin:value.split(",")};
		else	
			return {$nin:[value]};
	}
}

//db.LocalCache = require('./wrapper/localcache').LocalCache;