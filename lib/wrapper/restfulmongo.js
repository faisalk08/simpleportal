var url = require('url');
var dispatch = require('dispatch');

module.exports = function restfulmongo(apiurl) {
	var url_ = [];
	var simpleportal = require("simpleportal");
	
	url_['/api/mongo/((\\w+\)+)/count'] = function(request, response, next, group1, group2, group3) {
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
	}
	
	url_['/api/mongo/((\\w+\/\\w+)+)'] = function(request, response, next, group1, group2, group3) {
		var requesturl = request.url.split('/');
		if(requesturl.length > 4){
			var collection = requesturl[3];
			var id = requesturl[4];
			
			request.url = request.url.replace('/mongo/' + collection , '/mongo/');
			
			var dbid = request.dbid||'default';
			
			var StorageService = simpleportal.Service.StorageService;
			var storageService = new StorageService({dbid:dbid, collectionName:collection});

			var o_id = {id:id}; 
				
			if(id.length == 12 || id.length == 24)
				o_id = {_id:simpleportal.db.getObjectId(id)};
		
			storageService.findOne(o_id, function(error, data){
            	simpleportal.util.sendServiceResponse(response, null ,data);
			});
		}else
			next();
	};
	
	url_['/api/mongo/(\\w+)'] = function(request, response, next, group1, group2, group3) {
		var requesturl = request.url.split('/');
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