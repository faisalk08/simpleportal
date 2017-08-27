"use strict";
/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal
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

var fs = require('fs'),
	path = require('path'),
	http = require('http'),
	https = require('https'),
	url = require('url'),
	crypto = require('crypto'), 
	exec = require('child_process').exec,
	OAuth = require('oauth').OAuth,
	Dataformatter=require('./util/dataformatter'),
	Dbutil=require('./util/db');

/**
 * mime type mapping based on the file extension
 * 
 * @property mimes
 * @type object 
 */
util.mimes = {
	'csv':  'text/csv',
	'css':  'text/css',
    'js':   'text/javascript',
    'htm':  'text/html',
    'html': 'text/html',
    'ico':  'image/vnd.microsoft.icon',
	'png':  'image/png'	
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
	if(!file)
		return null;
	else{
		var tmp     = file.lastIndexOf(".");
	    var ext     = file.substring((tmp + 1)).replace(".ejs", "");
	    
	    var mime    = util.mimes[ext];
	    
	    return mime;
	}
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
                    	if(function_ != "_serverInstance" && function_ != "serverInstance"){
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
    		var count = modulestocall.length;
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
    rs.pipe(response);
//    require('util').pump(rs, response);
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
    
    if(!server_options.headers || !server_options.headers['Accept'])
    	server_options.headers['Accept'] = 'application/json';
    
    if(server_options.secure && server_options.port && (Number(server_options.port)) != 443){
    	if((Number(server_options.port) == 80 || server_options.port == 443))
    		server_options.port='443';
    }
    
    if(server_options.port && server_options.host && server_options.host.indexOf(":") != -1)
    	server_options.hostname = server_options.host = server_options.host.substring(0, server_options.host.indexOf(":"))
    
    if(server_options.secure) {
    	var request = https.request(server_options, function(response) {
	        response.setEncoding('utf8');
	        var content = '';
	        
	        var headers = response.headers;
	        
	        response.on('data', function (chunk) {
	            content += chunk;
	        });
	        
	        response.on('error', function (chunk) {
	        	console.error('ERROR: Someproblem while fetching data from remote server - ' + server_options.path);
	        });
	        
	        response.on('end', function (chunk) {
	            try{
	            	if(response.statusCode == 200)
		            	if(!content || content == '')
		            		callback(null, {}, headers);
		            	else{
		            		// check content type
		            		if(response.headers && response.headers["content-type"] && response.headers["content-type"].indexOf('text/html;') != -1){
	            				//content = JSON.parse(content);
		            		}else {
		            			if(typeof content == 'string')
		            				content = JSON.parse(content);
		            		}
		            		
		            		callback(null, content, headers);
		            	}
	            	else{
	            		callback(content, {}, headers);
	            	}
	            }catch(error){
	            	console.trace(error);
	                callback(error);
	            }
	        });
	    });
//    	request.set
    }else {
        var request = http.request(server_options, function(response) {
	        response.setEncoding('utf8');
	        var content = '',
	        	errormessage = '';
	        
	        var headers = response.headers;
	        
	        response.on('data', function (chunk) {
	            content += chunk;
	        });
	        
	        response.on('error', function (chunk) {
	        	errormessage+= chunk;
	        	console.error('ERROR: Some problem while fetching data from remote server - ' + server_options.path);
	        });

	        response.on('end', function (chunk) {
	            try{
	            	if(response.statusCode == 200)
		            	if(!content || content == '')
		            		callback(null, {}, headers);
		            	else{
		            		if(response.headers && response.headers["content-type"] && response.headers["content-type"].indexOf('text/html;') != -1){
	            				//content = JSON.parse(content);
		            		}else {
		            			if(typeof content == 'string')
		            				content = JSON.parse(content);
		            		}
//		            		content = JSON.parse(content);
		            		
			                callback(null, content, headers);
		            	}
	            	else {
	            		callback(errormessage, content, headers);
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
    	console.error('Simple Portal-util','problem with request: ' + e.message);
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
	
	if(server_options.secure && server_options.port && (Number(server_options.port)) != 443){
    	if((Number(server_options.port) == 80 || server_options.port == 443))
    		server_options.port='443';
    }else if (server_options.secure && !server_options.port)
    	server_options.port='443';
	
    server_options.headers = server_options.headers||{};
    
    server_options.headers['Accept'] = 'application/json';
    server_options.headers['Content-Type'] = 'application/json';
    
    var postdata = postdata||server_options.postdata;
    
    if(postdata && typeof postdata == 'object')
    	postdata = JSON.stringify(postdata);
    
    delete server_options.postdata;
    
    var request;
    if (server_options.secure){
    	request = https.request(server_options, function(response) {
	        response.setEncoding('utf8');
	        var content = '';
	        
	        var headers = response.headers;
	        
	        response.on('data', function (chunk) {
	            content += chunk;
	        });
	        
	        response.on('error', function (chunk) {
	        	console.error('ERROR: Some problem while fetching data from remote server - ' + server_options.path);
	        });
	        
	        response.on('end', function (chunk) {
	            try{
	            	console.log("back from server -->" + response.statusCode);
            		
            		if(response.statusCode == 200){
		            	if(!content || content == '')
		            		callback(null, {}, headers);
		            	else{
		            		
		            		content = JSON.parse(content);
			                
		            		callback(null, content, headers);
		            	}
	            	} else
	            		callback(content, {}, headers);
	            }catch(error){
	                callback(error);
	            }
	        });
	    });	
    } else {
        request = http.request(server_options, function(response) {
	        response.setEncoding('utf8');
	        var content = '';
	        
	        var headers = response.headers;
	        
	        response.on('data', function (chunk) {
	            content += chunk;
	        });
	        
	        response.on('error', function (chunk) {
	        	console.error('ERROR: Some problem while fetching data from remote server - ' + server_options.path);
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
    
    if(request){
    	request.on('error', function(e) {
        	console.error('Simple Portal-util','problem with request: ' + e.message);
        	callback(e.message);
        });

        request.end(postdata);
    }
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
   
    if(path && (path.indexOf("http://") != -1 || path.indexOf("https://") != -1)){}else
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
 * @param {} oauthdata oauth object for multiple oauth providers
 */
util.post = function(server_options, request, callback, oauthdata){
    if(typeof request == 'function'){
        callback = request;
        request = null;
    }
    
    if(request && server_options.oauthprovider && !oauthdata){
    	var userprofile = request.getUserprofile();
    	
    	if(server_options.oauthprovider && server_options.skiplogin){
    		var simpleportaloauth = simpleportalOAuth.getSimplePortalOAuth(server_options.oauthprovider);
    		
    		if(simpleportaloauth){
    			simpleportaloauth.post(server_options, request, callback);
    		} else
    			callback('Not a valid oauth provider, check your oauth configuration');	
    	} else if(userprofile && userprofile.oauth && userprofile.oauth[server_options.oauthprovider]){
    		var simpleportaloauth = simpleportalOAuth.getSimplePortalOAuth(server_options.oauthprovider);
    		
    		if(simpleportaloauth){
    			simpleportaloauth.post(server_options, request, callback, userprofile.oauth[server_options.oauthprovider]);
    		} else
    			callback('Not a valid oauth provider, check your oauth configuration');
    	}  else if(userprofile){
    		var simpleportaloauth = simpleportalOAuth.getSimplePortalOAuth(server_options.oauthprovider);
    		
    		if(simpleportaloauth){
    			simpleportaloauth.post(server_options, request, callback);
    		} else
    			callback('Not a valid oauth provider, check your oauth configuration');
    	}else
            callback('No valid oauth token for accessing the remote server - ' + server_options.oauthprovider, {loginRequired:true});
    	
//    	
//    	if(server_options.oauthprovider && server_options.skiplogin){
//    		var simpleportaloauth = simpleportalOAuth.getSimplePortalOAuth(server_options.oauthprovider);
//    		
//    		if(simpleportaloauth){
//    			simpleportaloauth.post(server_options, request, callback, {});
//    		} else
//    			callback('Not a valid oauth provider, check your oauth configuration');	
//    	}else{
//    		var userprofile = request.getUserprofile();
////    		var userprofile = request.session.userprofile||request.userprofile;
//        	
//        	if(userprofile&&userprofile.oauth&&userprofile.oauth[server_options.oauthprovider]){
//        		var simpleportaloauth = simpleportalOAuth.getSimplePortalOAuth(server_options.oauthprovider);
//        		
//        		if(simpleportaloauth){
//        			simpleportaloauth.post(server_options, request, callback, userprofile.oauth[server_options.oauthprovider]);
//        		} else
//        			callback('Not a valid oauth provider, check your oauth configuration');
//        	} else
//                callback('No valid oauth token for accessing the remote server - ' + server_options.oauthprovider, {loginRequired:true});	
//    	}
    }else if(server_options.oauthprovider && server_options.skiplogin){
		var path = util.constructUrl(server_options);
        
		postToRemoteJSON(server_options, callback);
	} else if(request && server_options.oauth){
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
                if(server_options.path.indexOf('?') == -1) url_seperator='?';

                if(params.length > 0)
            		server_options.path = server_options.path + url_seperator + params.join('&');
            }else if(oauthdata){
            	var oa = new OAuth(oauthdata._requestUrl,
        			oauthdata._accessUrl,
        			oauthdata._consumerKey,
        			oauthdata._consumerSecret,
        			oauthdata._version,
        			oauthdata._authorize_callback,
        			oauthdata._signatureMethod
    	        );
                var sign_url = oa.signUrl(path, oauthdata.access_token, oauthdata.access_token_secret, (server_options.method||"POST"));
                var parsedUrl= url.parse(sign_url, false );
                
                server_options.path = parsedUrl.path;
            }else{
            	var oa = new OAuth(request.session.oauth._requestUrl,
    	            request.session.oauth._accessUrl,
    	            request.session.oauth._consumerKey,
    	            request.session.oauth._consumerSecret,
    	            request.session.oauth._version,
    	            request.session.oauth._authorize_callback,
    	            request.session.oauth._signatureMethod
    	        );
                var sign_url = oa.signUrl(path, request.session.oauth.access_token, request.session.oauth.access_token_secret, (server_options.method||"POST"));
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
util.getJSON = function(server_options, request, callback, oauthdata){
    if(typeof request == 'function'){
        callback = request;
        request = null;
    }

    if(request && server_options.oauthprovider&&!oauthdata){
    	var userprofile = request.getUserprofile();
    	
    	if(server_options.oauthprovider && server_options.skiplogin){
    		var simpleportaloauth = simpleportalOAuth.getSimplePortalOAuth(server_options.oauthprovider);
    		
    		if(simpleportaloauth){
    			simpleportaloauth.getJSON(server_options, request, callback);
    		} else
    			callback('Not a valid oauth provider, check your oauth configuration');	
    	} else if(userprofile && userprofile.oauth && userprofile.oauth[server_options.oauthprovider]){
    		var simpleportaloauth = simpleportalOAuth.getSimplePortalOAuth(server_options.oauthprovider);
    		
    		if(simpleportaloauth){
    			simpleportaloauth.getJSON(server_options, request, callback, userprofile.oauth[server_options.oauthprovider]);
    		} else
    			callback('Not a valid oauth provider, check your oauth configuration');
    	}  else if(userprofile && userprofile.oauth && userprofile.oauth[server_options.oauthprovider + '_mobile']){
    		var simpleportaloauth = simpleportalOAuth.getSimplePortalOAuth(server_options.oauthprovider + '_mobile');
    		
    		if(simpleportaloauth){
    			simpleportaloauth.getJSON(server_options, request, callback, userprofile.oauth[server_options.oauthprovider + '_mobile']);
    		} else 
    			callback('Not a valid oauth provider, check your oauth configuration');
    	}else if(userprofile){
    		var simpleportaloauth = simpleportalOAuth.getSimplePortalOAuth(server_options.oauthprovider);
    		
    		if(simpleportaloauth){
    			simpleportaloauth.getJSON(server_options, request, callback);
    		} else
    			callback('Not a valid oauth provider, check your oauth configuration');
    	}else
            callback('No valid oauth token for accessing the remote server - ' + server_options.oauthprovider, {loginRequired:true});
    }else if(server_options.oauthprovider && server_options.skiplogin){
		var path = util.constructUrl(server_options);
        
		getRemoteJSON(server_options, callback);
	}else if(request && server_options.oauth){
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
            }else if(oauthdata){
            	var oa = new OAuth(
        			oauthdata._requestUrl,
        			oauthdata._accessUrl,
        			oauthdata._consumerKey || oauthdata.oauth_consumer_key,
        			oauthdata._consumerSecret,
        			oauthdata._version || oauthdata.oauth_version,
        			oauthdata._authorize_callback,
        			oauthdata._signatureMethod||oauthdata.oauth_signature_method
    	        );
                var sign_url = oa.signUrl(path, oauthdata.access_token||oauthdata.oauth_token, oauthdata.access_token_secret, (server_options.method||"GET"));
                var parsedUrl= url.parse(sign_url, false );
                                
                server_options.path = parsedUrl.path;
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
	var finalresults = {};
	
	if(error)
		finalresults = {exception:error};
	else if(results && results.contentType && results.data){
		body = finalresults = results.data;
	}else if(results && typeof results.length == "number")
		finalresults = results;
	else
		finalresults = results;//simpleportal.util.extendJSON({}, results);
	
	var body = JSON.stringify(finalresults);
	
	headers = headers||{};
	
	if(error && typeof error == 'object' && error+'' == '{}' && error+'' == '[]')
		error=null;
	
	if(response.headersSent){
		console.error('Simple Portal : util : sendServiceResponse', 'Response header for this request is already send');
	}else{
		if(response.callback){
			body = response.callback.replace(/[^\w$.]/g, '') + '(' + body + ');';
			headers['Content-Type'] = 'text/javascript';
		}

		if(results && results.loginRequired){
			var httpstatus = 401;
			if(results.httpstatus)
				httpstatus = results.httpstatus;
			
			if(!headers['Location'])
				headers['Location'] = '/oauth/login';
			
			response.send(httpstatus, headers);
		} else if(results && results.redirectUrl){
			var httpstatus = 301;
			
			if(results.httpstatus)
				httpstatus = results.httpstatus;
			
			if(!headers['Location'])
				headers['Location'] = results.redirectUrl;
			
			response.send(httpstatus, headers);
		}else {
			if(!headers['Content-Type'])
				headers['Content-Type'] = 'application/json; charset=UTF-8';
			
			if(error && error == 'Permission denied'){
				headers['Content-Type'] = 'application/json; charset=UTF-8';
				response.send(403, headers, body);
			} else if(error){
				headers['Content-Type'] = 'application/json; charset=UTF-8';
				response.send(400, headers, body);
			} else {
				if(!headers['Content-Type'])
					headers['Content-Type'] = 'application/json; charset=UTF-8';
				
				response.send(200, headers, body);
			}	
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
function getParamValues_(sourcestring) {
	if(sourcestring.indexOf("=") > -1){
		var params = sourcestring.split("&");
		var values = {};
		
		for (i = 0; i < params.length; i++) {
			var key_value = params[i].split('=');
			
			if (key_value.length > 1) {
				values[key_value[0]] = getParamValues_(decodeURIComponent(key_value[1]));
			}
		}
		
		return values;
	}else
		return sourcestring;
	
}

util.getParamValues = function(request) {
	var parsedUrl= url.parse(request.url, false);
	var queryParam = parsedUrl.query;
	
	var values = {};
	
	if (queryParam) {
		var params = queryParam.split('&');
		
		for (var i = 0; i < params.length; i++) {
			var key_value = params[i].split('=');
			
			if (key_value.length > 1) {
				values[key_value[0]] = getParamValues_(decodeURIComponent(key_value[1]));
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
		name = name.replace(/(undefined|null|[^-\.a-zA-Z0-9]+)|\./g, '').toLowerCase();
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
	
	if(typeof value == 'array' || (typeof value =='object' && typeof value.length  == "number")){
		if(typeof value == 'array' && value.length == 1 && typeof value[0] == 'object' && Object.keys(value[0]).length == 0)
			return [];
		else
			return value;	
	}
	
	value = String(value);
	var arrayString = value.split(seperator || ",");
	var arrayResult = new Array();
	
	for (var i=0; i < arrayString.length; i++) {
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
 * To delerte a file or folder if exists
 * 
 * @method removeIfExists
 * @param {} dir
 * @param {callback} callback The callback to excecute when complete
 * @return 
 */
util.removeIfExists = function(filepath, callback){
	if(typeof filepath == 'object' && typeof filepath.length == 'number'){
		if(callback){
			var cbc = filepath.length;
			for(var i in filepath)
				util.removeIfExists(filepath[i], function(){
					if(cbc-- == 1)
						callback();
				});
		}else{
			for(var i in filepath)
				util.removeIfExists(filepath[i]);
		}
	} else {
		if(callback)
			fs.access(filepath, function(error) {
				if (error && error.code === 'ENOENT'){
					callback(error);
				}else
					fs.unlink(filepath, callback);
			});
		else
			try{
				if(fs.accessSync(filepath))
					fs.unlinkSync(filepath);
			}catch(error){
				callback(error);
			}
	}
}

/**
 * To check whether a folder is avaiable if not create the folder
 * 
 * @method checkDirSync
 * @param {} dir
 * @param {callback} callback The callback to excecute when complete
 * @return 
 */
util.checkDirSync = function(dir, callback){
	try{
		fs.accessSync(dir);
//		if (!fs.existsSync(dir)) {
	}catch(error){
		util.mkdirParent(dir, '0755');
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
				fs.mkdir(dir, '0755', function (err) {
					callback(err);
				});
			}
		});
	} catch (e) {
		console.error('Simple Portal-util', e);
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
util.arraycontains = function(array){
	if(!array)
		return false;
	
	var values = [].slice.call(arguments, 1);
	
	var found = false;

	if(values)
		values.forEach(function (value) {
			if(value)
				found = arraycontains_(array, value);
	    });
	
	return found;
}

var arraycontains_ = function(array, value){
	if(value instanceof Array)
		for(var i=0; i<value.length; i++) {
	        var found = util.arraycontains(array, value[i]);
	        
	        if(found)
	        	return true;
	    }
	else
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
 * To get the object based on key and field from the json object array and merge duplicated objects
 * 
 * @method getMergedJSONObject
 * 
 * @param {array} array
 * @param {string} value
 * @return jsonobject 
 */
util.getMergedJSONObject = function(array, key, value){
	if(!array)
		return null;
	
	var object = null;
	for(var i=0; i<array.length; i++) {
        if (array[i] && array[i][key] == value) {
        	if(!object)object={};
        	util.extendJSON(object, array[i]);
        }
    }
	
	return object;
}

/**
 * To get the object based on key and field from the json object array and merge duplicated objects
 * 
 * @method getMergedJSONObject
 * 
 * @param {array} array
 * @param {string} value
 * @return jsonobject 
 */
util.getMergedJSONArray = function(array, key, value){
//	if(!array)
//		return null;
//	
//	var object = null;
//	for(var i=0; i< array.length; i++) {
//        if (array[i] && array[i][key] == value) {
//        	if(!object)object={};
//        		util.extendJSON(object, array[i]);
//        }
//    }
	
	return array;
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
	if( typeof o == 'undefined') {
		return o;
	} else if(typeof o == 'boolean'){
		return o;
	} else if( o && typeof o == "object" && typeof o.length != 'number'){
		if(o.hasOwnProperty("_bsontype")){
			//@BUGFIX - bson type is serialized after extendjson or clone
			return o;
		}else{
			var ret = {};
			
			Object.keys(o).forEach(function (val) {
				if(ignorefunctions && typeof o[val] == 'function'){}
				else
					ret[val] = util.clone(o[val], ignorefunctions);
			});
			return ret;
		}
	} else if( o && typeof o == 'object' && typeof o.length == 'number'){
		var ret = [];
		for(var index in o){
			var val = o[index];
			if(val && ignorefunctions && typeof val == 'function'){}
			else if(val)
				ret[index] = util.clone(val, ignorefunctions);
			else
				ret[index] = util.clone(val);
		}
		return ret;
	} else
		return o;
}

/**
 * To read a file and parsing as json object
 * 
 * @method readJSONFile
 * @param {string} file file path
 * @return fixedJSON
 */
util.readJSONFileSync = function(file) {
	var filejson = fs.readFileSync(file) + ''; 
	
	var fixedJSON = null;
	try{
		fixedJSON = JSON.parse(filejson);
	}catch(error){
		var jsonconfig = require(file);
		
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

util.readJSONFile = function(file, callback) {
	if(callback){
		fs.readFile(file, function(error, data){
			if(error)
				callback(error);
			else{
				var filejson = data+'';
				
				var fixedJSON = null;
				try{
					fixedJSON = JSON.parse(filejson);
				}catch(error){
					var jsonconfig = require(file);
					
					var fixedJSON = filejson.replace(/https:/g, 'https_colon_');
					
					fixedJSON = fixedJSON.replace(/http:/g, 'http_colon_');
					fixedJSON = fixedJSON.replace(/localhost:/g, 'localhost_colon_');
					fixedJSON = fixedJSON.replace(/(['"])?([a-zA-Z0-9_\;\&\.\/]+)(['"])?:/g, '"$2": ');
					
					fixedJSON = fixedJSON.replace(/http_colon_/g, 'http:');
					fixedJSON = fixedJSON.replace(/https_colon_/g, 'https:');
					fixedJSON = fixedJSON.replace(/localhost_colon_/g, 'localhost:');
					
					fixedJSON = JSON.parse(fixedJSON);
				}
				
				callback(null, fixedJSON);
			}
		});
	}else {
		return util.readJSONFileSync(file);
	}
}

/**
 * To extend a json object with another object
 * 
 * @method copyJSON
 * @param {object} target
 * @return target extended json object
 */
util.copyJSON = function(target, fields, source) {
	if(source && fields)
		fields.forEach(function (field) {
			if(!target[field] && source[field])
				target[field] = util.clone(source[field], true);
	    });
		
    return target;
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
	
    if(sources)
		sources.forEach(function (source) {
	    	if( typeof target == 'object' && typeof target.length == 'number' 
	    		&& typeof source == 'object' && typeof source.length == 'number'){
	    		target = target.concat(util.clone(source, true));
	    	}else
		    	for (var prop in source) {
		    		if(!target.hasOwnProperty(prop) && source.hasOwnProperty(prop))
		    			target[prop] = util.clone(source[prop], true);
		    		else if( typeof target[prop] == 'object' && typeof target[prop].length == 'number' 
		    			&& typeof source[prop] == 'object' && typeof source[prop].length == 'number')
		    			// make duplicate check	
		    			if(typeof target[prop][0] == 'object' && typeof target[prop][0].length !== 'number' && target[prop][0].hasOwnProperty("id")){
		    				for(var k in source[prop]){
		    					var curobj = util.getJSONObject(target[prop], "id", source[prop][k].id);
		    					if(curobj){
		    						util.extendJSON(curobj, source[prop][k])
		    					} else
		    						target[prop].push(source[prop][k]);
		    				}
		    			}else
		    				target[prop]=(target[prop]||[]).concat(util.clone(source[prop], true)).unique();
		    		else if( typeof target[prop] == 'object' && typeof source[prop] == 'object')
		        		util.extendJSON(target[prop], util.clone(source[prop], true));
		        	else if(typeof target[prop] != "object" && typeof source[prop] == "object"){
	        			target[prop] = util.clone(source[prop], true);
		        	} else {
	        			var targetvalue;
	        			if(source.hasOwnProperty(prop))
	        				targetvalue = util.clone(source[prop], true);
	        			else if(target.hasOwnProperty(prop))
	        				targetvalue = util.clone(target[prop], true);
	        			
	        			if(typeof targetvalue != 'undefined')
	        				target[prop] = targetvalue;
		        	}	
		        }
	    });
    return target;
}

/**
 * To flatten the json object in to one object, with sub keys seperated by the given seperator
 * 
 * @method flattenJSON
 * @param data JSON to flatten
 * @param seperator Seperator to use for sub object
 * @return {object} one flattend json object
 */
util.flattenJSON = function(data, seperator){
	var result = {},
		seperator = seperator||'.';
	
    function recurse(cur, prop) {
        if (Object(cur) !== cur) {
            result[prop] = cur;
        } else if (Array.isArray(cur)) {
            for (var i = 0, l = cur.length; i < l; i++)
            	recurse(cur[i], prop + "[" + i + "]");
            
            if (l == 0 && !result[prop]) result[prop] = [];
            else if(cur[i])result[prop] = cur[i].join(",");
            	
        } else {
            var isEmpty = true;
            for (var p in cur) {
                isEmpty = false;
                recurse(cur[p], prop ? prop + seperator + p : p);
            }
            
            if (isEmpty && prop && !result[prop]) result[prop] = {};
        }
    }
    
    recurse(data, "");
    return result;
}

util.jsonDifference = function(object1, object2){
	var jsonchanges = {}; 
	
	// can be either way now iterating object instead of fields, if only one changes then no need to iterate entire fields list
	if(typeof object1[i] == typeof object2)
		for(var i in object1){
			if((
				typeof object1[i] == 'object' 
				&& typeof object1[i].length != 'number') 
				&& (object2 && typeof object2 == 'object' 
					&& typeof object2[i] == 'object' 
					&& typeof object2[i].length != 'number')
			){
				var subdifference = util.jsonDifference(object1[i], object2[i]);
				
				if(subdifference && Object.keys(subdifference).length > 0)
					jsonchanges[i] = subdifference;
			} else if(!object2 || object2[i] != object1[i])
				jsonchanges[i]=object1[i];
		}
	
	return jsonchanges;
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
            var _char = path.charAt(index);

            if (_char === "[") {
                var start = index + 1,
                    end = path.indexOf("]", start),
                    cursor = cursor[property] = cursor[property] || [],
                    property = path.slice(start, end),
                    index = end + 1;
            } else if(seperator.length >1){
            	var charsep = _char;
            	
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
                    start = _char === seperator ? index + seperator.length : index,
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
 * @method deleteFolderRecursive
 * @param {} path
 */
util.deleteFolderRecursive = function(path, callback) {
    var files = [];
    
    if( fs.existsSync(path) ) {
        files = fs.readdirSync(path);
        
        files.forEach(function(file,index){
            var curPath = path + "/" + file;
            
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
            	util.deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        
        fs.rmdirSync(path);
        
        if(callback)
        	callback();
    }else 
        if(callback)
        	callback();
};

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
        
        files.forEach(function(file, index){
            var curPath = path + "/" + file;
            
            if(!fs.lstatSync(curPath).isFile()) { // recurse
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

util.getResourceFromUrl = function (filename) {
	var i = filename.lastIndexOf('/');
	
    var filepath = (i < 0) ? '' : (filename.substr(i+1));
    if(filepath.indexOf('?') == -1)
    	return filepath;
    else
    	return filepath.substring(0, filepath.indexOf('?'))
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
util.downloadFile =  function(url, filepath, callback) {
	var instance = this;
	
	var http_or_https = require('http');
    if (/^https:\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/.test(url.trim())) {
    	http_or_https = require('https');
    }
    
    http_or_https.get(url, function(response) {
        var headers = JSON.stringify(response.headers);
        
        if(response.statusCode == 200){
        	util.checkDirSync(path.dirname(filepath));
        	
        	var fileStream = fs.createWriteStream(filepath);
            
            response.on('data', function(chunk){
            	fileStream.write(chunk);
            }).on('end', function(){
            	fileStream.end();
            });
            
            fileStream.on("close", function(){
            	callback(null);
            })
        }else if(response.statusCode == 301 || 
    		response.statusCode == 302 ||
    		response.statusCode == 303 ||
    		response.statusCode == 307) {
        	return util.downloadFile(response.headers.location, filepath, callback);
        }else
        	callback(new Error('Server responded with status code ' + response.statusCode));
        /*
        switch(response.statusCode) {
            case 200:{
                var file = fs.createWriteStream(filepath);
                
                response.on('data', function(chunk){
                    file.write(chunk);
                }).on('end', function(){
                    file.end();
                    callback(null);
                });
//                break;
        	}
            case 301:
            case 302:
            case 303:
            case 307:{
            	return util.downloadFile(response.headers.location, filepath, callback);
//              break;
            } 
            default:
            	callback(new Error('Server responded with status code ' + response.statusCode));
        }*/
    })
    .on('error', function(err) {
    	callback(err);
    });
};

/**
 * To append a file extension, only if the existing filepath not ends with the extension
 * @method appendFileExtension
 * @param filepath
 * @param extension extension to be appeneded to the filepath 
 * 
 */
util.appendFileExtension = function(filepath, extension){
	return filepath + ((filepath.indexOf(extension) + extension.length == filepath.length) ? "" : extension);
}

/**
 * Appending a file filepath if the exisiting filepath contains the apending path, array of filepaths can be appended with file seperator
 * @method appendFilePath
 * @param target filepath where list of sub filepaths to be appeneded
 * 
 */
util.appendFilePath = function(target){
	if(!target)
		target='';
	
	var newpaths = [].slice.call(arguments, 1);
	if(newpaths)
		newpaths.forEach(function (newpath) {
			if(newpath && typeof newpath == "string" && (target.lastIndexOf("/") + 1 != target.length) && newpath.indexOf("/") != 0)
				newpath = "/" + newpath; 
			
			if(newpath && typeof newpath == "string" && !(target.indexOf(newpath) != -1 && target.indexOf(newpath) + newpath.length == target.length))
				target += newpath;
		});
	
    return target;
}

/**
 * Get resources from folder recursively
 */
util.getResources = function(dir, props, callback, resourcelist){
	// read from directory
	if(!resourcelist)
		resourcelist = [];
	
	if(!(dir instanceof Array))
		dir=[dir];
	
	var count =0;
	for(var i in dir){
		var curprops = util.extendJSON({}, props, {root:dir[i]});
		
		util.getFileList(dir[i], curprops, function(error, results){
			if(results)
				resourcelist = resourcelist.concat(results);
						
			if(count++ == dir.length-1)
				callback(error, resourcelist);
		});
	}
}

/**
 * Get files from  a folder recursively
 * 
 * props.extension -- file extenstion regular expression
 */
util.getFileList = function(dir, props, done){
	var results = [];
	props = props||{datadisplay:'display'};
	if(!props.datadisplay)
		props.datadisplay = 'display';
  
	fs.readdir(dir, function(err, list) {
		if (err) return done(err);
		var i = 0;
		(function next() {
			var file = list[i++];
			var file_=file;
			if (!file) return done(null, results);
      
			file = path.join(dir, file);
			
			fs.stat(file, function(err, stat) {
				if (stat && stat.isDirectory()) {
					if(!props.excludeDir)
						util.getFileList(file, props, function(err, res) {
							results = results.concat(res);
							next();
						});
					else
						next();
				} else if(file_.charAt(0) == '.' && !props.includeHidden){
					next();
				} else{
					if(props.timestamp && props.timestamp > stat.mtime)
						next();
					else if((props.filename && new RegExp("\^(" + props.filename+ ")$", "i").test(file_))){
						var localfile = {display:file_, resourcekey:props.resourcekey||'', file:file, id:file, size:stat["size"], mtime:stat["mtime"]};
						if(props.datadisplay){
							localfile[props.datadisplay]=file_;
						}
						
						if(props.root && !props.includeroot){
							var relativepath = file.replace(props.root, props.rootpath||"");
//							var path = relativepath.replace('/' + file_, '');
							
							localfile.file = localfile.id = relativepath;
							localfile.path = relativepath.replace('/' + file_, '');

							if(props.folder)
								localfile.folder = props.folder;
//							results.push({resourcekey:props.resourcekey||'', path:path, file:relativepath, id:relativepath, display:file_, size:stat["size"], mtime:stat["mtime"]});
						}
//						else
//							results.push({resourcekey:props.resourcekey||'', file:file, id:file, display:file_, size:stat["size"], mtime:stat["mtime"]});
						
						if(props.hash)
							localfile.id = util.getHash((props.folder||'') + localfile.file);
						
						results.push(localfile);
						next();
					} else if((!props.filename && !props.extension) || (props.extension && new RegExp("\.(" + props.extension+ ")$", "i").test(file_))){
						var localfile = {resourcekey:props.resourcekey||'', file:file, id:file, display:file_, size:stat["size"], mtime:stat["mtime"]};
						if(props.datadisplay){
							localfile[props.datadisplay]=file_;
						}
						
						if(props.root && !props.includeroot){
							var relativepath = file_;
							if(!props.excludeDir){
								relativepath = file.replace(props.root, props.rootpath||"");
							}
							var path = relativepath.replace('/' + file_, '');
							
							localfile.file = localfile.id = relativepath;
							localfile.path = path;
							if(props.folder)
								localfile.folder = props.folder;
//							results.push({resourcekey:props.resourcekey||'', path:path, file:relativepath, id:relativepath, display:file_, size:stat["size"], mtime:stat["mtime"]});
						} 

						if(props.hash)
							localfile.id = util.getHash((props.folder||'') + localfile.file);
							
//						else
//							localfile	
//							results.push({resourcekey:props.resourcekey||'', file:file, id:file, display:file_, size:stat["size"], mtime:stat["mtime"]});
						
						results.push(localfile);
						next();
					} else{
						next();
					}
				}
			});
		})();
	});
}

/**
 * To validate an object retreived from http request
 * @method validateObject
 */
var validateObject = function(object, objectsource, modelprops){
	var validationmessages = [];
	
	if(modelprops.validation){
		for(var validation in modelprops.validation){
			if(validation == 'object'){
				
			//} else if(object[validation]){
			} else if(object.hasOwnProperty(validation)){
				var vdn = modelprops.validation[validation];
				if(typeof vdn == 'string' && util.modelValidations[vdn]){
					var val_ = util.modelValidations[vdn](object[validation])
					if(!val_.isValid){
						var message ={};
						message[validation] = val_.message||'Not valid!';
						validationmessages.push(message);
					}	
				}else if(typeof vdn == 'function'){
					var val_ = vdn(object[validation]);
					if(!val_.isValid){
						var message ={};
						message[validation] = val_.message||'Not Valid!';
						validationmessages.push(message);
					}
				}
			}	
		}
		
		// check for common error using validation object function
		if(modelprops.validation.hasOwnProperty('object')){
			var vdn = modelprops.validation['object'];
			
			var val_ = vdn(object);
			if(!val_.isValid){
				var message ={};
				message['Common Error -'] = val_.message;
				validationmessages.push(message);
			}
		}

		if(validationmessages && validationmessages.length > 0)
			object.validationmessages=validationmessages;
		else
			delete object.validationmessages;
	}
	
	return object;
}


var formatFieldData = function(field, value, defaultValue){
	if(!defaultValue)
		return value;
	else{
		if(typeof defaultValue == 'object' && defaultValue[field])
			defaultValue = defaultValue[field];
		
		return Dataformatter.formatWithDefaultData(value, defaultValue);
	}
}

/**
 * Format a particular object based on the model defined
 * @method formatObject
 * 
 * @param object object which need to be formatted
 * @param modelprops Service instance or model props {dataformat, validation, model} defined inside
 * @param objectsource object source from where the object is derived ,probably request object
 */
var formatObject = util.formatObject = function(object, objectsource, modelprops){
	var defaultmodel = {};
	if(modelprops.model)
		defaultmodel = modelprops.model;
	
	if(modelprops.dataformat){
		object = Dataformatter.formatObject(modelprops.dataformat, object, defaultmodel, objectsource);
	}
	
	if(modelprops.model){
		for(var field in modelprops.model){
			object[field] = formatFieldData(field, object[field], defaultmodel[field]);
		}
	}
	return object;
}

var getJSONFromUrlString = function(urlstring){
	var mutplequery = urlstring.split("&");
	var jsonobject = {};
	
	for(var m = 0; m < mutplequery.length; m++){
		var queryarray = mutplequery[m].split("=");
		
		for(var i = 0; i < queryarray.length; i++){
			var field = unescape(queryarray[i++]);
			
			jsonobject[field]=unescape(queryarray[i]);
		}
	}
	return jsonobject;
}

var getObject = function(request, modelprops){
	var object = {};
	
	var datasource = request;
	var datasource = request.body;
	if(datasource && typeof datasource == "string"){
		datasource = getJSONFromUrlString(datasource);
	}
	
	if(datasource && datasource && datasource[modelprops.name] && typeof datasource[modelprops.name] === 'object' ){
		object = datasource[modelprops.name];
	}else if(datasource && datasource && modelprops.model){
		var source = datasource;
		
		for(var field in modelprops.model){
			var fieldvalue ;
			if(!modelprops.getModelFieldValue){
				if(source[field] && source.hasOwnProperty(field) )
					fieldvalue = source[field];
			} else	
				fieldvalue = modelprops.getModelFieldValue(source, field);
			
			if(fieldvalue)
				object[field] = fieldvalue;
		}
	}
	
	/**
	 * @BUGFIX mongo db based application
	 */
	if(object && !object.id && datasource && datasource.body && datasource.body["id"]){
		object.id = datasource.body["id"];
	} else if(object && !object.id && datasource && datasource["id"]){
		object.id = datasource["id"];
	}
	
	var _id;
	if(object && !object._id && datasource && datasource.body && datasource.body["_id"]){
		_id = datasource.body["_id"];
	}else if(object && !object._id && datasource && datasource["_id"]){
		_id = datasource["_id"];
	}
		
	if(_id){
		try{
			if(typeof _id === "string")
				object._id = DbUtil.getBSONObjectId(_id);
			else
				object._id = _id;
		} catch(error){
			object._id=_id;
		}
	}
	// format the object we received from datasource
	formatObject(object, request, modelprops);
	
	// validate the given data
	validateObject(object, datasource, modelprops);
	
	return object;
};

/**
 * To retreive object from the provided model configuration
 */
util.getObject = function(datasource, modelprops){
	if(!modelprops || !modelprops.name || !modelprops.model){
		console.error("util.getObject expects, name and model configuration to return result");
		return {};
	}else
		return getObject(datasource, modelprops);
}

/**
 * Various validations fucntion for validating the field
 * 
 * @property modelValidations
 * @type Object
 */
util.modelValidations = {
	required:function(value){
		return {isValid:value, message:"Field is required!"};
	},
	/**
	 * To validate whether the value is in a standard time format or not
	 * 
	 * Regular expression used is - /^(\d{1,2}(\.\d{2})?)([ap]m)?$/
	 * 
	 * @method validation_.time
	 * 
	 * @param {} value
	 * @return true if valid time else false
	 * @private
	 */
	time: function(value){
		return {isValid:value.match(/^(\d{1,2}(\.\d{2})?)([ap]m)?$/), message:'Not a valid Time!'};
	},
	
	/**
	 * To validate whether the value is a number
	 * 
	 * @method validation_.number
	 * 
	 * @param {} value
	 * @return true if valid number else false
	 * 
	 * @private
	 */
	number: function(value){
		return {isValid:typeof value == 'number' || (value && value.match(/^[0-9]+$/)), message:'Not a valid number!'};
	},
	/**
	 * To validate whether the value is a url
	 * Regular expression used is - /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
	 * 
	 * @method validation_.url
	 * 
	 * @param {} value
	 * @return true if valid url else false
	 * 
	 * @private
	 */
	url:function(value){
		var regexp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
		return {isValid:!value||regexp.test(value), message:'Not a valid URL'};
	},
	
	/**
	 * To validate whether the value is a version number
	 * 
	 * @method validation_.versionnumber
	 * 
	 * @param {} value
	 * @return true if valid version number else false
	 * 
	 * @private
	 */
	versionnumber:function(value){
		var regexp = /[0-9]+\.[0-9]+\.[0-9]+/
		return {isValid:!value||regexp.test(value), message:'Not a valid verison number'};
	}
};

/**
 * To format the search field
 */
var formatSearchField = function(searchqueryobject, field, requestbody, modelobject, modelprops){
	// now we need to have the clause appended to the field
	var defaultoperators = ['!', '=', '<', '<=', '>', '>=', '%'],
		valueoperators = ['startswith', 'endswith'];
	
	var operator = decodeURI(unescape(requestbody[field.field+ '_operator']));
	
	var value;
	if(modelobject.hasOwnProperty(field.field))
		value=modelobject[field.field];
	else
		value=requestbody[field.field];
	
	if(operator && util.arraycontains(defaultoperators, operator))
		field.remotefield = field.remotefield + requestbody[field.field+ '_operator'];
	else if(operator && util.arraycontains(valueoperators, operator)){
		if('startswith' == operator)
			 value = value + "%";//append % at the end
		else if('endswith' == operator)
			value = '%' + value;//append % at the start
	}
	searchqueryobject[field.remotefield]=formatFieldData(field.field, value, modelprops.model);
}

/**
 * To format the Search query
 */
util.formatSearchQuery = function(searchqueryobject, queryfields, requestbody, modelobject, modelprops){
	if(queryfields && requestbody)
		for(var queryfield in queryfields){
			var field = queryfields[queryfield];
			
			// @Mongodb specific fields
			if(field.field == "$match" && !searchqueryobject[field.field] && requestbody[field.field] && (requestbody[field.field] != '' || requestbody[field.field] != [])){
				modelprops.model = util.extendJSON({$count:0}, modelprops.model);
				modelprops.searchqueryparams = util.extendJSON({$count:"$count"}, modelprops.searchqueryparams);
				
				var $matchobject = util.getObject({body:requestbody[field.field]}, modelprops);
				
				searchqueryobject[field.remotefield]={$match:'$match'};//requestbody[field.field];
				queryfields.push({field:"$count", remotefield:'count'});
				
				util.formatSearchQuery(searchqueryobject[field.remotefield], queryfields, getJSONFromUrlString(requestbody[field.field]), $matchobject, modelprops);
				
				if(searchqueryobject[field.remotefield])
					delete searchqueryobject[field.remotefield]['$match'];
				
			} else if(!searchqueryobject[field.field] && requestbody[field.field] && (requestbody[field.field] != '' || requestbody[field.field] != [])){
				formatSearchField(searchqueryobject, field, requestbody, modelobject, modelprops);
			} else {
				util.updateAdvSearchQuery(searchqueryobject, requestbody, field, '!', modelprops.model);
				util.updateAdvSearchQuery(searchqueryobject, requestbody, field, '<', modelprops.model);
				util.updateAdvSearchQuery(searchqueryobject, requestbody, field, '>', modelprops.model);
			}
		}
}

/**
 * update search field in to search query
 * @param searchobject
 * @param requestbody
 * @param object
 * @param field
 * @param fieldclause
 */
util.updateAdvSearchQuery = function(searchobject, objectsource, field, fieldclause, defaultmodel){
	var destfield = (field.remotefield||field.field) + (fieldclause||''),
		srcfield = field.field + fieldclause||'',
		encsrcfield = field.field + fieldclause ? encodeURI(fieldclause) : '';
	
	if(!searchobject[srcfield] && objectsource[srcfield] && (objectsource[srcfield] != '' || objectsource[srcfield] != [])){
		// check starts with =
		if(objectsource[srcfield].indexOf("=") == 0){
			destfield += "=";
			objectsource[srcfield] = objectsource[srcfield].substring(1);
		}
		
		searchobject[destfield] = formatFieldData(field.field, objectsource[srcfield], defaultmodel);
	} else if(!searchobject[srcfield] && objectsource[srcfield] && (objectsource[encsrcfield] != '' || objectsource[encsrcfield] != [])){
		if(objectsource[srcfield].indexOf("=") == 0){
			destfield += "=";
			objectsource[srcfield] = objectsource[encsrcfield].substring(1);
		}
		
		searchobject[destfield] = formatFieldData(field.field, objectsource[encsrcfield], defaultmodel);
	}
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
util.getSearchQuery = function(query, modelprops, request){
	var instance = this;
	
	var params = util.extendJSON({}, modelprops._searchqueryparams, modelprops.searchqueryparams, request.searchqueryparams);
	
	var requestbody = util.extendJSON({}, request.body, request.query);
	var object = util.getObject({body:requestbody}, modelprops);
	
	var queryfields = [{field:'_id', remotefield:'_id'}];
	
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
	var searchqueryobject = util.extendJSON({}, query);
	
	util.formatSearchQuery(searchqueryobject, queryfields, requestbody, object, modelprops);
	
	return searchqueryobject;
}

/**
 * Get the formatted json key 
 * 
 * @method formatJSONKey
 * 
 */
util.formatJSONKey = function(field){
	return field.replace(/ /g, '').replace(/(\/|\\|\'|\"|\.|-|;|\(|\))/ig, '_');
};

util.addWeeks = function(someDate, weeks) {
	var tempDate = someDate;
	
	tempDate.setTime(tempDate.getTime() +  (weeks * 7 * 24 * 60 * 60 * 1000));
	
	return tempDate;
};

util.addDays = function(someDate, days) { 
	var tempDate = someDate;
	
	tempDate.setTime(tempDate.getTime() +  (days * 24 * 60 * 60 * 1000));
	
	return tempDate;
};

/**
 * To get the archive command for running in os command.
 * 
 * @method getArchiveCommand
 * 
 * @param resourefolder folder where which needs to be archived
 * @param resourcebundle Archive file
 * @param destfolder folder where archive to be placed
 * @param tarargs extra arguments for the archive command.
 * 
 * @return system command to run
 */
util.getArchiveCommand = function(resourefolder, resourcebundle, destfolder, tarargs){
	var unarchiver = ['cd', resourefolder, '&&'];

	if(!tarargs)
		tarargs = [];
	
	var useTar=false;
	if(resourcebundle.indexOf('tar.gz') != -1)
		useTar = true;
	
	var isMac = /^darwin/.test(process.platform);
	if((isMac || useTar)) {
		unarchiver.push('tar');
		
		unarchiver.push('-xvf ' + resourcebundle);
		unarchiver.push('-C ' + destfolder);
		
		if(destfolder.indexOf(resourefolder) == -1) {
			if(tarargs.length <= 0 || !util.arraycontains(tarargs, 'strip-components=1'))
				tarargs.push('strip-components=1');
		}
		
		if(tarargs && tarargs.length > 0)
			unarchiver.push(' --' +  tarargs.join(' --'));
	} else { //@TODO need to find ways to unpack windows 
		unarchiver.push('unzip');
		
		unarchiver.push(resourcebundle);
		unarchiver.push('-d');
		unarchiver.push(destfolder);
	}
	var commandtoexecute = unarchiver.join(' ');
	
	return commandtoexecute;
};

/**
 * Function to archive a folder
 *  
 * @param props
 * 	- props.archive full destination path including the file extension of the archived file
 *  - props.rootdir Directory from which the archive structure is formed
 *  - props.deleteFolder Delete the folder after archiving
 */
util.archiveFolder = function(archiveprops, callback){
	var cmd_to_execute;
	if(archiveprops.rootdir && archiveprops.archive){
		if(archiveprops.archive.indexOf(".") == -1)
			archiveprops.archive = archiveprops.archive + '.tar.gz';
		
		cmd_to_execute = 'cd ' + archiveprops.rootdir + ' && ' + ARCHIVE_TOOL + ' -zcpf';

		cmd_to_execute += " " + archiveprops.archive;

		if(archiveprops.exclude){
			if(typeof archiveprops.exclude.length == 'number'){
				for(var i in archiveprops.exclude)
					cmd_to_execute += ' --exclude='+archiveprops.exclude[i];
			}else
				cmd_to_execute += ' --exclude='+archiveprops.exclude;
		}
		
		if(!archiveprops.includehidden){
			cmd_to_execute += ' --exclude=".*';
			cmd_to_execute += ' --exclude="._*';
		}

		cmd_to_execute += ' *';

		if(archiveprops.deleteFolder)
			cmd_to_execute += ' && rm -r '+ archiveprops.rootdir;
	}
	
	if(cmd_to_execute){
		exec(cmd_to_execute, callback);
	}else
		callback("Please provide valid archive properties");
}

/**
 * Add file to an exisiting archive
 * 
 * @param archive full path including the file extension of the archived file
 * @param file to include in to the file
 */
util.addFileToArchive = function(archive, filepath, callback){
	var cmd_to_execute;
	if(archive && filepath){
		var filedir = filepath.substring(0, filepath.lastIndexOf("/"));
		var file = filepath.substring(filepath.lastIndexOf("/")+1);
		
		cmd_to_execute = 'gunzip '+archive+' && '+ ARCHIVE_TOOL + ' rvf '+archive.replace(".tar.gz", '.tar') + ' -C ' + filedir + ' ' + file + ' && gzip '+archive.replace(".tar.gz", '.tar');
	}

	if(cmd_to_execute){
		exec(cmd_to_execute, callback);
	} else
		callback("Please provide valid archive properties");
}

/**
 * To get a text between two string in a text
 * 
 * @param text
 * @param startText
 * @param endText
 * @returns text between two string
 */
util.getTextBetween = function(text, startText, endText){
	if(!startText)return null; // return null startText not provided
	
	if(!endText)endText = startText; // use endText as startText if not provided
	
	var startIndex = text.indexOf(startText) + (startText.length);
	var endIndex = text.indexOf(endText, startIndex);
	
	return text.substring(startIndex, endIndex);
}

/**
 * installing npm module
 * @param module npm module to be installed
 * @param callback callback function after installing
 */
util.installNpmModule = function(module, callback){
	if(module){
		var cmd_to_execute = 'cd ' + this.getServerPath("");
		
		var nodepath = (process.argv[0]);
		var npmpath = nodepath.replace("/nodejs", "/npm");
			npmpath = npmpath.replace("/node", "/npm");
			
		cmd_to_execute += " && "+npmpath+" install " + module;
		console.log("NPM - executing --> " + cmd_to_execute);
		
		exec(cmd_to_execute, callback);
	} else
		callback("Provide valid module name")
}

/**
 * installing npm module
 * @param module npm module to be installed
 * @param callback callback function after installing
 */
util.updateNpmModule = function(module, callback){
	if(module){
		var cmd_to_execute = 'cd ' + this.getServerPath("");
		console.log("NPM - executing --> " + cmd_to_execute);
		
		var nodepath = (process.argv[0]);
		var npmpath = nodepath.replace("/nodejs", "/npm");
			npmpath = npmpath.replace("/node", "/npm");
			
		cmd_to_execute += " && "+npmpath+" update " + module;
		
		exec(cmd_to_execute, callback);
	} else
		callback("Provide valid module name")
}

/**
 * To check whether a module is installed or not inside the main modules relative path
 */
util.checkNodeModule = function(npmmodule){
	for(var i in require.main.paths){
		try {
			if(npmmodule.indexOf("@") == -1)
				require.resolve(require.main.paths[i] + "/" + npmmodule);
			else
				require.resolve(require.main.paths[i] + "/" + npmmodule.substring(0, npmmodule.indexOf("@")));
			
			return true;
		} catch(e) {}
	}
	return false;
}

/**
 * To get the hash
 */
util.getHash = function(name){
	return crypto.createHash('md5').update(name).digest('hex');
}

/**
 * Increment the provided version number
 * 
 */
util.incrementVersionNumber = function(versionnumber, nofpoints){
	if(versionnumber && versionnumber.indexOf(".") != -1){
		var cnoofsteps = versionnumber.split(".").length-1;
		if(cnoofsteps > nofpoints)
			nofpoints = cnoofsteps; 
	}
	
	return util.formatVersionNumber(util.getVersionAsNumber(versionnumber)+1, nofpoints);
}

/**
 * To get the version number as a number so that version check increment can be done easily.
 */
util.getVersionAsNumber = function(versionnumber){
	var versionnumbervalue = 0;
	if (versionnumber.indexOf(".") != -1){
		var versionnumberarray = versionnumber.split(".");
		
		var rcv=0;
		var newv = [], index=0;
		var prevbvalue=1;
		for(var i=versionnumberarray.length-1; i >= 0; i--){
			var acv = Number(versionnumberarray[i]);
			var binaryvalue = (Number(util.prependWithZeros(1, ++index, true)))*prevbvalue;
			
			var cbvalue = binaryvalue*acv;
			
			versionnumbervalue +=  cbvalue;
			prevbvalue = binaryvalue;
		}
	}else if(versionnumber)
		versionnumbervalue = Number(versionnumber);
	else
		versionnumbervalue = 0;
	
	return versionnumbervalue;
}

/**
 * To convert a version number to a displayable format
 * 
 * @param number
 * @param nofpoints
 * @returns
 */
util.formatVersionNumber = function(number, nofpoints){
	nofpoints = nofpoints||2;
	var padnumber = (number+'').split("").join("");
	var numbers = [];
	
	for(var i = 0; i<= nofpoints; i++){
		if(padnumber.length == 0)
			padnumber = '0';
		
		if(padnumber.length >= i+1){
			var subnumber = padnumber.substring(padnumber.length-(i+1));
			
			numbers.push(subnumber);
		} else
			numbers.push(padnumber);
		
		padnumber = padnumber.substring(0, padnumber.length-(i+1));
	}
	
	return numbers.reverse().join(".");
}

/**
 * Prefix by zeros
 */
util.prependWithZeros = function (num, size, after) {
    var s = num + "";
    if(after)
    	while (s.length < size) 
    		s = s+ "0";
    else
    	while (s.length < size) 
    		s = "0" + s;
    
    return s;
};

/**
 * Arachive tool for archiving works in unix systems
 */
var ARCHIVE_TOOL = 'tar';
	