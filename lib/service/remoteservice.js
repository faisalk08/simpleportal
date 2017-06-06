"use strict";
var util = require("./../util"),
	events = require('events');

/**
 * RemoteService
 * 
 * Servcie wrapper for connecting to remote Service
 * 
 * @class Service.RemoteService
 * @constructor
 * 
 * @param {} service Parent service
 */
var RemoteService = module.exports = function(service){
	var instance = this;
	
	instance.service = service;
	
	events.EventEmitter.call(instance);
    
	return this;
}
require("util").inherits(RemoteService, events.EventEmitter);

/**
 * To add or update record, if the record is available then it will update the record, else it will add a new record
 * 
 * @method add_update
 * @param {} id id ofthe record
 * @param {object} object Object to be saved in to the database
 * @param {} request http request
 * @param {callback} callback The callback to excecute when complete
 * @param {} cache whether to cache the data in to the local database or not
 */
RemoteService.prototype.add_update = function(id, object, request, callback, cache){
	var instance = this;
	instance.service.getLogger().debug('Remoteservice', instance.service.getConfiguration());
//	
	var remoteconfig = util.extendJSON({}, instance.service.getConfiguration("remoteservice"));
//	
//	var path = remoteconfig.search.path;
//	if(remoteconfig.details && remoteconfig.details.path)
//		path = remoteconfig.details.path + '/' + id;
//	
//	if(id){
//        path = path + '/' + id;
//        
//        if(id.indexOf('/') == -1 && remoteconfig.details && remoteconfig.details.sub_path)
//            path = path + '/' + remoteconfig.details.sub_path;
//    }else if(remoteconfig.details && remoteconfig.details.sub_path)
//        path = path + '/' + remoteconfig.details.sub_path;
	var path = remoteconfig.path;
	if(remoteconfig.details && remoteconfig.details.path)
		path = remoteconfig.details.path/* + '/' + id*/;
	else if(remoteconfig.search && remoteconfig.search.path)
		path = remoteconfig.search.path;
	
	if(id) {
        path = path + '/' + id;
        
//        if(id.indexOf('/') == -1 && remoteconfig.details && remoteconfig.details.path)
//            path = path + '/' + remoteconfig.details.path;
//        else 
        if(id.indexOf('/') == -1 && remoteconfig.details && remoteconfig.details.sub_path)
            path = path + '/' + remoteconfig.details.sub_path;
    }
//	else if(remoteconfig.details && remoteconfig.details.path)
//        path = path + '/' + remoteconfig.details.path;
    else if(remoteconfig.details && remoteconfig.details.sub_path)
        path = path + '/' + remoteconfig.details.sub_path;
	
	if(remoteconfig.details && remoteconfig.details.queryparams){
		path += '?' + remoteconfig.details.queryparams;
	}
	
	var server_options = util.copyJSON(
		{
			path: path,
			method:(id ? 'PUT' : 'POST')
		},
		["host", "port", "oauth", "oauthprovider", "secure", "skiplogin"],
		instance.service.getConfiguration()
	);
	
	server_options.postdata = JSON.stringify(object);
	
	instance.post(server_options, request, callback);
}

/**
 * To form the search parameters from the search object for search api
 * 
 * @method searchqueryparams_
 * 
 * @param {} query exisiting search query
 * @param {} request http request
 * @return queryparams
 * 
 * @private
 */
RemoteService.prototype.searchqueryparams_ = function(query, request){
	var instance = this;
	
	var params = util.extendJSON(instance.service.searchqueryparams||{}, instance.service.getConfiguration("remoteservice").search ? instance.service.getConfiguration("remoteservice").search.queryparams||{} : {});
	
	var queryfields = [];
	if(params){
		for(var param in params){
			var fields = params[param];
			if(!fields || fields == ''){
				queryfields.push({field:param, remotefield:param});
			}else{
				queryfields.push({field:param, remotefield:fields});
			}
		}
	}
	
	var queryparams =[];
	var urlquery = util.extendJSON({}, query);
	
	if(queryfields && request.query)
		for(var querfield in queryfields){
			var field = queryfields[querfield];
			
			if(!urlquery[field.field] && request.query[field.field] && request.query[field.field] != ''){
				urlquery[field.remotefield]=request.query[field.field];
			}
		}
	
	// to convert the json object in to a url query parameters
	function jsonToQueryString(json) {
	    return Object.keys(json).map(function(key) {
	            return encodeURIComponent(key) + '=' +
	                encodeURIComponent(json[key]);
	        }).join('&');
	}
	
	// to update the pagination from the known page limit and length field
	function updatePagination(json, key, srcindex, srclength) {
		if(params.hasOwnProperty(key) && !urlquery.hasOwnProperty(key) && !urlquery[key]){
			var length = Number((request.query?request.query[srclength||'page_limit']:10)||10);
			var index =  Number((request.query?request.query[srcindex||'page']:10)||1);
			
			if(length > 0 && index > 0){
				json['start'] = length*(index-1);
				json['end'] = length*(index-1) + length;
			}
		}
	}
	
	// using select2 arguments by default
	updatePagination(urlquery, 'start');
	
	return jsonToQueryString(urlquery);
}

