/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */
/**
 * Utilities classes 
 *
 * @property util
 * @for simpleportal
 * @type {util}
 * @static
 */

/**
 * Utilities classes 
 * 
 * @class util
 * @module middleware
 * @static
 */
var util = module.exports = {};

var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var url = require('url');

var OAuth = require('oauth').OAuth;

var logger = require("./logger");

/**
 * mime type mapping based on the file extension
 * 
 * @property mimes
 * @type object 
 */
util.mimes = {
    'css':  'text/css',
    'js':   'text/javascript',
    'htm':  'text/html',
    'html': 'text/html',
    'ico':  'image/vnd.microsoft.icon'
};

/**
 * To get Mime type from the file path
 * 
 * @method getMimeType
 * @param {string} file file path with extension
 * 
 * @return mime
 */
util.getMimeType = function(file){
    var tmp     = file.lastIndexOf(".");
    var ext     = file.substring((tmp + 1));
    var mime    = util.mimes[ext];
    
    return mime;
}

/**
 * To call a certain functions from a similar objects
 * 
 * @method callModuleFunctions
 * 
 * @param {} modulestocall
 * @param {} functionName
 * @param {} args
 * @param {} args1
 */
util.callModuleFunctions = function(modulestocall, functionName, args, args1){
	if(modulestocall&&modulestocall.length > 0){
		for(var i =0 ; i< modulestocall.length; i++ ){
			var moduletocall= modulestocall[i];
			
			if(moduletocall[functionName]){
				moduletocall[functionName](args, args1);
			}
		}
	}else if(args1 == 'function')
		args1();
}

/**
 * To get all sub modules inside a module with a certain function
 * 
 * @method getModuleFunctions
 * 
 * @param {object} module Object where the sub modules are searched for 
 * @param {boolean} callChild boolean value whether include deep search
 * @param {string} functionName Function name you want to search inside the sub modules
 * @param {} args
 * @param {} args1
 * 
 * @return modulestocall Array of submodules
 */
util.getModuleFunctions = function(module, callChild, functionName, args, args1){
	var modulestocall=[];
    
	if(module){
        if(typeof module == 'function'){
        } else {
            if(module[functionName]&&typeof module[functionName] == 'function'){
            	modulestocall.push(module);
            }
            if(callChild){
            	for(var function_ in module){
                    if(typeof module[function_] == 'string' || typeof module[function_] == 'function'){
                    } else {
                    	var submodulestocall=util.getModuleFunctions(module[function_], false, functionName, args, args1);
                    	if(submodulestocall&&submodulestocall.length>0){
                    		for(var i in submodulestocall){
                    			modulestocall.push(submodulestocall[i]);
                    		}
                    	}
                    }
                }	
            }
        }
    }
	return modulestocall;
}

/**
 * To call a module function 
 * 
 * @method callModuleFunction
 * @param {object} module Object where the sub modules are searched for 
 * @param {boolean} callChild boolean value whether include deep search
 * @param {string} functionName Function name you want to search inside the sub modules
 * @param {} args
 * @param {} args1
 */
util.callModuleFunction = function(module, callChild, functionName, args, args1){
    var modulestocall=util.getModuleFunctions(module, callChild, functionName, args, args1);
    
    if(modulestocall.length > 1){
    	
    	var totalcallback;
    	if(typeof args1 == 'function'){
        	var count =modulestocall.length;
        	
            var totalcallback = function(){
            	if(count-- == 1)
            		args1();
            };
        }
    	
        util.callModuleFunctions(modulestocall, functionName, args, totalcallback);
    }else if(modulestocall.length == 1)
	    util.callModuleFunctions(modulestocall, functionName, args, args1);
    else if(modulestocall.length == 0&&typeof args1=='function')
	    args1();
};

/**
 * To read a file from the server
 * 
 * Only used for reading file with charset utf8
 * 
 * @method readFile
 * 
 * @param {} file
 * @param {callback} callback The callback to excecute when complete
 * @return 
 */
util.readFile = function(file, callback){
    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            callback('Error while reading --' + err);
        }else
            callback(null, data);
    });
}

