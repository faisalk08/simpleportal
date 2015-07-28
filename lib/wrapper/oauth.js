/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var OAuth = require('oauth').OAuth;

var util = require('./../util');
var url = require('url');
var querystring= require('querystring');

var logger = require("./../logger");

/**
 * OAuth wrapper by Simpleportal  
 * 	
 * @class SimplePortalOAuth
 * @module simpleportal
 * @submodule wrapper
 * 
 * @constructor
 * 
 * @param {} oauthProvider
 * @param {} configuration COnfiguration object for the oAuth wrapper
 */
var SimplePortalOAuth = function(oauthProvider, configuration){
	var instance = this;
	
	instance.oauthProvider = oauthProvider;
	instance.configuration = configuration;
	instance.createInstance(oauthProvider);
}

/**
 * To get the Oauth default Object 
 * 
 * @method getOAuthObjct
 * 
 * @return oauthObject Oauth wrapper object instance
 */
SimplePortalOAuth.prototype.getOAuthObjct = function(){
	var instance = this;
	var oauthObject = new OAuth(
		instance.oauthObject._requestUrl,
		instance.oauthObject._accessUrl,
		instance.oauthObject._consumerKey,
		instance.oauthObject._consumerSecret,
		instance.oauthObject._version,
		instance.oauthObject._authorize_callback,
		instance.oauthObject._signatureMethod
	);
	
	oauthObject.loginUrl = instance.oauthObject.loginUrl;
	oauthObject.logoutUrl = instance.oauthObject.logoutUrl;
	oauthObject.successUrl = instance.oauthObject.successUrl;
	oauthObject.authorizeUrl = instance.oauthObject.authorizeUrl;
	oauthObject.authorizedAccessUrl = instance.oauthObject.authorizedAccessUrl;
	
	oauthObject.oauthproviderkey = instance.oauthObject.oauthproviderkey;

	return oauthObject;
}

/**
 * To create an instance of the oauth wrapper object which can be used for accessing remote data
 * 
 * @method createInstance
 * 
 * @param {} oauthProvider 
 */
SimplePortalOAuth.prototype.createInstance = function(oauthProvider){
	var instance = this;
	
	if(instance.configuration){
		var oauthHost = util.constructUrl({port:instance.configuration.oauthPort, host:instance.configuration.oauthHost, secure:instance.configuration.secure});
		var callbackurl = instance.configuration.authorizeCallback;
		
		if(instance.configuration.authorizeCallback && instance.configuration.authorizeCallback.indexOf('://') == -1)
			callbackurl = instance.configuration.localHost + instance.configuration.authorizeCallback
		
		instance.oauthObject = new OAuth(
			oauthHost + instance.configuration.requestUrl,
			oauthHost + instance.configuration.accessUrl,
			instance.configuration.consumerKey,
			instance.configuration.consumerSecret,
			instance.configuration.version,
			callbackurl,
			instance.configuration.signatureMethod
		);
		
		instance.oauthObject.loginUrl = instance.configuration.localHost + instance.configuration.loginUrl;
		instance.oauthObject.logoutUrl = instance.configuration.localHost + instance.configuration.logoutUrl;
		instance.oauthObject.successUrl = instance.configuration.localHost + instance.configuration.successUrl;
		instance.oauthObject.authorizeUrl = oauthHost + instance.configuration.authorizeUrl;
		
		instance.oauthObject.authorizedAccessUrl = oauthHost + instance.configuration.authorizedAccessUrl;
		
		instance.oauthObject.oauthproviderkey = oauthProvider;
	}
}

/**
 * Method which is executed upon callback from the remote server
 * 
 * @method callback
 * 
 * @param {object} request http request from the remote server
 * @param {callback} callback The callback to excecute when complete
 */