/**
 * To get the search parameters as JSON object
 * 
 * @method searchqueryparamsAsJSON
 * 
 * @param {} query search query object
 * @param {} request http request
 * 
 * @return queryparams JSON object with search parameters
 * @private
 */
RemoteService.prototype.searchqueryparamsAsJSON = function(query, request){
	var instance = this;
	
	var params = instance.service.getConfiguration("search").queryparams||instance.service.searchqueryparams;
	
	var queryfields = [];
	if(params){
		for(var param in params){
			var fields = params[param];
			if(!fields || fields == ''){
				queryfields.push({field:param, remotefield:param});
			}else{
				queryfields.push({field:param, remotefield:fields});
			}
		}
	}
	
	var queryparams = {};
	if(queryfields && request.query)
		for(var querfield in queryfields){
			var field = queryfields[querfield];
			
			if(request.query[field.field] && request.query[field.field] != ''){
				queryparams[field.remotefield] = request.query[field.field];
			}
		}
	if(query){
		for(var q in query)
			queryparams[q] = query[q];
		
	}
	return queryparams;
}

/**
 * To get the server options for sending to the remote server request
 * 
 * @method search_remoteoptions
 * 
 * @param {} query uery parameters to include
 * @param {} request http request
 * 
 * @return server_options fromatted server options
 * @private
 */
RemoteService.prototype.search_remoteoptions = function(query, request){
	var instance = this;

	var remoteconfig=util.extendJSON({}, instance.service.getConfiguration("remoteservice"));
	
	var path = remoteconfig.path;
	if(remoteconfig.search && remoteconfig.search.path)
		path = remoteconfig.search.path;
	
	// To pass remote server path , after setting path remove path variable
	if(query && query.path){
		path = query.path;
		delete query.path;
	}	

	// incase to fetch using sub path
	if(query && query.sub_path){
		path = path + '/' + query.sub_path;
		
		delete query.sub_path;
	}else if(remoteconfig.search && remoteconfig.search.sub_path)
		path = path + '/' + remoteconfig.search.sub_path;
	
	var querystring;
	if(remoteconfig.search && remoteconfig.search.query)
		query = util.extendJSON(query, remoteconfig.search.query);
	
	var queryparams = instance.searchqueryparams_(query, request);
	
	if(queryparams && typeof queryparams == 'Array')
		querystring = queryparams.join('&');
	else if(queryparams && typeof queryparams == 'string')
		querystring = queryparams;
	
	if(querystring && path.indexOf('?') == -1)
		path = path + '?' + querystring;
	else if(querystring)
		path = path + '&' + querystring;
	
	//var server_options = util.extendJSON({}, instance.serveroptions, {path:path});
	
	var server_options = util.copyJSON(
		{
			path: path
		},
		["host", "port", "oauth", "oauthprovider", "secure", "skiplogin"],
		remoteconfig
	);
	
	return server_options;
}

/**
 * To search for records 
 * 
 * @method search
 * 
 * @param {} query search query
 * @param {} request http request
 * @param {callback} callback The callback to excecute when complete
 * @param {} cache Whether to cache the record in to the local database or not
 * @return 
 */
RemoteService.prototype.search = function(query, request, callback, cache){
	var instance = this;
	
	var headers;
	if(query.headers){
		headers = query.headers; 
		delete query.headers;
	}
	
	var server_options = instance.search_remoteoptions(query, request);
	
	if(headers)
		server_options.headers = headers;
	
//	if(server_options.oauthprovider)
//		instance.service.getServerInstance().getRouter("oauthloader").getOauthProvider(server_options.oauthprovider).getJSON(server_options, request, callback);
//	else
	instance.getJSON(server_options, request, callback);
}


/**
 * To search for records 
 * 
 * @method search
 * 
 * @param {} query search query
 * @param {} request http request
 * @param {callback} callback The callback to excecute when complete
 * @param {} cache Whether to cache the record in to the local database or not
 * @return 
 */
RemoteService.prototype.count = function(query, request, callback, cache){
	var instance = this;
	
	if(!instance.service.getConfiguration("count") || !instance.service.getConfiguration("count").path)
		query.sub_path ="count";
	
	var server_options = instance.search_remoteoptions(query, request);
	
//	if(server_options.oauthprovider)
//		instance.service.getServerInstance().getRouter("oauthloader").getOauthProvider(server_options.oauthprovider).getJSON(server_options, request, callback);
//	else
	instance.getJSON(server_options, request, callback);
}

/**
 * To ge the details of a record from the remote server
 * @method details
 * 
 * @param {} id id of the object
 * @param {} request http request
 * @param {callback} callback The callback to excecute when complete
 * @param {} cache Whether to cache the record in to the local database or not
 * @return 
 */
