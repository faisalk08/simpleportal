/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var oauth = module.exports = {};

var util = require('./util');

var SimplePortalOAuth = require('./wrapper/oauth').SimplePortalOAuth;

var options ={};

var defaultSimplePortalOAuth;

//private function
function sendResponse(response, error, results){
	if(error){
		console.log('error');
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
	        	console.log('Login is calling');
	        	defaultSimplePortalOAuth.login(request, function(error, results){
	        		sendResponse(response, error, results);
			});
	        },
	        '/logout': function (request, response, next) {
	        	defaultSimplePortalOAuth.logout(request, function(){
	        		response.send(302, {
						'Location': '/pages',"Content-Type": "text/plain"
                                });
		        });
	        },
	        '/callback': function (request, response, next) {
	        	defaultSimplePortalOAuth.callback(request, function(error, results){
	        		sendResponse(response, error, results);
			});
	        },
	        '/status': function (request, response, next) {
	        	defaultSimplePortalOAuth.status(request, function(error, results){
	        		sendResponse(response, error, results);
			});
	        }
	    }
	});
}

oauth.init = function(configuration){
	console.log('Initializing Oauth service');
	if(configuration && configuration.oauth){
		options = configuration.oauth;
		
		for(provider in options){
			var localPort = configuration.port;
			if(configuration.hidePort)
				localPort = '80';
			options[provider].localHost = util.constructUrl({host:configuration.host, port:localPort, secure:configuration.secure});
		}
		defaultSimplePortalOAuth = new SimplePortalOAuth(configuration.oauth.use);
	} else
		console.log('Oauth configuration is not done properly!!!');
}