SimplePortalOAuth.prototype.callback = function(request, callback){
	var instance = this;
	
	var oauth_session =  request.session.oauth;
	if(!oauth_session){
		callback(null, {redirectUrl: instance.oauthObject.loginUrl});
	} else{
		var oAuthObject = instance.getOAuthObjct();
		
		oAuthObject.getOAuthAccessToken(oauth_session.oauth_token, oauth_session.oauth_token_secret, function(error, oauth_access_token, oauth_access_token_secret, results){
			if (error){
				logger.getInstance().warn('Oauth Wrapper', error);
				callback(error, {});
			} else {
				logger.getInstance().warn('Oauth Wrapper', 'Oauth Access -results - ' + JSON.stringify(results));
				request.session.oauth.access_token = oauth_access_token;
				request.session.oauth.access_token_secret = oauth_access_token_secret;
				request.session.oauth.loggedIn = true;
				
				callback(null, {
					  redirectUrl: request.session.oauth.successUrl
				}, {oauthproviderkey:oAuthObject.oauthproviderkey, access_token:oauth_access_token, access_token_secret:oauth_access_token_secret});
			}
		});
	}
}

/**
 * Method which will open the login procedure for the oauth wrapper
 * 
 * @method login
 * 
 * @param {} request http request from the user
 * @param {callback} callback The callback to excecute when complete
 */
SimplePortalOAuth.prototype.login = function(request, callback){
	var instance = this;
	
	if(request.session && request.session.oauth && request.session.oauth.loggedIn){
		instance.status(request, callback);
	} else
		instance.request(request, callback);
}

/**
 * To logout from the remote server
 * 
 * @method logout
 * 
 * @param {} request http request from the user
 * 
 * @param {callback} callback The callback to excecute when complete
 */
SimplePortalOAuth.prototype.logout = function(request, callback){
	var instance = this;
	
	request.session.oauth = null;
	request.session.destroy(function(err){});//connect session specific
	//request.session = null;//connect cookie session specific
	callback();
}

/**
 * To request for request token from the oauth provider server
 * 
 * @method request
 * @param {} request http request from the user
 * @param {callback} callback The callback to excecute when complete
 */
SimplePortalOAuth.prototype.request = function(request, callback){
	var instance = this;
	var oAuthObject = instance.getOAuthObjct();
	
	logger.getInstance().debug('Oauth Wrapper', 'OAuth - requesting for request token');
	
	var parsedUrl = url.parse(request.url, false );
	var queryParam = parsedUrl.query;
	if(queryParam){
		var action = queryParam.substring(queryParam.indexOf('action=')+7);//using a fast way of getting, has to be replaced!!
		action = action.substring(action.indexOf(','));
		oAuthObject.successUrl=action;
	}
	
	oAuthObject.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
		if (error){
			logger.getInstance().warn('Oauth Wrapper', error);
			callback(error, {});
		} else {
			request.session.oauth = oAuthObject;
			request.session.oauth.oauth_token = oauth_token;
			request.session.oauth.oauth_token_secret = oauth_token_secret;
			
			if(request.session.oauth){
				request.session.oauth.user = {};
				request.session.oauth.user.admin = true;
			}
			
			var redirectUrl = instance.oauthObject.authorizeUrl;
			
			if(redirectUrl.indexOf('?') ==  -1)
				redirectUrl += '?';
			else
				redirectUrl += '&';
			redirectUrl += 'oauth_token='+oauth_token+'&ct='+(new Date()).toJSON()+'&oauth_callback='+instance.oauthObject._authorize_callback;
			
			callback(null, {
				  redirectUrl: redirectUrl
			});
		}
	});
}

/**
 * To get the status of the users request 
 * @method status
 * 
 * @param {} request http request from the user
 * @param {callback} callback The callback to excecute when complete
 * @return 
 */
SimplePortalOAuth.prototype.status = function(request, callback){
	var instance = this;
	
	if(request.session.oauth && request.session.oauth.loggedIn){
		callback(null, {status:'Logged In', loggedIn:true, logoutUrl:instance.oauthObject.logoutUrl});
	} else{
		callback(null, {status:'Not Logged In', loggedIn:false, logoutUrl:instance.oauthObject.logoutUrl, loginUrl:instance.oauthObject.loginUrl});
	}
}