RemoteService.prototype.details = function(id, request, callback, cache){
	var instance = this;
	
	var remoteconfig=util.extendJSON({}, instance.service.getConfiguration("remoteservice"));
	
	var path = remoteconfig.path;
	if(remoteconfig.details && remoteconfig.details.path)
		path = remoteconfig.details.path/* + '/' + id*/;
	else if(remoteconfig.search && remoteconfig.search.path)
		path = remoteconfig.search.path;
	
	if(id){
        path = path + '/' + id;
        
//        if(id.indexOf('/') == -1 && remoteconfig.details && remoteconfig.details.path)
//            path = path + '/' + remoteconfig.details.path;
//        else 
        if(id.indexOf('/') == -1 && remoteconfig.details && remoteconfig.details.sub_path)
            path = path + '/' + remoteconfig.details.sub_path;
    }
//	else if(remoteconfig.details && remoteconfig.details.path)
//        path = path + '/' + remoteconfig.details.path;
    else if(remoteconfig.details && remoteconfig.details.sub_path)
        path = path + '/' + remoteconfig.details.sub_path;
	
	if(remoteconfig.details && remoteconfig.details.queryparams){
		path += '?' + remoteconfig.details.queryparams;
	}
	
	var server_options = util.copyJSON(
		{
			path: path
		},
		["host", "port", "oauth", "oauthprovider", "secure", "skiplogin"],
		remoteconfig
	);
	
	instance.service.getLogger().debug('Remoteservice:details', 'Getting details from remote server.');
	instance.service.getLogger().debug('Remoteservice:details', server_options);
	
	instance.getJSON(server_options, request, callback);
}

/**
 * To remove a record from the remote server
 * 
 * @method remove
 * @param {} id id of the record
 * @param {} request http request
 * 
 * @param {callback} callback The callback to excecute when complete
 */
RemoteService.prototype.remove = function(id, request, callback){
	var instance = this;
	
	var path = instance.service.getConfiguration("search").path;
	if(instance.service.getConfiguration("details") && instance.service.getConfiguration("details").path)
		path = instance.service.getConfiguration("details").path;
	
	if(id){
        path = path + '/' + id;
        
        if(instance.service.getConfiguration("details") && instance.service.getConfiguration("details").path){}
        else if(id.indexOf('/') == -1 && instance.service.getConfiguration("details") && instance.service.getConfiguration("details").sub_path)
            path = path + '/' + instance.service.getConfiguration("details").sub_path;
    }else if(instance.service.getConfiguration("details") && instance.service.getConfiguration("details").sub_path)
        path = path + '/' + instance.service.getConfiguration("details").sub_path;
	
	var server_options = util.copyJSON(
		{
			path: path,
			method:'DELETE'
		},
		["host", "port", "oauth", "oauthprovider", "secure", "skiplogin"],
		instance.service.getConfiguration()
	);
	
	instance.service.getLogger().debug('Remoteservice:remove', 'Getting details from remote server.');
	instance.service.getLogger().debug('Remoteservice:remove', server_options);
	
	instance.post(server_options, request, callback);
};

RemoteService.prototype.getRemoteServiceUrl = function(subpath){
	var instance = this;
	
	var remoteconfig = util.extendJSON({}, instance.service.getConfiguration("remoteservice"));
	if(remoteconfig.oauthprovider){
		var url = instance.service.getServerInstance().getRouter("oauthloader").getOauthProvider(remoteconfig.oauthprovider).getUrl();
		return util.appendFilePath(url, subpath);
	} else //@TODO set the remote url if not by oauth provider
		return subpath;
}


/**
 * Primary method for handling remote fetch 
 */
RemoteService.prototype.getJSON = function(server_options, request, callback){
	var instance = this;
	
	if(server_options.oauthprovider)
		instance.service.getServerInstance().getRouter("oauthloader").getOauthProvider(server_options.oauthprovider).getJSON(server_options, request, function(err, results){
			if(err){
				instance.service.getLogger().warn('RemoteService:getJSON', err);
				callback(err);
			} else{
				callback(err, results);
			}
		});
	else
		util.getJSON(server_options, request, function(err, results){
			if(err){
				instance.service.getLogger().warn('RemoteService:getJSON', err);
				callback(err);
			} else{
				callback(err, results);
			}
		});
}

/**
 * Primary method for handling remote fetch 
 */
RemoteService.prototype.post = function(server_options, request, callback){
	var instance = this;
	
	server_options.method = 'POST'
	if(server_options.oauthprovider)
		instance.service.getServerInstance().getRouter("oauthloader").getOauthProvider(server_options.oauthprovider).post(server_options, request, function(err, results){
			if(err){
				instance.service.getLogger().warn('RemoteService:post', err);
				callback(err);
			} else{
				callback(err, results);
			}
		});
	else
		util.post(server_options, request, function(err, results){
			if(err){
				instance.service.getLogger().warn('RemoteService:post', err);
				callback(err);
			} else{
				callback(err, results);
			}
		});
}