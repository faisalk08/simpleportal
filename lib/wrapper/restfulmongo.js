var url = require('url');
var dispatch = require('dispatch');
var simpleportal = require("./../simpleportal");

/**
 * Simpleportal middleware for accessing the mongo db instance through REST API
 * 
 * @class Restfulmongo
 * @module simpleportal
 * @submodule wrapper
 * 
 * @param {} apiurl api uri for the database access
 * 
 * @return connect#dispatch object for the connect middleware 
 */
module.exports = function restfulmongo(apiurl) {
	var url_ = [];
	
	url_[apiurl + '/mongo/((\\w+\)+)/count'] = function(request, response, next, group1, group2, group3) {
		var requesturl = request.url.split('/');
		if(requesturl.length > 3){
			var collection = requesturl[3];
			
			request.url = request.url.replace('/mongo/' + collection , '/mongo/');
			
			var dbid = request.dbid||'default';
			
			var StorageService = simpleportal.Service.StorageService;
			var storageService = new StorageService({dbid:dbid, collectionName:collection});

            storageService.count({}, function(error, data){
            	var result = {count:data||0};
        		
				simpleportal.util.sendServiceResponse(response, error, result);
			});
		}else
			next();
	};
	
	url_[apiurl + '/mongo/((\\w+\)+)/duplicates'] = function(request, response, next, group1, group2, group3) {
		console.log('Simpleportal -restfulmongo duplicated session being served.')
		var url_ = url.parse(request.url, true);
		var requesturl = url_.pathname.split('/');
		if(requesturl.length > 3){
			var collection = requesturl[3];
			
			request.url = request.url.replace('/mongo/' + collection , '/' +collection);
			var dbid = request.dbid||'default';
			
			var duplcatefield = 'id';
			if(request.query && request.query.id)
				duplcatefield = request.query.id;
			
			var StorageService = simpleportal.Service.StorageService;
			var storageService = new StorageService({dbid:dbid, collectionName:collection});
			query ={};
			query[duplcatefield] = {$exists:true};
			
			var previous;
			var duplicates = [];
            storageService.find(query, function(error, result){
            	if(!error && result)
            		result.forEach( function(current) {
					  if(previous && current[duplcatefield] == previous[duplcatefield]){
						  if(!duplicates[previous]){
							  duplicates.push(previous);  
						  } 
						  
						  duplicates.push(current);
					  }
					  previous = current;
					});
				simpleportal.util.sendServiceResponse(response, error ,duplicates);
			}, {sorting:{sort:[[duplcatefield,1]]}});
		}else
			next();
	};
	
	url_[apiurl + '/mongo/((\\w+\)+)/search'] = function(request, response, next, group1, group2, group3) {
		var url_ = url.parse(request.url, true);
		var requesturl = url_.pathname.split('/');
		if(requesturl.length > 3){
			var collection = requesturl[3];
			
			request.url = request.url.replace('/mongo/' + collection , '/' +collection);
			var dbid = request.dbid||'default';
			
			var duplcatefield = 'id';
			var query = request.query||{};
			
			var StorageService = simpleportal.Service.StorageService;
			var storageService = new StorageService({dbid:dbid, collectionName:collection});
			
            storageService.find(query, function(error, result){
            	simpleportal.util.sendServiceResponse(response, error, result);
			});
		}else
			next();
	};
	
	url_[apiurl + '/mongo/((\\w+\/\\w+)+)'] = function(request, response, next, group1, group2, group3) {
		var url_ = url.parse(request.url, true);
		var requesturl = url_.pathname.split('/');
		if(requesturl.length > 4){
			var collection = requesturl[3];
			var id = requesturl[4];
			
			request.url = request.url.replace('/mongo/' + collection , '/mongo/');
			
			var dbid = request.dbid||'default';
			
			var StorageService = simpleportal.Service.StorageService;
			var storageService = new StorageService({dbid:dbid, collectionName:collection});

			var o_id = {id:id}; 
				
			storageService.findOne({id:id}, function(error, data){
				if(error && !result && (id.length == 12 || id.length == 24)){
					try{
						o_id = {_id:simpleportal.db.getObjectId(id)};
					
						storageService.findOne(o_id, function(error, data){
							simpleportal.util.sendServiceResponse(response, error ,data);
						});
					}catch(error){
						simpleportal.util.sendServiceResponse(response, error ,{});
					}
				}else
					simpleportal.util.sendServiceResponse(response, error ,data);
			});
		}else
			next();
	};
	
	url_[apiurl + '/mongo/(\\w+)'] = function(request, response, next, group1, group2, group3) {
		var url_ = url.parse(request.url, true);
		var requesturl = url_.pathname.split('/');
		if(requesturl.length > 3){
			var collection = requesturl[3];
			
			request.url = request.url.replace('/mongo/' + collection , '/mongo/');
			
			var dbid = request.dbid||'default';
			
			var StorageService = simpleportal.Service.StorageService;
			var storageService = new StorageService({dbid:dbid, collectionName:collection});

            storageService.find({}, function(error, data){
				simpleportal.util.sendServiceResponse(response, null ,data);
			});
		}else
			next();
	};
	
	return dispatch(url_);
};