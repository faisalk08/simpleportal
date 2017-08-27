"use strict";

/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012-2017 Faisal(admin@simpleportaljs.com)
 *	
 * MIT Licensed
 */
var simpleportal = require('./../simpleportal');
var url = require('url'),
	dispatch = simpleportal.require('dispatch'),
	StorageService=require("./../service/storageservice"),
	util = require("./../util"),
	DbUtil = require("./../util/db");
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
			
			var storageService = new StorageService({dbid:dbid, collectionName:collection});

            storageService.count({}, function(error, data){
            	var result = {count:data||0};
        		
				util.sendServiceResponse(response, error, result);
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
				util.sendServiceResponse(response, error ,duplicates);
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
			
			var storageService = new StorageService({dbid:dbid, collectionName:collection});
			
            storageService.find(query, function(error, result){
            	util.sendServiceResponse(response, error, result);
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
			
			var storageService = new StorageService({dbid:dbid, collectionName:collection});

			var o_id = {id:id}; 
				
			storageService.findOne({id:id}, function(error, data){
				if(error && !result && (id.length == 12 || id.length == 24)){
					try{
						o_id = {_id:DbUtil.getObjectId(id)};
					
						storageService.findOne(o_id, function(error, data){
							util.sendServiceResponse(response, error ,data);
						});
					}catch(error){
						util.sendServiceResponse(response, error ,{});
					}
				}else
					util.sendServiceResponse(response, error ,data);
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
			
			var storageService = new StorageService({dbid:dbid, collectionName:collection});

            storageService.find({}, function(error, data){
				util.sendServiceResponse(response, null ,data);
			});
		}else
			next();
	};
	
	return dispatch(url_);
};