/**
 * To write html file in to the http response
 * 
 * @method writeHtml
 * @param {} response Http response
 * @param {} file File to be written in to the response
 */
util.writeHtml = function(response, file){
    var mime = util.getMimeType(file) || 'text/plain';
    
    response.writeHead(200, {'content-type': mime});
    var rs = fs.createReadStream(file);
    
    require('util').pump(rs, response);
}

/**
 * To Make an empty html file
 * 
 * @method makeHTML
 * @param {string} content Html body 
 * @return html Formatted html string
 */
util.makeHTML = function(content){
    var html = '';
    
    html = '<html><head></head><body><div>'+content+'</div></body></html>'
    
    return html;
}

/**
 * To get JSON data from a remote Server
 * 
 * @method getRemoteJSON
 * 
 * @param {} server_options Remote server configuration
 * @param {callback} callback The callback to excecute when complete
 */
function getRemoteJSON(server_options, callback){
    server_options.headers = server_options.headers||{};
    
    server_options.headers['Accept'] = 'application/json';
    if(server_options.secure&&server_options.port&&(Number(server_options.port)) != 443){
    	if((Number(server_options.port) == 80 || server_options.port == 443))
    		server_options.port='443';
    }
    if(server_options.secure){
    	var request = https.request(server_options, function(response) {
	        response.setEncoding('utf8');
	        var content = '';
	        
	        var headers = response.headers;
	        
	        response.on('data', function (chunk) {
	            content += chunk;
	        });
	        
	        response.on('error', function (chunk) {
	        	console.log('Hello there is some error when connecting remotely');
	        });
	        
	        response.on('end', function (chunk) {
	            try{
	            	if(response.statusCode == 200)
		            	if(!content||content == '')
		            		callback(null, {}, headers);
		            	else{
		            		content = JSON.parse(content);
			                callback(null, content, headers);
		            	}
	            	else{
	            		callback(content, {}, headers);
	            	}
	            	/*
	                content = JSON.parse(content);
	                callback(null, content, headers);*/
	            }catch(error){
	                callback(error);
	            }
	        });
	    });	
    }else {
        var request = http.request(server_options, function(response) {
	        response.setEncoding('utf8');
	        var content = '';
	        
	        var headers = response.headers;
	        
	        response.on('data', function (chunk) {
	            content += chunk;
	        });
	        
	        response.on('error', function (chunk) {
	        	console.log('Hello there is some error when connecting remotely');
	        });

	        response.on('end', function (chunk) {
	            try{
	            	if(response.statusCode == 200)
		            	if(!content||content == '')
		            		callback(null, {}, headers);
		            	else{
		            		content = JSON.parse(content);
			                callback(null, content, headers);
		            	}
	            	else{
	            		callback(content, {}, headers);
	            	}/*
	            	
	                content = JSON.parse(content);
	                callback(null, content, headers);*/
	            }catch(error){
	                callback(error);
	            }
	        });
	    });
    }

    request.on('error', function(e) {
    	logger.getInstance().error('Simple Portal-util','problem with request: ' + e.message);
    	callback(e.message);
    });

    request.end();
}

/**
 * To post JSON data to a remote Server
 * 
 * @method postToRemoteJSON
 * 
 * @param {} server_options Remote server configuration
 * @param {callback} callback The callback to excecute when complete
 * @param {} postdata
 */
