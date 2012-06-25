/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var OAuth = require('oauth').OAuth;
var util = require('./../util');

var SimplePortalOAuth = function(oauthProvider){
	var instance = this;
	
	instance.oauthProvider = oauthProvider;
	instance.createInstance(oauthProvider);
}

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
	
	return oauthObject;
}

SimplePortalOAuth.prototype.createInstance = function(oauthProvider){
	var instance = this;
	
	if(options && options[oauthProvider]){
		instance.configuration = options[oauthProvider];
		
		var oauthHost = util.constructUrl({port:instance.configuration.oauthPort, host:instance.configuration.oauthHost, secure:instance.configuration.secure});
		
		instance.oauthObject = new OAuth(
			oauthHost + instance.configuration.requestUrl,
			oauthHost + instance.configuration.accessUrl,
			instance.configuration.consumerKey,
			instance.configuration.consumerSecret,
			instance.configuration.version,
			instance.configuration.localHost + instance.configuration.authorizeCallback,
			instance.configuration.signatureMethod
		);
		instance.oauthObject.loginUrl = instance.configuration.localHost + instance.configuration.loginUrl;
		instance.oauthObject.logoutUrl = instance.configuration.localHost + instance.configuration.logoutUrl;
		instance.oauthObject.successUrl = instance.configuration.localHost + instance.configuration.successUrl;
		instance.oauthObject.authorizeUrl = oauthHost + instance.configuration.authorizeUrl;
	}
}

SimplePortalOAuth.prototype.callback = function(request, callback){
	var instance = this;
	
	var oauth_session =  request.session.oauth;
	if(!oauth_session){
		callback(null, {redirectUrl: instance.oauthObject.loginUrl});
	} else{
		var oAuthObject = instance.getOAuthObjct();
		
		oAuthObject.getOAuthAccessToken(oauth_session.oauth_token, oauth_session.oauth_token_secret, function(error, oauth_access_token, oauth_access_token_secret, results){
			if (error){
				console.log(error);
				callback(error, {});
			} else {
				console.log('Oauth Access -results - ' + results);
				request.session.oauth.access_token = oauth_access_token;
				request.session.oauth.access_token_secret = oauth_access_token_secret;
				request.session.oauth.loggedIn = true;
				
				callback(null, {
					  redirectUrl: request.session.oauth.successUrl
				});
			}
		});
	}
}

SimplePortalOAuth.prototype.login = function(request, callback){
	var instance = this;
	
	if(request.session.oauth && request.session.oauth.loggedIn){
		instance.status(request, callback);
	} else
		instance.request(request, callback);
}

SimplePortalOAuth.prototype.logout = function(request, callback){
	var instance = this;
	
	request.session.oauth = null;
	callback();
}

SimplePortalOAuth.prototype.request = function(request, callback){
	var instance = this;
	var oAuthObject = instance.getOAuthObjct();
	
	console.log('OAuth - requesting for request token');
	
	var parsedUrl = url.parse(request.url, false );
	var queryParam = parsedUrl.query;
	if(queryParam){
		var action = queryParam.substring(queryParam.indexOf('action=')+7);//using a fast way of getting, has to be replaced!!
		action = action.substring(action.indexOf(','));
		oAuthObject.successUrl=action;
	}
	
	oAuthObject.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
		if (error){
			console.log(error);
			callback(error, {});
		} else {
			console.log('Oauth token -' + oauth_token);
			console.log('Oauth token secret -' + oauth_token_secret);
			console.log(results);
			
			request.session.oauth = oAuthObject;
			request.session.oauth.oauth_token = oauth_token;
			request.session.oauth.oauth_token_secret = oauth_token_secret;
			
			callback(null, {
				  redirectUrl: instance.oauthObject.authorizeUrl+'?oauth_token='+oauth_token+'&oauth_callback='+instance.oauthObject._authorize_callback
			});
		}
	});
}

SimplePortalOAuth.prototype.status = function(request, callback){
	var instance = this;
	
	if(request.session.oauth && request.session.oauth.loggedIn){
		callback(null, {status:'Logged In', loggedIn:true, logoutUrl:instance.oauthObject.logoutUrl});
	} else{
		callback(null, {status:'Not Logged In', loggedIn:false, logoutUrl:instance.oauthObject.logoutUrl, loginUrl:instance.oauthObject.loginUrl});
	}
}

exports.SimplePortalOAuth = SimplePortalOAuth;