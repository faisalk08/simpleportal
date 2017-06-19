"use strict";

var util = require("./../util"),
	DbUtil = require("./../util/db");
//	simpleportal = require("./../simpleportal");

/**
 * @class Service.StorageService
 * 
 * @constructor
 * 
 * @param {object} options Options for the service
 */
var StorageService = module.exports = function(options, serverInstance){
	var instance = this;
	
	instance.dbid = options.dbid||'default';
	instance.collectionName = options.collectionName||'default';
	instance.primaryKey = options.primaryKey;
	
	instance.maxrecords = options.maxrecords||1000;
	
	if(serverInstance)
		instance._serverInstance = serverInstance;
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
	
	if(typeof options == 'function' ){
		callback = options;
		options  = {};
	}
	options = options||{};
	
	if(instance._serverInstance) {
		instance._serverInstance.getDBInstance((options.dbid||instance.dbid), 	callback);
	}else
		DbUtil.getInstance((options.dbid||instance.dbid), callback);
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
	
	if(typeof options == 'function'){
		callback = options;
		options = {};
	}
	
	options = options || {};
	
	instance.getDBInstance(options, function(error, dbInstance){
		if(error) {
//			console.error(error);
			callback(error);
		}else {
			dbInstance.collection(instance.collectionName, function(error, collection) {
				if( error ){
					console.error(error);
					
                	callback(error);
                } else {
    				// now check collection has index if not create the index
                	if(collection && instance.primaryKey && instance.primaryKey != "_id"){
                		var uniqueindex = {};
                		
                		uniqueindex[instance.primaryKey] = 1;
                		collection.indexInformation(function(error, data){
                			if(!error && !data[instance.primaryKey + '_1']){
                				collection.createIndex( uniqueindex, { unique: true } , function(){});                				
                			}
                		});
                	}
                	
                	callback(error, collection);
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
	
	var _id= object._id;
	delete object._id;
	
	var formattedobject = util.formatObject(object, {body:object}, service);
	if(!formattedobject.id)
		formattedobject.id = service.getObjectId(formattedobject);
	
	if(service['afterSave'])
		instance.add_update({id:object.id||_id}, formattedobject, function(error, newobj){
			if(error){
				console.error(error);
				callback(error, newobj);
			} else
    			service.afterSave(error, newobj, callback, options);
		}, service.beforeSave, options);
    else
		instance.add_update({id:object.id||_id}, formattedobject, function(error, newobj){
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
	console.log('Simpleportal -storgaeservice : ' + 're saving the data, incase of any audit field is missing! - ' + service.name);
	
	instance.findAll(function(error, result){
		if(error){
			console.error(error);
		}
		
		if(result && !error){
			var count = result.length;
			var callbackcount = 0;
			result.forEach(function(object){
//				if(callbackcount == 4)
//					callbackcount++;
//				else	
				instance.resaveobject(object, function(error, newobj){
					if(error){
						console.error(error);
					}else
						console.log("Updated object in to db -- " + newobj._id)
						
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
 * @param {} results object as array or single object 
 * @param {callback} callback The callback to execute when complete
 * @param {} options database configuration
 */
StorageService.prototype.save = function(results, callback, options){
	var instance = this;
	options = options||{};
	if(!results){
		console.log('StorageService.save:' + 'No result skipping save!!');
		callback('No result skipping save!!');
	}else {
		var single = true;
		if(results && typeof(results.length) == "undefined"){
			results.created_at = new Date();
			results.ctimestamp = new Date().getTime();
			
			// set the id field also 
			if(instance.primaryKey && instance.primaryKey != "_id" && !results[instance.primaryKey]){
				results.id = instance.getObjectId(results);
			}
			
			try{
				if(results["_id"] && typeof results["_id"] == "string"){
					results["_id"] = DbUtil.getObjectId(results["_id"]);
				}
			}catch(error){
				console.error(error);
				console.log("Not a valid _id - " + results["_id"]);
			}
			
			instance.getCollection(options, function(error, collection){
				if(error){
					console.error(error);
					callback(error);
				} else
					collection.insert(results, function(error, data){
						if(error){
							console.error(error);
						}
						
						if(!error && data && data.ops)
							callback(error, data.ops[0]);
						else if(data && typeof(data.length) == "undefined"){
							callback(error, data);
						} else if(data)
							callback(error, data[0]);
						else 
							callback(error, data);
					});
			});
		}else {
			for( var i = 0; i< results.length; i++ ) {
				var result = results[i];
				result.created_at = new Date();
				results.ctimestamp = new Date().getTime();
				
				// set the id field also 
				if(instance.primaryKey && instance.primaryKey != "_id" && !result[instance.primaryKey]){
					result.id = instance.getObjectId(result);
				}
				
				try{
					if(result["_id"] && typeof result["_id"] == "string"){
						result["_id"] = DbUtil.getObjectId(result["_id"]);
					}
				}catch(error){
					console.error(error);
					
					console.log("Not a valid _id - " + result["_id"]);
				}
			}

			instance.getCollection(options, function(error, collection){
				if(error){
					console.error(error);
					
					callback(error);
				} else
					collection.insert(results, function(error, data){
						if(error){
							console.error(error);
						}
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
StorageService.prototype.find = function(query, callback, options, searchoptions) {
	var instance = this;
	
	options = options||{};
	
	var dboptions = util.extendJSON({}, options);//options||{};
	var searchoptions = util.extendJSON({limit:instance.maxrecords}, searchoptions);
	
	if(dboptions.hasOwnProperty('details'))
		delete dboptions.details;
	if(dboptions.hasOwnProperty('dbid'))
		delete dboptions.dbid;
	
	instance.getCollection(dboptions, function(error, collection){
		if(error)
			callback(error);
		else{
			if(searchoptions && searchoptions.limit)
				if (searchoptions.limit == 'none')
					collection.find(query, dboptions).toArray(callback);
				else if(searchoptions.skip){
					delete query.start;
					
					collection.find(query, dboptions).limit(searchoptions.limit).skip(searchoptions.skip).toArray(callback);
				}else {
					if(instance.totalrecords && instance.totalrecords > searchoptions.limit){
						var resultobject = {info:{count:0}, results:[]};
						
						collection.count(query, function(error, count){
							if(count && count > 0){
								resultobject.info.count = count;
								collection.find(query, dboptions).limit(searchoptions.limit).toArray(function(error, results){
									if(error){
										console.error(error);
									}
									
									resultobject.results = results;
									
									callback(error, resultobject);
								});	
							} else
								callback(error, resultobject);
						});
					}else if(!instance.totalrecords){
						collection.count(query, function(error, count){
							collection.find(query, dboptions).limit(searchoptions.limit).toArray(function(error, results){
								if(error){
									console.error(error);
								}
								
								callback(error, {info:{count:count}, results:results});
							});
						});	
					} else
						collection.find(query, dboptions).limit(searchoptions.limit).toArray(function(error, results){
							if(error){
								console.error(error);
							}
							
							callback(error, {info:{count:instance.totalrecords}, results:results});
						});
				}
			else if(searchoptions && searchoptions.skip)
				collection.find(query, dboptions).skip(searchoptions.skip).toArray(callback);
			else
				collection.find(query, dboptions).toArray(callback);
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
	
	instance.getCollection(dboptions, function(error, collection){
		if(error)
			callback(error);
		else{
			collection.find({}, dboptions).toArray(function(error, results) {
				if(error){
					console.error(error);
				}
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
	
	if(dboptions && dboptions.hasOwnProperty('next') && dboptions.next && Object.keys(query).length == 1){
		var idfield = Object.keys(query)[0];
		query[idfield] = {$gt:query[idfield]};
	}
	
	instance.getCollection(dboptions, function(error, collection){
		if(error)
			callback(error);
		else{
			collection.findOne(query, callback);
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
		if(error ){
			if(callback)callback(error);
		} else {
			collection.remove(query, function(error, removedCount){
				if(error){
					console.error(error);
				}
				
				if(removedCount == 0 && !error)
					error = 'No record deleted!';
				
				if(callback)
					callback(error, removedCount);
			});
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
	var dboptions = util.extendJSON({}, options||{});
	
	instance.getCollection(dboptions, function(error, collection){
		if(error)
			callback(error);
		else{
			// check if the object is already $set or $addToSet
			if(data._id && query._id)
				delete data._id;
			
			var dbsetobject = {$set: data};
			// if there is $unset mentioned then do the same
			if(data['$addToSet'] || data['$unset']){
				dbsetobject=data;
			}else {
				data.modified_at = new Date();
				data.timestamp = new Date().getTime();
			}	
			
			collection.update(query, dbsetobject, {safe:true}, function(error, updateCount, updatedetails){
				if(error){
					console.error(error);
				}
				
				if(updateCount == 0)
					callback({updateCount:updateCount, message : 'No record updated'}, updatedetails);
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
				if(error){
					console.error(error);
				}
				
				callback(error, count);
			});
	});
};


/**
 * To aggregate data
 * 
 * @method aggregate
 * 
 * @param {} aggregate query collection
 * @param {} request http request
 * @param {callback} callback The callback to excecute when complete
 */
StorageService.prototype.aggregate = function(query, callback, options){
	var instance = this;
	options = options||{};
	var dboptions = util.extendJSON({}, options);
	
	// get the field
	
	instance.getCollection(dboptions, function(error, collection){
		if(error)
			callback(error);
		else{
			var pipeline;
			if(query && query.pipeline && typeof query.pipeline.length == "number"){
				pipeline = query.pipeline;
			} else {
				pipeline=[];
				
				var $groupmatch;
				if(query.$match){
					var $match = util.extendJSON(query.$match);
					
					if(query.$match['count']){
						$groupmatch={'count':query.$match['count']};
						delete $match['count'];
						pipeline.push({$match:$match});
					} else
						pipeline.push({$match:$match});
				}
				
				if(query.$group){
					pipeline.push({$group:query.$group});
				}
				
				if($groupmatch)
					pipeline.push({$match:$groupmatch});
				
				if(query.$group && typeof query.$group['_id'] == 'object' && query.$group['_id']['x'] && query.$group['_id']['y']&& query.$group['_id']['z'])
					pipeline.push({$project:{_id_text:{$concat:['$_id.x', ' ', "$_id.y", ' ', "$_id.z"]}, count:1}});
				else if(query.$group && typeof query.$group['_id'] == 'object' && query.$group['_id']['x'] && query.$group['_id']['y'])
					pipeline.push({$project:{_id_text:{$concat:[{"$substr":['$_id.x', 0, -1]}, ' ', {"$substr":['$_id.y', 0, -1]}]}, count:1}});
				else if(query.$group && typeof query.$group['_id'] == 'object' && query.$group['_id']['x'])
					pipeline.push({$project:{_id_text:{$concat:[{"$substr":['$_id.x', 0, -1]}]}, count:1}});
				
				//pipeline.push({$project:{_id:{$concat:['$_id.x', ' old ', "$_id.y"]}, count:1}});
			}
			
			if(typeof pipeline == 'string'){
				pipeline = JSON.parse(pipeline);
			}
			
			collection.aggregate(pipeline, function(error, count) {
				if(error){
					console.error(error);
				}
				
				callback(error, count);
			});	
		}
	});
}

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
		else {
			collection.remove();
			
			instance.totalrecords=0;
			
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
StorageService.prototype.add_update = function(query, object, callback, beforeSave, options, datasource){
	var instance = this;
	
	if(beforeSave){
		beforeSave(object, function(error, object){
			if(error)
				callback(error);
			else
				instance.add_update(query, object, callback, null, options);
		}, options, datasource);
	} else{
		if(query && query.id) {
			if (query.id) {
				if(query.id != object.id) {
					var dbquery={};
					if(query.id.length == 24){
						try{
							dbquery={$or:[{id:object.id}, {_id : DbUtil.getObjectId(query.id)}]};
						}catch(error){
							dbquery={id: query.id};
						}
					}else
						dbquery={id: query.id};
					
					instance.findOne(dbquery, function(err, objectFromDB) {
						if (objectFromDB && objectFromDB._id && object._id && (objectFromDB._id.equals(object._id) || objectFromDB._id == object._id )) {
							delete object._id;
							instance.update({_id: objectFromDB._id}, object, callback, options);
						}else if ((!objectFromDB || objectFromDB == '')||(objectFromDB && objectFromDB._id == query.id)) {
							delete object._id;
							instance.update({id: object.id}, object, callback, options);
						} else {
							callback({id:"A  record with id -" + object.id + " is already exists in our database. Please enter new values."});
						}
					}, options);
				}else{
					var dbquery={};
					if(query.id && typeof query.id == 'string' && query.id.length == 24){
						try{
							dbquery={$or:[{id:object.id}, {_id : DbUtil.getObjectId(query.id)}]};
						}catch(error){
							dbquery={id: query.id};
						}
					}else
						dbquery={id: query.id};
					
					instance.findOne(dbquery, function(err, objectFromDB) {
						if((!objectFromDB || objectFromDB == '')) {
							instance.save(object, function(error, data) {
								if(error){
									console.error(error);
								}
								
								if(!error/*&&!data*/){
									instance.findOne(dbquery, callback);
								}else
									callback(error, data);
							}, options);
						} else if((objectFromDB.id == object.id) || (objectFromDB && objectFromDB._id.equals(object.id) || objectFromDB._id == object.id)) {
							delete object._id;
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
					dbquery={$or:[{id:id}, {_id:DbUtil.getObjectId(id)}]}
				}else
					dbquery={id: id};
				
				instance.findOne(dbquery, function(err, objectFromDB) {
					if((!objectFromDB || objectFromDB == '')) {
						delete object._id;
						
						instance.save(object, function(error, data){
							if(error){
								console.error(error);
							}
							
							if(!error/*&&!data*/){
								instance.findOne(dbquery, callback);
							}else
								callback(error, data);
						}, options);
					} else if ((!objectFromDB || objectFromDB == '') || ( objectFromDB && (objectFromDB._id.equals(object._id) || objectFromDB._id == object.id))) {
						delete object._id;
						instance.update(dbquery, object, callback, options);
					}else {
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
	
	instance.getCollection({}, function(error, collection) {
		if(error)
			callback(error);
		else {
			collection.distinct(field, query, callback);
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
	
	instance.getCollection({}, function(error, collection){
		if(error)
			callback(error);
		else {
			var options = {fields:{}};
				options.fields[field] = 1;
			
			var sort={};
				sort[field]=-1;
			
			options.sort = sort;
			
			collection.findOne({}, options, function(error, data){
				if(data)
					callback(null, data[field]);
				else
					callback(error);
			});
		}
	});
};