function postToRemoteJSON(server_options, callback, postdata){
	if(server_options.secure&&server_options.port&&(Number(server_options.port)) != 443){
    	if((Number(server_options.port) == 80 || server_options.port == 443))
    		server_options.port='443';
    }
    
    server_options.headers = server_options.headers||{};
    
    server_options.headers['Accept'] = 'application/json';
    server_options.headers['Content-Type'] = 'application/json';
    var postdata = postdata||server_options.postdata;
    
    delete server_options.postdata;
    
    if (server_options.secure){
    	var request = https.request(server_options, function(response) {
	        response.setEncoding('utf8');
	        var content = '';
	        
	        var headers = response.headers;
	        
	        response.on('data', function (chunk) {
	            content += chunk;
	        });
	        
	        response.on('error', function (chunk) {
	        	console.log('Hello there is some error');
	        });
	        
	        response.on('end', function (chunk) {
	            try{
	            	if(response.statusCode == 200)
		            	if(!content||content == '')
		            		callback(null, {}, headers);
		            	else{
		            		content = JSON.parse(content);
			                callback(null, content, headers);
		            	}
	            	else
	            		callback(content, {}, headers);
	            }catch(error){
	                callback(error);
	            }
	        });
	    });	
    } else{
        var request = http.request(server_options, function(response) {
	        response.setEncoding('utf8');
	        var content = '';
	        
	        var headers = response.headers;
	        
	        response.on('data', function (chunk) {
	            content += chunk;
	        });
	        
	        response.on('error', function (chunk) {
	        	console.log('Hello there is some error');
	        });

	        response.on('end', function (chunk) {

		        try{
		        	if(response.statusCode == 301){
	            		
	            	} else if(response.statusCode == 200)
		            	if(!content||content == '')
		            		callback(null, {}, headers);
		            	else{
		            		content = JSON.parse(content);
			                callback(null, content, headers);
		            	}
	            	else
	            		callback(content, {}, headers);
	            }catch(error){
	                callback(error);
	            }
	        });
	    });	
    }
    
    request.on('error', function(e) {
    	logger.getInstance().error('Simple Portal-util','problem with request: ' + e.message);
    	callback(e.message);
    });

    request.end(postdata);
}

/**
 * To construct a url from Server options
 * 
 * @method constructUrl
 * 
 * @param {} urlOptions JSOn options containing host,port, and other information regarding a server
 * 
 * @return path Formatted url string
 */
util.constructUrl = function(urlOptions){
    var protocol = 'http://'
    
	if(!urlOptions.host)
    	return null;
    
	if(urlOptions.secure) {
    	protocol = 'https://'
    	
		if((Number(urlOptions.port) == 80 || urlOptions.port == 443))
    		urlOptions.port='443';
    }
    
    var host = urlOptions.host;
    var port = urlOptions.port;
    var path = urlOptions.path;
    
    port =  (!port || Number(port) == 80 || Number(port) == 443) ? '' : ':' + port;
    
    path = protocol + host + port + (path ? path : '');
    
    return path;
}

/**
 * To post data to a remote server
 * 
 * @method post
 * @param {} server_options Remote server options
 * @param {} request Http request from the user
 * @param {callback} callback The callback to excecute when complete
 */
util.post = function(server_options, request, callback){
    if(typeof request == 'function'){
        callback = request;
        request = null;
    }
    
    if(request && server_options.oauth){
        if(request.session.oauth && request.session.oauth.loggedIn){
        	var path = util.constructUrl(server_options);
        	
        	if(request.session.oauth.oauthquery){
            	var params = [];
            	for(var i in request.session.oauth.oauthquery){
					var q = request.session.oauth.oauthquery[i];
					
					//if(i.indexOf('oauth_') > -1)
					params.push(i + '=' + q);
				}
            	
            	var url_seperator='&';
                if(server_options.path.indexOf('?') == -1)
                        url_seperator='?';

                if(params.length > 0)
            		server_options.path = server_options.path + url_seperator + params.join('&');
            }else{
            	var oa = new OAuth(request.session.oauth._requestUrl,
    	            request.session.oauth._accessUrl,
    	            request.session.oauth._consumerKey,
    	            request.session.oauth._consumerSecret,
    	            request.session.oauth._version,
    	            request.session.oauth._authorize_callback,
    	            request.session.oauth._signatureMethod
    	        );
                var sign_url = oa.signUrl(path, request.session.oauth.access_token,
                                                request.session.oauth.access_token_secret, (server_options.method||"GET"));
                var parsedUrl= url.parse(sign_url, false );
                server_options.path = parsedUrl.path;
            }
        	
            postToRemoteJSON(server_options, callback);
        } else
            callback(null, {loginRequired:true});
    } else{
    	postToRemoteJSON(server_options, callback);
    }
}

