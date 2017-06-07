"use strict";

/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal
 * MIT Licensed
 */
var OAuth = require('oauth').OAuth,
	OAuth2 = require('oauth').OAuth2,
	util = require('./../util'),
	url = require('url'),
	path = require('path'),
	querystring= require('querystring'),
	Oauthloader = require('./../router/oauthloader');
//	logger = require("./../logger");

/**
 * OAuth wrapper by Simpleportal  
 * 	
 * @class OauthProvider
 * @module simpleportal
 * @submodule wrapper
 * 
 * @constructor
 * 
 * @param {} oauthProvider
 * @param {} configuration COnfiguration object for the oAuth wrapper
 */
var OauthProvider = function(providerid, configuration, oauthloader){
	var instance = this;
	
	if(oauthloader && oauthloader.DEFAULT_PROPS)
		DEFAULT_PROPS = oauthloader.DEFAULT_PROPS;
	
	if(typeof providerid == "object") {
		instance._configuration = util.extendJSON({}, DEFAULT_PROPS, configuration || {});
		
		providerid = null;
	}else
		instance._configuration = util.extendJSON({}, DEFAULT_PROPS, configuration || {});
	
	if(!providerid && instance.getConfiguration("oauthprovider"))
		providerid = instance.instance.getConfiguration("oauthprovider");
	
	instance.providerid = providerid;
	//replace the default url to provider specific url
	var dynprops = ["authorizeCallback", "loginUrl", "successUrl"];
	for(var prop in dynprops){
		var dynprop = instance.getConfiguration(dynprops[prop]);
		
		if(dynprop.indexOf( "/" + instance.providerid ) == -1){
			instance.setConfiguration(dynprops[prop], dynprop.replace("/oauth/", "/oauth/" + instance.providerid + "/"));
		}
	}
	
	/**
	 * Only create the instance on initialize
	 */
	createInstance(instance);
	
//	if(oauthloader instanceof Oauthloader)
		this._oauthloader=oauthloader;
	
	return instance;
}

/**
 * To get the Oauth default Object 
 * 
 * @method getOAuthObjct
 * @return oauthObject Oauth wrapper object instance
 */
OauthProvider.prototype.getOAuthClient = function(request, accessdata){
	var instance = this;
	
	var oauthclient;
	// check if it is oauth 2
	var isOauth2 = instance.getConfiguration("oauth2");
	if(isOauth2){
		var oauthHost = util.constructUrl({
			port:instance.getConfiguration('oauthPort'), 
			host:instance.getConfiguration('oauthHost'), 
			secure:instance.getConfiguration('secure')
		});
		
		oauthclient = new OAuth2(
			instance.getDefaultInstance()._consumerKey,
			instance.getDefaultInstance()._consumerSecret,
			instance.getConfiguration('oauthHost'),
			instance.getConfiguration('accessUrl')||instance.getDefaultInstance()._accessUrl,
			instance.getConfiguration('authorizeUrl')
		);
	}else{
		oauthclient = new OAuth(
			instance.getDefaultInstance()._requestUrl,
			instance.getDefaultInstance()._accessUrl,
			instance.getDefaultInstance()._consumerKey,
			instance.getDefaultInstance()._consumerSecret,
			instance.getDefaultInstance()._version,
			instance.getDefaultInstance()._authorize_callback,
			instance.getDefaultInstance()._signatureMethod
		);
	}
	
	if(request && typeof request.getUserprofile == "function" ){ //@TODO logged in user can update the access token ??
		var userprofile = request.getUserprofile();
		
		if(userprofile && userprofile.oauth && userprofile.oauth[instance.providerid]){
    		accessdata = userprofile.oauth[instance.providerid];
    	}else if(request && request.session && request.session.oauth){
    		accessdata = request.session.oauth[instance.providerid];
    	}
	}

	if(accessdata){
		var accesspropstocopy = ["request_token", "request_token_secret", "access_token", "access_token_secret", "oauth_token", "oauth_token_secret"];
		for(var i in accesspropstocopy)
			if(accessdata[accesspropstocopy[i]])
				oauthclient[accesspropstocopy[i]] = accessdata[accesspropstocopy[i]];
	}

	return oauthclient;
}

/**
 * To get the corresponding oauth loader
 */
OauthProvider.prototype.getLogger = function(){
	return this._oauthloader.getServerInstance().getLogger();
}

/**
 * To get the corresponding oauth loader
 */
OauthProvider.prototype.getOauthloader = function(){
	return this._oauthloader;
}

OauthProvider.prototype.getDefaultInstance = function(accessdata){
	return this._oauthinstance;
}

