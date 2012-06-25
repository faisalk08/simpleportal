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

util.callModuleFunction = function(module, callChild, functionName, args){
    if(module){
            if(typeof module == 'function'){
            } else {
                if(callChild && module[functionName]){
                    module[functionName](args);
                }
                for(var function_ in module){
                    if(typeof module[function_] == 'string' || typeof module[function_] == 'function'){
                    } else {
                            util.callModuleFunction(module[function_], true, functionName, args);
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
    server_options.headers = {'Accept':'application/json'};
    
    var request = http.request(server_options, function(response) {
        response.setEncoding('utf8');
        var content = '';
  
        response.on('data', function (chunk) {
            content += chunk;
        });
        
        response.on('end', function (chunk) {
            try{
                content = JSON.parse(content);
                callback(null, content);
            }catch(error){
                callback(error);
            }
        });
    });

    request.on('error', function(e) {
      console.log('problem with request: ' + e.message);
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


util.sendServiceResponse = function(response, error, results){
	console.log('We are sendong the results back....');
	if(error){
		console.log('error');
		response.send(200, {'content-type': 'application/json; charset=UTF-8'}, JSON.stringify({exception:error}));
	} else if(results && results.loginRequired){
		console.log('need to pass this to login service!!');
		response.send(301, { 'Location': '/oauth/login'});
	} else if(results && results.redirectUrl){
		response.send(301, { 'Location': results.redirectUrl});
	} else{
		response.send(200, {'content-type': 'application/json; charset=UTF-8'}, JSON.stringify(results));
	}
}/*

util.sendViewResponse = function(response, error, results){
	if(error){
		console.log('error');
		response.send(200, {'content-type': 'text/html; charset=UTF-8'}, error);
	} else if(results.loginRequired){
		console.log('need to pass this to login service!!');
	} else if(results.redirectUrl){
		response.send(301, { 'Location': results.redirectUrl});
	} else{
		response.send(200, {'content-type': 'text/html; charset=UTF-8'}, JSON.stringify(results));
	}
}*/