/**
 * To get json data from remote server
 * 
 * @method getJSON
 * @param {} server_options Remote server options
 * @param {} request Http request from the user
 * @param {callback} callback The callback to excecute when complete
 */
util.getJSON = function(server_options, request, callback){
    if(typeof request == 'function'){
        callback = request;
        request = null;
    }
    
    if(request && server_options.oauth){
        if(request.session.oauth && request.session.oauth.loggedIn){
            var path = util.constructUrl(server_options);
            
            if(request.session.oauth.oauthquery){
            	var params = [];
            	for(var i in request.session.oauth.oauthquery){
					var q = request.session.oauth.oauthquery[i];
					
					//if(i.indexOf('oauth_') > -1)
					params.push(i + '=' + q);
				}
            	
            	var url_seperator='&';
                if(server_options.path.indexOf('?') == -1)
                        url_seperator='?';

                if(params.length > 0)
                        server_options.path = server_options.path + url_seperator + params.join('&');
            }else{
            	var oa = new OAuth(request.session.oauth._requestUrl,
    	            request.session.oauth._accessUrl,
    	            request.session.oauth._consumerKey,
    	            request.session.oauth._consumerSecret,
    	            request.session.oauth._version,
    	            request.session.oauth._authorize_callback,
    	            request.session.oauth._signatureMethod
    	        );
        	
            	var sign_url = oa.signUrl(path, request.session.oauth.access_token,request.session.oauth.access_token_secret, "GET");
            	var parsedUrl= url.parse(sign_url, false );
            	server_options.path = parsedUrl.path;
            }
            getRemoteJSON(server_options, callback);
        }else
            callback(null, {loginRequired:true});
    } else{
        getRemoteJSON(server_options, callback);
    }
}

/**
 * To remove html tags from an html text and replaced with escape charectors
 * 
 * @method convertHtmlToText
 * @param {} inputText Text to be formatted
 * @return returnText Formatted text
 */
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


/**
 * To send the response back to user 
 * 
 * @method sendServiceResponse
 * 
 * @param {} response Http response
 * @param {} error Error to be thrown to the response
 * @param {} results Data need to be send to the reponse
 * @param {} headers Response headers
 */