/**
 * To get the authorized token from the oauth provider server
 * 
 * @method aouthorizedToken
 * 
 * @param {} params  parameters to pass to the oauth provider server
 * 
 * @param {} request http request from the user
 * @param {callback} callback The callback to excecute when complete
 */
SimplePortalOAuth.prototype.aouthorizedToken = function(params, request, callback){
	var instance = this;
	var oAuthObject = instance.getOAuthObjct();
	
	logger.getInstance().debug('Oauth Wrapper', 'OAuth - requesting for authorized access token');
	
	var parsedUrl = url.parse(request.url, false );
	var queryParam = parsedUrl.query;
	if(queryParam){
		var action = queryParam.substring(queryParam.indexOf('action=')+7);//using a fast way of getting, has to be replaced!!
		action = action.substring(action.indexOf(','));
		oAuthObject.successUrl=action;
	}
	
	oAuthObject.getOAuthAuthorizedAccessToken(params, function(error, oauth_token, oauth_token_secret, results){
		if (error){
			logger.getInstance().warn('Oauth Wrapper', error);
			callback(error, {});
		} else {
			logger.getInstance().warn('Oauth Wrapper', 'Oauth Access -results - ' + JSON.stringify(results));
			
			request.session.oauth = oAuthObject;
			
			request.session.oauth.access_token = oauth_token;
			request.session.oauth.access_token_secret = oauth_token_secret;
			request.session.oauth.loggedIn = true;
			
			callback(null, {});
		}
	});
}

/**
 * @METHOD POST
 * post data to remote server
 * 
 */
SimplePortalOAuth.prototype.post = function(server_options, request, callback, accessdata){
	//send data to remote server using util api
	var instance = this;
	var oAuthObject = instance.getOAuthObjct();
	
	// server_option
	server_options.host = instance.configuration.oauthHost;
	server_options.port = instance.configuration.port;
	server_options.secure = instance.configuration.secure;
	server_options.oauth=true;
	
	if(accessdata){
		oAuthObject.access_token=accessdata.access_token;
		oAuthObject.access_token_secret=accessdata.access_token_secret;	
	}
	
	util.post(server_options, request, callback, oAuthObject);
}

/**
 * @METHOD GET
 * get data to remote server
 * 
 */
SimplePortalOAuth.prototype.getJSON = function(server_options, request, callback, accessdata){
	//send data to remote server using util api
	var instance = this;
	var oAuthObject = instance.getOAuthObjct();
	
	// server_option
	server_options.host = instance.configuration.oauthHost;
	server_options.port = instance.configuration.oauthPort;
	server_options.secure = instance.configuration.secure;
	server_options.oauth=true;
	
	if(accessdata){
		oAuthObject.access_token=accessdata.access_token;
		oAuthObject.access_token_secret=accessdata.access_token_secret;	
	}
	
	util.getJSON(server_options, request, callback, oAuthObject);
}


exports.SimplePortalOAuth = SimplePortalOAuth;

if(OAuth)
	/**
	 *  To get the Authorized access token from the provider server
	 *  
	 * @method getOAuthAuthorizedAccessToken
	 * 
	 * @param {} extraParams parameters to pass to the oauth provider server
	 * 
	 * @param {callback} callback The callback to excecute when complete
	 */
	OAuth.prototype.getOAuthAuthorizedAccessToken= function( extraParams, callback ) {
		if( typeof extraParams == "function" ){
			callback = extraParams;
			extraParams = {};
		}

		// Callbacks are 1.0A related 
		if( this._authorize_callback ) {
			extraParams["oauth_callback"]= this._authorize_callback;
		}
		this._performSecureRequest( null, null, this._clientOptions.requestTokenHttpMethod, this.authorizedAccessUrl, extraParams, null, null, function(error, data, response) {
			if( error ) callback(error);
	    	else {
	    		var results= querystring.parse( data );
	    		var oauth_access_token= results["oauth_token"];
	    		delete results["oauth_token"];
	    		var oauth_access_token_secret= results["oauth_token_secret"];
	    		delete results["oauth_token_secret"];
	    		callback(null, oauth_access_token, oauth_access_token_secret, results );
	    	}
		});
	}