/**
 * Method which is executed upon callback from the remote server
 * 
 * @method callback
 * 
 * @param {object} request http request from the remote server
 * @param {callback} callback The callback to excecute when complete
 */
OauthProvider.prototype.callback = function(request, callback){
	var instance = this;
	
	var oauthClient = instance.getOAuthClient(request);
	
	if(instance.getConfiguration("oauth2")){
		
		var oauthquery = request.query;
		if(oauthquery && oauthquery.code) {
			var params = instance.getConfiguration("params");
				params.grant_type = 'authorization_code';
			
			delete params.response_type;
			
			oauthClient.getOAuthAccessToken(oauthquery.code, params, function(error, oauth_access_token, oauth_access_token_secret, results){
				if (error){
//					instance.getLogger().getInstance().warn('Oauth Wrapper', error);
					console.log(error);
					callback(error, {});
				} else {
					instance.getLogger().warn('Oauth Wrapper', 'Oauth Access -results - ' + JSON.stringify(results));
					
					var tokendata = {oauthproviderkey:instance.providerid};
					
					tokendata.access_token = oauth_access_token;
					tokendata.access_token_secret = oauth_access_token_secret;
					tokendata.loggedIn = true;
					
					callback(null, {
						redirectUrl: instance.getConfiguration("successUrl")
					}, tokendata);
				}
			});
		}
	}else{
		if(!(oauthClient.request_token && oauthClient.request_token_secret)){
			callback(null, {loggedIn:false});
		} else{
			console.log("INFO:>> verifying the request token and exchanging with access_token - " + instance.providerid);
			oauthClient.getOAuthAccessToken(oauthClient.request_token, oauthClient.request_token_secret, function(error, oauth_access_token, oauth_access_token_secret, results){
				if (error){
					instance.getLogger().getInstance().warn('Oauth Wrapper', error);
					callback(error, {});
				} else {
					instance.getLogger().warn('Oauth Wrapper', 'Oauth Access -results - ' + JSON.stringify(results));
					
					var tokendata = {oauthproviderkey:instance.providerid};
					
					tokendata.access_token = oauth_access_token;
					tokendata.access_token_secret = oauth_access_token_secret;
					tokendata.loggedIn = true;
					
					callback(null, {
						redirectUrl: instance.getConfiguration("successUrl")
					}, tokendata);
				}
			});
		}
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
OauthProvider.prototype.login = function(request, callback){
	var instance = this;
	
	instance.status(request, function(error, statusinfo){
		if((error && error.loginUrl) || (statusinfo && !statusinfo.loggedIn))
			instance.request(request, callback);	
		else
			callback(error, statusinfo);
	});
}

/**
 * To logout from the remote server
 * 
 * @method logout
 * 
 * @param {} request http request from the user
 * @param {callback} callback The callback to excecute when complete
 * @TODO Nee do invoke remote url to log out any server resources 
 */
OauthProvider.prototype.logout = function(request, callback){
	var instance = this;
	
	request.session.oauth = null;
	request.session.destroy(function(err){});//connect session specific
	
	callback();
}

/**
 * To request for request token from the oauth provider server
 * 
 * @method request
 * @param {} request http request from the user
 * @param {callback} callback The callback to excecute when complete
 */
OauthProvider.prototype.request = function(request, callback){
	var instance = this;
	
	var oauthClient = instance.getOAuthClient(request);
	
	instance.getLogger().debug('Oauth Wrapper', 'OAuth - requesting for request token');
	
	if(instance.getConfiguration("oauth2")){
		var authorizeUrl = oauthClient.getAuthorizeUrl(instance.getConfiguration("params"));
		
		callback(null, {
			redirectUrl: authorizeUrl
		}, {});
	}else
		oauthClient.getOAuthRequestToken(function(error, request_token, request_token_secret, results){
			if (error){
				instance.getLogger().warn('Oauth Wrapper', error);
				
				callback(error, {});
			} else {
				var tokendata = {
					oauthproviderkey	:instance.providerid, 
					request_token		:request_token, 
					request_token_secret:request_token_secret
				}
					
				var authorizeUrl = instance.getAuthorizeUrl(request, request_token);
				
				callback(null, {
					redirectUrl	: authorizeUrl
				}, tokendata);
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
OauthProvider.prototype.status = function(request, callback){
	var instance = this;
	
	if(request && typeof request.getUserprofile == "function") { //@TODO logged in user can update the access token ??
		var userprofile = request.getUserprofile();
		
		if(userprofile && userprofile.oauth && userprofile.oauth[instance.providerid]){
    		var accessdata = userprofile.oauth[instance.providerid];
    		
    		if(accessdata && accessdata.access_token)
    			callback(null, {status:'Oauth token available', loggedIn:true});
    		else
    			callback(null, {status:'No oauth token available', loggedIn:false, loginUrl:instance.getDefaultInstance().loginUrl});
    	}else
    		callback(null, {status:'No oauth token available', loggedIn:false, loginUrl:instance.getDefaultInstance().loginUrl});
	} else if(request.session && request.session.oauth && request.session.oauth[instance.providerid] && request.session.oauth[instance.providerid].loggedIn){
		callback(null, {status:'Logged In', loggedIn:true, logoutUrl:instance.getDefaultInstance().logoutUrl});
	} else{
		callback(null, {status:'Not Logged In', loggedIn:false, logoutUrl:instance.getDefaultInstance().logoutUrl, loginUrl:instance.getDefaultInstance().loginUrl});
	}
}

/**
 * @method getUrl
 * To get url of the provider
 */
OauthProvider.prototype.getUrl = function(){
	var instance = this;
	
	// server_option
	return (instance.getConfiguration("secure") ? "https://" : "http://") 
		+ instance.getConfiguration("oauthHost") 
		+ (
			(instance.getConfiguration("oauthPort") == 443 || instance.getConfiguration("oauthPort") == 80) ?  "" : instance.getConfiguration("oauthPort")
		);
}

/**
 * To process an incoming http request object and get the current 
 * logged in users oauth access data to be able to pass it to the remote server
 * 
 */
OauthProvider.prototype.processUrl = function(default_server_options, request, accessdata){
	// server_option
	var instance = this;
	
	var _oauthClient = instance.getOAuthClient(request, accessdata);
	
	var server_options = util.extendJSON({}, default_server_options);

	var server_path;// = util.constructUrl(server_options);
	if(server_options.path && (server_options.path.indexOf("http://") != -1 || server_options.path.indexOf("https://") != -1))
		server_path = server_options.path;
	else {
		server_options.host = instance.getConfiguration("oauthHost");
		server_options.port = instance.getConfiguration("oauthPort");
		server_options.secure = instance.getConfiguration("secure");
		
		server_path = util.constructUrl(server_options);
	}	
	
	var sign_url;
	if(instance.getConfiguration("oauth2")){
		sign_url = server_path;
		if(server_path.indexOf("?") == -1)
			sign_url = server_path + '?';
		else
			sign_url = server_path + '&';
		
		sign_url = sign_url + 'access_token=' + _oauthClient.access_token+ '&client_id=' +_oauthClient._clientId;
	}else
		sign_url = _oauthClient.signUrl(server_path, _oauthClient.access_token, _oauthClient.access_token_secret, (server_options.method||"GET"));

    var parsedUrl = url.parse(sign_url, false );
	
    server_options.path = parsedUrl.path;
    server_options.host = parsedUrl.host;
    server_options.port = parsedUrl.protocol == "https:" ? '443' : parsedUrl.port;
    server_options.secure = parsedUrl.protocol == "https:";
    
    //REMOVE oauth params from the url
    delete server_options.oauth;
    delete server_options.oauthprovider;
    
    return server_options;
}

OauthProvider.prototype.call = function(method, request, callback){
	var instance = this;
	if(/request|login|status|callback|getProfile/.test(method))
		instance[method](request, callback);
	else callback("Not a valid method - " + method)
}

/**
 * To get the profile details from the remote provider
 * 
 */
OauthProvider.prototype.getProfile = function(request, callback){
	var instance = this;
	
	if(!request.getUserprofile() 
		&& request.session.oauth 
		&& request.session.oauth[instance.providerid] 
		&& request.session.oauth[instance.providerid].access_token){
		
		instance.getJSON({
			path: instance.getConfiguration("profileUrl", "/services/oauth/rest/profile")
		}, request, callback);
	}else if(!request.getUserprofile())
		callback("Oauth token data not available - " + instance.providerid, {loggedIn:false})
	else
		instance.getJSON({
			path: instance.getConfiguration("profileUrl", "/services/oauth/rest/profile")
		}, request, callback);
}

/**
 * To submit any remote data to the server
 * 
 * @method post
 * 
 * @params server options server url info normally host info is empty should be retreived from the provider itself
 * @params request http client request for which the rmeote api is invoked
 * @params callback callback after the remote data is retrieved
 * 
 * @params access data oauth token required for the remote request
 */
OauthProvider.prototype.post = function(server_options, request, callback, accessdata){
	var instance = this;
	
	server_options = instance.processUrl(server_options, request, accessdata);
	
	util.post(server_options, request, callback);
}

/**
 * To get a remote json data from the oauth provider server
 * 
 * @method getJSON
 * 
 * @params server options server url info normally host info is empty should be retreived from the provider itself
 * @params request http client request for which the rmeote api is invoked
 * @params callback callback after the remote data is retrieved
 * 
 * @params access data oauth token required for the remote request
 */
OauthProvider.prototype.getJSON = function(server_options, request, callback, accessdata){
	var instance = this;
	
	server_options = instance.processUrl(server_options, request, accessdata);
	
	util.getJSON(server_options, request, callback);
}

OauthProvider.prototype.getConfiguration = function(key, defaultvalue){
	if(key)
		return this._configuration[key]||defaultvalue;
	else
		return this._configuration;
}

OauthProvider.prototype.setConfiguration = function(key, value, changeInstance){
	var instance = this;
	
	if(key && typeof key != "object" && value)
		this._configuration[key] = value;
	
	else if(typeof key == "object"){
		util.extendJSON(this._configuration, key);
		changeInstance = value;
	}
	
	/**
	 * Only create the instance on initialize
	 */
	if(changeInstance)
		createInstance(instance);
}

OauthProvider.prototype.getAuthorizeUrl = function(request, oauth_token){
	var instance = this;
	
	var authorizeUrl;
	
	if(this._authorizeUrl)
		authorizeUrl = this._authorizeUrl;
	else {
		var oauthHost = util.constructUrl({
			port 	: instance.getConfiguration('oauthPort'), 
			host	: instance.getConfiguration('oauthHost'), 
			secure 	: instance.getConfiguration('secure')
		});
		
		authorizeUrl = oauthHost + instance.getConfiguration('authorizeUrl');
	}
	
	// get the token data
	
	if(authorizeUrl && oauth_token && typeof oauth_token == "string"){
		if(authorizeUrl.indexOf('?') ==  -1)
			authorizeUrl += '?';
		else
			authorizeUrl += '&';
		
		authorizeUrl += 'oauth_token=' + oauth_token + '&ct=' + (new Date()).toJSON() + '&oauth_callback=' + instance.getAuthorizeCallbackUrl(request);
	} else if(authorizeUrl && oauth_token && typeof oauth_token == "object"){
		if(authorizeUrl.indexOf('?') ==  -1)
			authorizeUrl += '?';
		else
			authorizeUrl += '&';
		
		authorizeUrl += util.makeURLString(oauth_token, '&');
	}
	
	return authorizeUrl;
}

OauthProvider.prototype.getAuthorizeCallbackUrl = function(request){
	var instance = this;
	
	var callbackurl = instance.getConfiguration('authorizeCallback');
	
	/**
	 * @TODO find the callback url based on the current url when the user is accessing the oauth service
	 */
	var localHost = instance.getConfiguration('localHost');
	if(request){
		// may be we need to find whether it is http or https 
		localHost = (instance.getConfiguration("secure") == "true" ? "https://" : "http://") + request.header("host");
	}
	
	if(instance.getConfiguration('authorizeCallback') && instance.getConfiguration('authorizeCallback').indexOf('://') == -1)
		callbackurl = localHost + instance.getConfiguration('authorizeCallback');
	
	return callbackurl;
}

OauthProvider.prototype.isValid = function(){
	var instance = this;
	
	return instance.getConfiguration('consumerKey') && instance.getConfiguration('consumerSecret');
}

var DEFAULT_PROPS = OauthProvider.DEFAULT_PROPS = {};// require("./../../server/oauth.default.json");

/**
 * Private method to create an instance of the oauth wrapper object which can be used for accessing remote data
 * 
 * @method createInstance
 * @param {} oauthProvider 
 */
var createInstance = function(instance){
	if(instance.getConfiguration()) {
		/**
		 * Collect oauth host info
		 * port number
		 * host
		 * secure true or false based on http or https
		 */
		var oauthHost = util.constructUrl({
			port:instance.getConfiguration('oauthPort'), 
			host:instance.getConfiguration('oauthHost'), 
			secure:instance.getConfiguration('secure')
		});
		
		/**
		 * underlying oauth object is the nodejs oauth implementation
		 */
		instance._oauthinstance = new OAuth(
			oauthHost + instance.getConfiguration('requestUrl'),
			oauthHost + instance.getConfiguration('accessUrl'),
			instance.getConfiguration('consumerKey'),
			instance.getConfiguration('consumerSecret'),
			instance.getConfiguration('version'),
			instance.getAuthorizeCallbackUrl(),
			instance.getConfiguration('signatureMethod')
		);
		
		instance.setConfiguration("_authorizeUrl", oauthHost + instance.getConfiguration('authorizeUrl'));
	}
}

module.exports = OauthProvider;