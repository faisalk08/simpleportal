/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */
/**
 * Oauth middleware for `simpleportal.Server`
 *
 * @property oauth
 * @for simpleportal
 * @type {oauth}
 * @static
 */

/**
 * Oauth middleware for `simpleportal.Server`
 * 
 * @class oauth
 * @module middleware
 * @static
 */
var oauth = module.exports = {};

var util = require('./util');

var SimplePortalOAuth = require('./wrapper/oauth').SimplePortalOAuth;
var logger = require("./logger");

var options ={};

var defaultSimplePortalOAuth;

/**
 * To get the default oauth object 
 * 
 * @method getDefautlSimplePortalOAuth
 * @return defaultSimplePortalOAuth
 */
oauth.getDefautlSimplePortalOAuth = function(){
	return defaultSimplePortalOAuth;
}

/**
 * To get a Simpleportal oauth object using the configuration defined in the app configuration
 * 
 * @method getSimplePortalOAuth
 * @return {SimplePortalOAuth} object defined with the provider key in the configuration
 */
oauth.getSimplePortalOAuth = function(oauthproviderkey){
	var instance = this;
	
	if(instance.oauthproviders&&instance.oauthproviders[oauthproviderkey])
		return new SimplePortalOAuth(oauthproviderkey, instance.oauthproviders[oauthproviderkey]);
	else
		return null;
}

/**
 * To send the response back according to the message from remote server
 * @method sendResponse
 * 
 * @param {} response http response
 * @param {} error error if occured during the remote server connection
 * @param {} results
 * @private
 */
function sendResponse(response, error, results){
	if(error){
		response.send(200, {"Content-Type": "text/plain"}, JSON.stringify(error));
	} else if(results.redirectUrl){
		response.send(302, { 'Location': results.redirectUrl, "Content-Type": "text/plain", 'Cache-Control':'no-cache, no-store, max-age=0, must-revalidate'});
	} else if(results.statusCode && results.statusCode == 401){
		response.send(200, {"Content-Type": "text/plain"}, results.data);
	} else if(results.status){
		response.send(200, {"Content-Type": "text/plain"}, results.status);
	} else{
		response.send(200, {"Content-Type": "text/plain"}, results);
	}
}

/**
 * To initialize the router required for the `simpleportal.Server`
 * 
 * @method initRouter
 * @param {} router router object where the oauth handlers will be registered
 * @param {callback} callback The callback to excecute when complete
 */
oauth.initRouter = function(router, callback){
	logger.getInstance().info('Simple Portal - oauthloader : initRouter', 'Initializing oauth routers');
	
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
							'Location': actionurl,"Content-Type": "text/plain", 'Cache-Control':'no-cache, no-store, max-age=0, must-revalidate'
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
	
	if(callback)
		callback();
}

oauth.getOauthroviders = function(configuration){
	var oauthproviders =[];
	if(configuration && configuration.oauth){
		options = configuration.oauth;
		
		for(provider in options){
			if(provider != 'use'){
				var localPort = configuration.port;
				
				if(configuration.hidePort)
					localPort = '80';
				
				options[provider].localHost = util.constructUrl({host:configuration.host, port:localPort, secure:configuration.secure});

				oauthproviders[provider] = options[provider];	
			}
		}
	}
	
	return oauthproviders;
}

/**
 * To initialize the oauth middleware
 * 
 * @method init
 * @param {} configuration Configuration for the middleware
 * @param {callback} callback The callback to excecute when complete
 */
oauth.init = function(configuration, callback){
	logger.getInstance().info('Simple Portal -oauth', 'Initializing Oauth service!!!');
	var instance = this;
	instance.oauthproviders={};
	
	if(configuration && configuration.oauth){
		options = configuration.oauth;
		
		for(provider in options){
			if(provider != 'use'){
				var localPort = configuration.port;
				
				if(configuration.hidePort)
					localPort = '80';
				
				options[provider].localHost = util.constructUrl({host:configuration.host, port:localPort, secure:configuration.secure});

				instance.oauthproviders[provider] = options[provider];	
			}
		}
		
		defaultSimplePortalOAuth = new SimplePortalOAuth(configuration.oauth.use, options[configuration.oauth.use]);
	} else
		logger.getInstance().info('Simple Portal -oauth', 'Oauth configuration is not done properly!!!');
	
	if(callback)
		callback();
}
