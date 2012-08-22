/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var util = module.exports = {};

var fs = require('fs');
var http = require('http');
var url = require('url');

var OAuth = require('oauth').OAuth;
var logger = require("./logger").getInstance();

util.mimes = {
    'css':  'text/css',
    'js':   'text/javascript',
    'htm':  'text/html',
    'html': 'text/html',
    'ico':  'image/vnd.microsoft.icon'
};

util.getMimeType = function(file){
    var tmp     = file.lastIndexOf(".");
    var ext     = file.substring((tmp + 1));
    var mime    = mimes[ext];
    
    return mime;
}

util.callModuleFunction = function(module, callChild, functionName, args, args1){
    if(module){
        if(typeof module == 'function'){
        } else {
            if(module[functionName]){
            	module[functionName](args, args1);
            }
            if(callChild){
            	for(var function_ in module){
                    if(typeof module[function_] == 'string' || typeof module[function_] == 'function'){
                    } else {
                            util.callModuleFunction(module[function_], false, functionName, args, args1);
                    }
                }	
            }
        }
    }
}

util.readFile = function(file, callback){
    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            callback('Error while reading --' + err);
        }else
            callback(null, data);
    });
}

util.writeHtml = function(response, file){
    var mime = getMimeType(file) || 'text/plain';
    
    response.writeHead(200, {'content-type': mime});
    var rs = fs.createReadStream(file);
    util.pump(rs, response);
}

util.makeHTML = function(content){
    var html = '';
    html = '<html><head></head><body><div>'+content+'</div></body></html>'
    return html;
}

function getRemoteJSON(server_options, callback){
    server_options.headers = server_options.headers||{};
    
    server_options.headers['Accept'] = 'application/json';
    
    var request = http.request(server_options, function(response) {
        response.setEncoding('utf8');
        var content = '';
        
        var headers = response.headers;
        
        response.on('data', function (chunk) {
            content += chunk;
        });
        
        response.on('end', function (chunk) {
            try{
                content = JSON.parse(content);
                callback(null, content, headers);
            }catch(error){
                callback(error);
            }
        });
    });

    request.on('error', function(e) {
    	logger.error('Simple Portal-util','problem with request: ' + e.message);
    	callback(e.message);
    });

    request.end();
}

util.constructUrl = function(urlOptions){
    var protocol = 'http://'
    if(urlOptions.secure){
            protocol = 'https://'
    }
    
    var host = urlOptions.host;
    var port = urlOptions.port;
    var path = urlOptions.path;
    
    port =  (Number(port) == 80 || port == 443) ? '' : ':' + port;
    
    path = protocol + host + port + (path ? path : '');
    
    return path;
}

util.getJSON = function(server_options, request, callback){
    if(typeof request == 'function'){
        callback = request;
        request = null;
    }
    
    if(request && server_options.oauth){
        if(request.session.oauth && request.session.oauth.loggedIn){
            var oa = new OAuth(request.session.oauth._requestUrl,
            request.session.oauth._accessUrl,
            request.session.oauth._consumerKey,
            request.session.oauth._consumerSecret,
            request.session.oauth._version,
            request.session.oauth._authorize_callback,
            request.session.oauth._signatureMethod
        );
            var path = util.constructUrl(server_options);
            var sign_url = oa.signUrl(path, request.session.oauth.access_token,
                                            request.session.oauth.access_token_secret, "GET");
            var parsedUrl= url.parse(sign_url, false );
            server_options.path = parsedUrl.path;
            
            getRemoteJSON(server_options, callback);
        } else
            callback(null, {loginRequired:true});
    } else{
        getRemoteJSON(server_options, callback);
    }
}

util.convertHtmlToText = function(inputText) {
    var returnText = "" + inputText;

    //-- remove BR tags and replace them with line break
    returnText=returnText.replace(/<br>/gi, "\n");
    returnText=returnText.replace(/<br\s\/>/gi, "\n");
    returnText=returnText.replace(/<br\/>/gi, "\n");

    returnText=returnText.replace(/(?:(?:\r\n|\r|\n)\s*){2,}/gim, "\n\n");

    //-- get rid of more than 2 spaces:
    returnText = returnText.replace(/ +(?= )/g,'');

    //-- get rid of html-encoded characters:
    returnText=returnText.replace(/&nbsp;/gi," ");
    returnText=returnText.replace(/&amp;/gi,"&");
    returnText=returnText.replace(/&quot;/gi,'"');
    returnText=returnText.replace(/&lt;/gi,'<');
    returnText=returnText.replace(/&gt;/gi,'>');

    //-- return
    return returnText;
}