util.sendServiceResponse = function(response, error, results, headers){
	results = results||{};
	var body = JSON.stringify(results);
	headers = headers||{};
	
	if(error && typeof error == 'object' && error+'' =='{}')
		error=null;
	
	if(response.headersSent){
		logger.getInstance().warn('Simple Portal : util : sendServiceResponse', 'Response header for this request is already sendt');
	}else{
		if(error){
			logger.getInstance().error('Simple Portal : util : sendServiceResponse', error);
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
			logger.getInstance().error('Simple Portal : util : sendServiceResponse', error);
			headers['Content-Type'] = 'application/json; charset=UTF-8';
			response.send(403, headers, body);
		} else if(error){
			logger.getInstance().error('Simple Portal : util : sendServiceResponse', error);
			headers['Content-Type'] = 'application/json; charset=UTF-8';
			response.send(400, headers, body);
		} else if(results && results.loginRequired){
			logger.getInstance().error('Simple Portal : util : sendServiceResponse', 'Login required');
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
}


/**
 * To retreive query parameters as a key value pair
 * 
 * @method getParamValues
 * @param {} request http request
 * @return {object} values JSON object with all key value pair
 */
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

/**
 * To make a url query string from the query parameters
 * 
 * @method makeURLString
 * @param {object} queryParams Query parameter as key value pair object
 * @param {string} appendar The appender used for seperating the query parameters
 * @return {string} A formatted url query string
 */
util.makeURLString = function(queryParams, appendar) {
	var queryParams = queryParams||{};
	
	var querystring = [];
	appendar = appendar||'&';
	
	if (queryParams) {
		for (var key in queryParams) {
			var value = queryParams[key];
			if(typeof value == 'object'){
				querystring.push(key + '=' +  util.makeURLString(value, ':'));
			} else if(value != '')
				querystring.push(key + '=' +  value);
		}
	}
	
	return querystring.join(appendar);
}

/**
 * To generate Id from a text
 * 
 * @method generateId
 * @param {} name text which needs to be formatted
 * 
 * @return name Formatted text with all special characters 
 */
util.generateId = function(name) {
	if (name) {
		name = name.replace(/(undefined|null|[^-a-zA-Z0-9]+)/g, '').toLowerCase();
	}
	
	return name;
}

/**
 * To get the array values from a value seperarted by a special charactar
 * 
 * @method getArrayValues
 * @param {} value
 * @param {} seperator
 * @param {} defaultKey
 * @return arrayResult array of values
 */
util.getArrayValues = function(value, seperator, defaultKey) {
	if(!value && value.length == 0)
		return [];
	if(value == '')
		return [];
	if(typeof value == 'array'||(typeof value =='object' && value.length > 0))
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

/**
 * To make folder with parent tree
 * 
 * @method mkdirParent
 * @param {} dirPath
 * @param {} mode
 */
util.mkdirParent = function(dirPath, mode) {
	try{
		fs.mkdirSync(dirPath, mode);
	}catch(error){
		if (error && (error.code === 'ENOENT')) {
			util.mkdirParent(path.dirname(dirPath), mode);
	      	
	    	if(fs.existsSync(path.dirname(dirPath)))
	    		util.mkdirParent(dirPath, mode);
	    }
	}
};

/**
 * To check whether a folder is avaiable if not create the folder
 * 
 * @method checkDirSync
 * @param {} dir
 * @param {callback} callback The callback to excecute when complete
 * @return 
 */
util.checkDirSync = function(dir, callback){
	if (!fs.existsSync(dir)) {
		util.mkdirParent(dir, 0755);
	}
}

/**
 * To check whether a folder is avaiable if not create the folder
 * 
 * @method checkDir
 * @param {string} dir folder need to be checked
 * @param {callback} callback The callback to excecute when complete
 */
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
		logger.getInstance().error('Simple Portal-util', e);
		callback(e);
	}
}

/**
 * To move a file from one location to another
 * 
 * @method moveFile
 * @param {} destdir
 * @param {} destFile
 * @param {} sourceFile
 * @param {callback} callback The callback to excecute when complete
 */
util.moveFile = function(destdir, destFile, sourceFile, callback){
	util.checkDir(destdir, function(error){
		if(error){
			callback(error);
		} else{
			var is = fs.createReadStream(sourceFile)
			var os = fs.createWriteStream(destdir + '/' + destFile);
			is.pipe(os, function(error) {
				callback(error);
			});
		}
	});
}

/**
 * To check whether the value is found in the array
 * 
 * @method arraycontains
 * @param {array} array
 * @param {string} value
 * @return boolean 
 */
util.arraycontains = function(array, value){
	if(!array)
		return false;
	
	for(var i=0; i<array.length; i++) {
        if (array[i] == value) return true;
    }
}

/**
 * To check whether the value is found in the object array
 * 
 * @method arraycontains
 * @param {array} array
 * @param {string} value
 * @return boolean 
 */
util.jsonarraycontains = function(array, key, value){
	if(!array)
		return false;
	
	for(var i=0; i < array.length; i++) {
        if (array[i] && array[i][key] == value) return true;
    }
	
	return false;
}

/**
 * To get the object based on key and field from the json object array
 * 
 * @method getJSONObject
 * @param {array} array
 * @param {string} value
 * @return boolean 
 */
util.getJSONObject = function(array, key, value){
	if(!array)
		return false;
	
	for(var i=0; i<array.length; i++) {
        if (array[i] && array[i][key] == value) return array[i];
    }
	
	return null;
}

/**
 * To clone a javascript object 
 * 
 * @method clone
 * @param {object} o object which needs to be cloned
 * @param {} ignorefunctions boolean value to ignore the attribute which is function
 * @return object cloned object
 */
util.clone = function(o, ignorefunctions) {
	if(o){
		var ret = {};
		
		if(o instanceof Array)
			ret = [];
		
		Object.keys(o).forEach(function (val) {
			if(ignorefunctions&&typeof o[val] == 'function'){}
			else if(typeof o[val] == 'object'){
				ret[val] = util.clone(o[val], ignorefunctions);
			}else
				ret[val] = o[val];
		});
	
		return ret;
	}else
		return o;
}

/**
 * To read a file and parsing as json object
 * 
 * @method readJSONFile
 * @param {string} file file path
 * @return fixedJSON
 */
util.readJSONFile = function(file) {
	var filejson = fs.readFileSync(file) + ''; 
	
	var fixedJSON = null;
	try{
		fixedJSON = JSON.parse(filejson);
	}catch(error){
		var fixedJSON = filejson.replace(/https:/g, 'https_colon_');
		fixedJSON = fixedJSON.replace(/http:/g, 'http_colon_');
		fixedJSON = fixedJSON.replace(/localhost:/g, 'localhost_colon_');
		fixedJSON = fixedJSON.replace(/(['"])?([a-zA-Z0-9_\;\&\.\/]+)(['"])?:/g, '"$2": ');
		fixedJSON = fixedJSON.replace(/http_colon_/g, 'http:');
		fixedJSON = fixedJSON.replace(/https_colon_/g, 'https:');
		fixedJSON = fixedJSON.replace(/localhost_colon_/g, 'localhost:');
		
		fixedJSON = JSON.parse(fixedJSON);
	}
	
	return fixedJSON;
}

/**
 * To extend a json object with another object
 * 
 * @method extendJSON
 * @param {object} target
 * @return target extended json object
 */
util.extendJSON = function(target) {
	var instance = this;
	
	var sources = [].slice.call(arguments, 1);
    sources.forEach(function (source) {
        for (var prop in source) {
        	if( typeof target[prop] == 'object' && typeof source[prop] == 'object')
        		util.extendJSON(target[prop], source[prop]);
        	else
        		target[prop] = source[prop];
        }
    });
    return target;
}

/**
 * To flatten the json object in to one object, with sub keys seperated by the given seperator
 * @method flattenJSON
 * @param data JSON to flatten
 * @param seperator Seperator to use for sub object
 * @return {object} one flattend json object
 */
util.flattenJSON = function(data, seperator){
	var result = {},
		seperator =seperator||'.';
	
    function recurse(cur, prop) {
        if (Object(cur) !== cur) {
            result[prop] = cur;
        } else if (Array.isArray(cur)) {
            for (var i = 0, l = cur.length; i < l; i++)
            recurse(cur[i], prop + "[" + i + "]");
            if (l == 0) result[prop] = [];
        } else {
            var isEmpty = true;
            for (var p in cur) {
                isEmpty = false;
                recurse(cur[p], prop ? prop + seperator + p : p);
            }
            if (isEmpty && prop) result[prop] = {};
        }
    }
    recurse(data, "");
    return result;
}

/**
 * To un-flatten the json object the given seperator
 * @method unFlattenJSON
 * @param data JSON to un-flatten
 * @param seperator Seperator to use for sub object
 * @return {object} one flattend json object
 */
util.unFlattenJSON=function(table, seperator){
	var seperator=seperator||'.',
		result = {};

    for (var path in table) {
        var cursor = result, length = path.length, property = "", index = 0;

        while (index < length) {
            var char = path.charAt(index);

            if (char === "[") {
                var start = index + 1,
                    end = path.indexOf("]", start),
                    cursor = cursor[property] = cursor[property] || [],
                    property = path.slice(start, end),
                    index = end + 1;
            } else if(seperator.length >1){
            	var charsep = char;
            	
            	var k=1;
            	while(k < seperator.length)
            		charsep += path.charAt(index+(k++));
            	
            	var cursor = cursor[property] = cursor[property] || {},
                start = charsep === seperator ? index + seperator.length : index,
                bracket = path.indexOf("[", start),
                dot = path.indexOf(seperator, start);
	
	            if (bracket < 0 && dot < 0) var end = index = length;
	            else if (bracket < 0) var end = index = dot;
	            else if (dot < 0) var end = index = bracket;
	            else var end = index = bracket < dot ? bracket : dot;
	
	            var property = path.slice(start, end);
            }else{
                var cursor = cursor[property] = cursor[property] || {},
                    start = char === seperator ? index + seperator.length : index,
                    bracket = path.indexOf("[", start),
                    dot = path.indexOf(seperator, start);

                if (bracket < 0 && dot < 0) var end = index = length;
                else if (bracket < 0) var end = index = dot;
                else if (dot < 0) var end = index = bracket;
                else var end = index = bracket < dot ? bracket : dot;

                var property = path.slice(start, end);
            }
        }

        cursor[property] = table[path];
    }

    return result[""];
}


/**
 * To delete a folder recursively
 * 
 * @method deleteFolderRecursiveSync
 * @param {} path
 */
util.deleteFolderRecursiveSync = function(path) {
    var files = [];
    
    if( fs.existsSync(path) ) {
        files = fs.readdirSync(path);
        
        files.forEach(function(file,index){
            var curPath = path + "/" + file;
            
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
            	util.deleteFolderRecursiveSync(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        
        fs.rmdirSync(path);
    }
};

/**
 * To get the file path relative to the seevers main process
 * 
 * @method getServerPath
 * 
 * @param {string} path
 * @param {boolean} skipjx
 * @return serverpath path relative to the seevers main process 
 */
util.getServerPath = function(path, skipjx){
	if(path && path != '' && path.indexOf('/') == 0)
		return path;
	else{
		var serverroot = '.';
		if(skipjx||process.mainModule.filename.indexOf('/bin/nodeunit') != -1)
			serverroot =process.env.PWD;
		else if(skipjx||process.mainModule.filename.indexOf('.js.jx') == -1)
			serverroot =process.mainModule.filename.substring(0, process.mainModule.filename.lastIndexOf('/'));
		
		if(path && path != '')
			serverroot = serverroot + '/' + path;
		
		return serverroot;	
	}
}

/**
 * To get the extension of a file from the file path
 * 
 * @method getExtension
 * @param {string} filename 
 * @return extension of the file path mentioned
 */
util.getExtension = function (filename) {
	var i = filename.lastIndexOf('.');
	
    return (i < 0) ? '' : (filename.substr(i)).toLowerCase();
};

/**
 * Description
 * @method capitaliseFirstLetter
 * @param {} string
 * @return BinaryExpression
 */
util.capitaliseFirstLetter = function(string){
	if(!string)
		return string;
	
	return string.charAt(0).toUpperCase() + string.slice(1);
};

/**
 * Description
 * @method lowercaseFirstLetter
 * @param {} string
 * @return BinaryExpression
 */
util.lowercaseFirstLetter = function(string){
	if(!string)
		return string;
	
	return string.charAt(0).toLowerCase() + string.slice(1);
}

/**
 * To download|get the file from a remote url
 * 
 * @method downloadFile
 * @param url Remote URL 
 * @param path File path to save the file
 * @param callback {callback} callback The callback to excecute when complete
 * 
 */
util.downloadFile =  function(url, path, callback) {
	var instance = this;
	
	logger.getInstance().info('Simpleportal:util:downloadFile', 'Downloading file from remote server -- ' + url);
	logger.getInstance().info('Simpleportal:util:downloadFile', 'Downlaoded file will be moved to  -- ' + path);
	
	var http_or_https = require('http');
    if (/^https:\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/.test(url)) {
        http_or_https = require('https');
    }
    
    http_or_https.get(url, function(response) {
        var headers = JSON.stringify(response.headers);
        switch(response.statusCode) {
            case 200:
                var file = fs.createWriteStream(path);
                
                response.on('data', function(chunk){
                    file.write(chunk);
                }).on('end', function(){
                    file.end();
                    callback(null);
                });
                break;
            case 301:
            case 302:
            case 303:
            case 307:
            	util.downloadFile(response.headers.location, path, callback);
                break;
            default:
            	callback(new Error('Server responded with status code ' + response.statusCode));
        }
    })
    .on('error', function(err) {
    	callback(err);
    });
};