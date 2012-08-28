/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var oauth = module.exports = {};

var util = require('./util');

var SimplePortalOAuth = require('./wrapper/oauth').SimplePortalOAuth;
var logger = require("./logger").getInstance();

var options ={};

var defaultSimplePortalOAuth;
oauth.getDefautlSimplePortalOAuth = function(){
	return defaultSimplePortalOAuth;
}

//private function
function sendResponse(response, error, results){
	if(error){
		response.send(200, {"Content-Type": "text/plain"}, JSON.stringify(error));
	} else if(results.redirectUrl){
		response.send(301, { 'Location': results.redirectUrl, "Content-Type": "text/plain"});
	} else if(results.statusCode && results.statusCode == 401){
		response.send(200, {"Content-Type": "text/plain"}, results.data);
	} else if(results.status){
		response.send(200, {"Content-Type": "text/plain"}, results.status);
	} else{
		response.send(200, {"Content-Type": "text/plain"}, results);
	}
}

oauth.initRouter = function(router){
	router.dispatch.addUrlHandlers({
	    '/oauth': {
	        '/login': function (request, response, next) {
	        	if(oauth.getDefautlSimplePortalOAuth())
		        	defaultSimplePortalOAuth.login(request, function(error, results){
		        		sendResponse(response, error, results);
		        	});
	        },
	        '/logout': function (request, response, next) {
	        	if(oauth.getDefautlSimplePortalOAuth())
		        	defaultSimplePortalOAuth.logout(request, function(){
		        		var actionurl = request.headers['referer'];
		        		if(!actionurl)
		        			actionurl = '/'
		        		response.send(302, {
							'Location': actionurl,"Content-Type": "text/plain"
	                    });
			        });
	        },
	        '/callback': function (request, response, next) {
	        	if(oauth.getDefautlSimplePortalOAuth())
		        	defaultSimplePortalOAuth.callback(request, function(error, results){
		        		sendResponse(response, error, results);
		        	});
	        },
	        '/status': function (request, response, next) {
	        	if(oauth.getDefautlSimplePortalOAuth())
		        	defaultSimplePortalOAuth.status(request, function(error, results){
		        		sendResponse(response, error, results);
		        	});
	        }
	    }
	});
}

oauth.init = function(configuration){
	logger.info('Simple Portal -oauth', 'Initializing Oauth service!!!');
	if(configuration && configuration.oauth){
		options = configuration.oauth;
		
		for(provider in options){
			var localPort = configuration.port;
			if(configuration.hidePort)
				localPort = '80';
			options[provider].localHost = util.constructUrl({host:configuration.host, port:localPort, secure:configuration.secure});
		}
		defaultSimplePortalOAuth = new SimplePortalOAuth(configuration.oauth.use, options[configuration.oauth.use]);
	} else
		logger.info('Simple Portal -oauth', 'Oauth configuration is not done properly!!!');
}