util.sendServiceResponse = function(response, error, results, headers){
	results = results||{};
	var body = JSON.stringify(results);
	headers = headers||{};
	
	if(error){
		logger.error('Simple Portal -service - util', error);
		body = JSON.stringify({exception:error});
	} else if(results && results.contentType){
		body = JSON.stringify(results.data);
	}
	
	if(response.callback){
		body = response.callback.replace(/[^\w$.]/g, '') + '(' + body + ');';
		results.contentType = 'text/javascript';
		headers['Content-Type'] = 'text/javascript';
	}

	if(error && error == 'Permission denied'){
		logger.error('Simple Portal -service - util', error);
		headers['Content-Type'] = 'application/json; charset=UTF-8';
		response.send(403, headers, body);
	} else if(error){
		logger.error('Simple Portal -service - util', error);
		headers['Content-Type'] = 'application/json; charset=UTF-8';
		response.send(400, headers, body);
	} else if(results && results.loginRequired){
		logger.error('Simple Portal -service - util', 'Login required');
		var httpstatus = 301;
		if(results.httpstatus)
			httpstatus = results.httpstatus;
		headers['Location'] = '/oauth/login';
		
		response.send(httpstatus, headers);
	} else if(results && results.redirectUrl){
		var httpstatus = 301;
		if(results.httpstatus)
			httpstatus = results.httpstatus;
		headers['Location'] = results.redirectUrl;
		response.send(httpstatus, headers);
	} else if(results && results.contentType){
		headers['Content-Type'] = results.contentType;
		response.send(200, headers, body);
	} else {
		headers['Content-Type'] = 'application/json; charset=UTF-8';
		
		response.send(200, headers, body);
	}
}


util.getParamValues = function(request) {
	var parsedUrl= url.parse(request.url, false);
	var queryParam = parsedUrl.query;
	
	var values = {};
	
	if (queryParam) {
		var params = queryParam.split('&');
		
		for (i = 0; i < params.length; i++) {
			var key_value = params[i].split('=');
			
			if (key_value.length > 1) {
				values[key_value[0]] = key_value[1];
			}
		}
	}
	
	return values;
}

util.generateId = function(name) {
	if (name) {
		name = name.replace(/(undefined|null|[^a-zA-Z0-9ŠšŸ§]+)/g, '').toLowerCase();
		//logger.info('Simple Portal -service - util', 'Util generate id is : '+ name);
	}
	
	return name;
}

util.getArrayValues = function(value, seperator, defaultKey) {
	if(!value && value.length == 0)
		return [];
	if(value == '')
		return [];
	if(typeof value == 'array')
		return value;
	
	value = String(value);
	var arrayString = value.split(seperator || ",");
	var arrayResult = new Array();
	
	for (i=0; i < arrayString.length; i++) {
		if (defaultKey || defaultKey != null) {
			var tempValue = {};
			tempValue[defaultKey] = arrayString[i].trim();
			arrayResult.push(tempValue);
		} else {
			var val = arrayString[i].trim();
			if(val != '')
				arrayResult.push(arrayString[i].trim());
		}
	}
	
	return arrayResult;
}

util.checkDir = function(dir, callback){
	try {
		fs.lstat(dir, function(err, stats) {
			if (!err && stats.isDirectory()) {
				callback();
			} else{
				fs.mkdir(dir, 0755, function (err) {
					callback(err);
				});
			}
		});
	} catch (e) {
		logger.error('Simple Portal-util', e);
		callback(e);
	}
}

util.moveFile = function(destdir, destFile, sourceFile, callback){
	util.checkDir(destdir, function(error){
		if(error){
			callback(error);
		} else{
			var is = fs.createReadStream(sourceFile)
			var os = fs.createWriteStream(destdir + '/' + destFile);
			require('util').pump(is, os, function(error) {
				callback(error)
			});
		}
	});
}

util.arraycontains = function(array, value){
	if(!array)
		return false;
	for(var i=0; i<array.length; i++) {
        if (array[i] == value) return true;
    }
}

util.clone = function(o) {
	var ret = {};
	Object.keys(o).forEach(function (val) {
		ret[val] = o[val];
	});
	return ret;
}
