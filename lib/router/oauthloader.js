"use strict";

/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012-2017 Faisal(admin@simpleportaljs.com)
 *	
 * MIT Licensed
 */
var DispatchWrapper= require("./../util/spdispatch"),
	events = require('events'),
	Routerclass = require("./router"),
	Oauthprovider = require("./../service/oauthprovider"),
	util=require("./../util");

/**
 * Router class for
 */
var Oauthloader = module.exports = function(options, serverInstance){
	var instance = this;

	/*
	 * Registering service loader with the nodejs event emitter 
	 */
	Routerclass.call(this, options, serverInstance);
	if(serverInstance)
		try{
			Oauthprovider.DEFAULT_PROPS =instance.DEFAULT_PROPS = require(serverInstance.getServerCorePath("oauth.default.json"));
		} catch(error){
			instance.DEFAULT_PROPS = {};
			console.trace(error);
		}
			
	options = options||{};
	instance.routerid = options.routerid||"oauthloader";
	instance.preferencekey = 'oauth';
	
	instance.oauthproviders={};
	
	instance.on("register.provider", function(providerconfig){
		if(providerconfig){
			var keys = Object.keys(providerconfig);
			for(var i in keys){
				var provider = keys[i];
				
				instance.registerProvider(provider, providerconfig[provider]);
			}
		}
	});
	
	instance.on("provider.active", function(providerconfig){
		var oauthprovider = instance.oauthproviders[providerconfig.provider];
		
		if(oauthprovider && oauthprovider.createaccount && oauthprovider.consumerKey && oauthprovider.consumerSecret){
			var oauthloginlinks = instance.getServerInstance().getConfiguration("oauthloginlinks", []);
			
			if(!util.jsonarraycontains(oauthloginlinks, 'provider', providerconfig.provider)) {
				oauthloginlinks.push({
					loginlink:"/oauth/" + providerconfig.provider + "/login",
					provider:providerconfig.provider, 
					title:oauthprovider.title||providerconfig.provider
				});
			
				instance.getServerInstance().setConfiguration("oauthloginlinks", oauthloginlinks);
			}
		}
	});
	
	return instance;
};
require("util").inherits(Oauthloader, Routerclass);

Oauthloader.prototype.registerProvider = function(provider, oauthprovider){
	var instance = this;
	
	var providerconfig = instance.oauthproviders[provider];
	
	if(providerconfig && !(providerconfig && !(providerconfig.consumerSecret || providerconfig.consumerKey)))
		return;
	
	if(provider != 'use' && provider != 'new') {
		var localPort = instance.getServerInstance().getConfiguration("port");
		if(instance.getServerInstance().getConfiguration("hidePort"))
			localPort = '80';
		
		var localHost = instance.getServerInstance().getConfiguration("host");
		
		oauthprovider.localHost = util.constructUrl({
			host:localHost, 
			port:localPort, 
			secure:instance.getServerInstance().getConfiguration("secure")
		});
		
		instance.oauthproviders[provider] = oauthprovider;
		
		if(oauthprovider.createaccount && oauthprovider.consumerKey && oauthprovider.consumerSecret){
			var oauthloginlinks = instance.getServerInstance().getConfiguration("oauthloginlinks", []);
			
			if(!util.jsonarraycontains(oauthloginlinks, 'provider', provider)) {
				oauthloginlinks.push({
					loginlink:"/oauth/" + provider + "/login",
					provider:provider, 
					title:oauthprovider.title||provider
				});
			
				instance.getServerInstance().setConfiguration("oauthloginlinks", oauthloginlinks);
			}
		}
		
		// let us check if a new oauth config is being added then fire the event
		var serveroatuhconfig = instance.getServerInstance().getConfiguration("oauth");
		if(!serveroatuhconfig || !serveroatuhconfig[provider])
			instance.emit("provider.loaded", oauthprovider);
		
		// how about searching for the values which is not found in the db.
		if(!providerconfig || (providerconfig && !(providerconfig.consumerKey && providerconfig.consumerSecret))){
			console.log("collecting oauth provider");
		
			instance.getSavedPreference(provider + "_config", function(error, savedconfig){
				var savedoauthconfig = savedconfig ? savedconfig.preference : null;
				
				if(savedoauthconfig && savedoauthconfig.provider 
					&& (savedoauthconfig.consumerKey && savedoauthconfig.consumerSecret)
					&& !(oauthprovider.consumerKey && oauthprovider.consumerSecret)
				){
					// set the values in to the db.
					instance.oauthproviders[provider].consumerSecret = savedoauthconfig.consumerSecret;
					instance.oauthproviders[provider].consumerKey = savedoauthconfig.consumerKey;
					
					instance.emit("provider.active", {provider:provider});
				} else if(oauthprovider.consumerKey && oauthprovider.consumerSecret){
					instance.savePreference(provider + "_config", {provider:provider, consumerKey:oauthprovider.consumerKey, consumerSecret:oauthprovider.consumerSecret}, function(error, data){
						// check the savedpreference for this provider.
						console.log("we saved the oauth provider values in to the db.");
						
						instance.emit("provider.active", {provider:provider});
					});
				}
			});
		}else if(oauthprovider.consumerKey && oauthprovider.consumerSecret)
			instance.on("provider.active", {povider:provider});
	}
}

Oauthloader.prototype.loadRouter = function(configuration, callback){
	var instance = this;
	
	var oauthconfig = instance.getServerInstance().getConfiguration("oauth");
	
	if(oauthconfig){
		var oauthkeys = Object.keys(oauthconfig);
		
		for(i in oauthkeys){
			var provider = oauthkeys[i];
			
			var oauthprovider = oauthconfig[provider];
			
			if(provider != 'use' && provider != 'new') {
				var localPort = instance.getServerInstance().getConfiguration("port");
				if(instance.getServerInstance().getConfiguration("hidePort"))
					localPort = '80';
				
				var localHost = instance.getServerInstance().getConfiguration("host");
//				if(localHost != 'localhost')
//					localHost = instance.getServerInstance().getConfiguration("hostip", localHost);
				
				oauthprovider.localHost = util.constructUrl({
					host:localHost, 
					port:localPort, 
					secure:instance.getServerInstance().getConfiguration("secure")
				});
				
				instance.routers[provider] = oauthprovider;
				instance.oauthproviders[provider] = oauthprovider;
			}
		}
	} else
		instance.getLogger().warn('Simple Portal - oauthloader', 'Oauth configuration is not done properly');
	
	/**
	 * Set oauth login links
	 */
	if( instance.oauthproviders ){
		var _oauthproviders = Object.keys(instance.oauthproviders);
		var oauthloginlinks = [];
		for(var i = 0; i< _oauthproviders.length; i++) {
			var oauthprovider = instance.oauthproviders[_oauthproviders[i]];
			
			if(oauthprovider.createaccount && oauthprovider.consumerKey && oauthprovider.consumerSecret){
				oauthloginlinks.push({
					loginlink:"/oauth/" + _oauthproviders[i] + "/login",
					provider:_oauthproviders[i], 
					title:oauthprovider.title||_oauthproviders[i]
				});
			}
		}
		instance.getServerInstance().setConfiguration("oauthloginlinks", oauthloginlinks);
	}
	
	instance.emit("router.loaded");
	
	if(callback)
		callback();
}

/**
 * To get the details of a plugin
 * 
 * @method getPluginDetails
 * 
 * @param {string} pluginid id of the plugin 
 * 
 * @return {object} plugindetails object of the plugin setting
 */
Oauthloader.prototype.getOauthProvider = function(providerid, callback){
	var instance = this,
		providerinfo = this.oauthproviders[providerid],
		providerinstance,
		error;
	
	if(providerinfo)
		providerinstance = new Oauthprovider(providerid, providerinfo, instance);
	else
		error = "Not a valid oauth provider, contact administrator, or verify your url!";
	
	if(callback)
		callback(error, providerinstance);
	else
		return providerinstance;
}

Oauthloader.prototype.getOauthProviders = function(){
	var instance = this;
	
	return instance.oauthproviders;
}

Oauthloader.prototype.call = function(provider, method, request, response, callback){
	var instance = this;
	
	instance.getOauthProvider(provider, function(error, oauthprovider){
		if(oauthprovider) {
			if(oauthprovider.getConfiguration("consumerKey") && oauthprovider.getConfiguration("consumerSecret"))
				oauthprovider.call(method, request, callback);
			else
				callback("Configuration for oauth provider - '"+  provider + "' not complete, contact administrator.")
		} else if(error && callback)
			callback(error)
	});
}

/**
 * Default function to load the router in to the dispatch wrapper
 */
Oauthloader.prototype.registerViewHandler = function(){
	var instance = this;
	
	instance.addUrlHandle("POST /oauth/:provider/register", function(request, response, callback, provider){
		instance.getOauthProvider(provider, function(error, oauthprovider){
			if(oauthprovider) {
				if(oauthprovider.getConfiguration("consumerKey") && oauthprovider.getConfiguration("consumerSecret"))
					callback("Configuration for oauth provider - '"+  provider + "' exists and changing the configuration values not possible now.");
				else{
					var configdata = request.body;
					if(configdata && configdata.consumerSecret && configdata.consumerKey){
//						oauthprovider.setConfiguration(configdata, true);
						instance.registerProvider(provider, configdata);
						
						response.json(configdata);
					}else
						sendResponse(response, 'Please provide valid oauth configuration.');
				}
			} else if(error)
				sendResponse(response, error||'oauth configuration is not available, contact administrator');
		});
	});
	
	instance.addUrlHandle("/oauth/:provider/status", function(request, response, next, provider){
		instance.call(provider, "status", request, response, function(error, oauthinfo, tokendata){
			if(oauthinfo && oauthinfo.loggedIn)
				oauthinfo.redirectUrl = "/landing";
			
			else if(error||!oauthinfo)
				sendResponse(response, error||'No oauth tokens for the current user');
			else 
				response.send(302, { 'Location': oauthinfo.redirectUrl});
		});
	});
	
	instance.addUrlHandle("/oauth/:provider/login", function(request, response, next, provider){
		instance.call(provider, "login", request, response, function(error, oauthinfo, tokendata){
			if(error)
				sendResponse(response, error);
			else{
				if(tokendata){
					if(!request.getUserprofile()){
						if(!request.session.oauth)request.session.oauth = {};
						
						request.session.oauth[provider] = tokendata;
					} else
						instance.getServiceloader().getService("userprofile").updateOauthToken(request, tokendata, function(uperror, updata){
							if(uperror){
								console.log(uperror);
							}
							console.log(updata);
						});	
				} else if(oauthinfo.loggedIn)
					oauthinfo.redirectUrl = "/landing";
				
				response.send(302, { 'Location': oauthinfo.redirectUrl});
			}	
		});
		
//		instance.getOauthProvider(provider, function(error, oauthprovider){
//			oauthprovider.login(request, function(error, oauthinfo, tokendata){
//				if(tokendata){
//					if(!request.getUserprofile()){
//						if(!request.session.oauth)request.session.oauth = {};
//						
//						request.session.oauth[provider] = tokendata;
//					} else
//						instance.getServiceloader().getService("userprofile").updateOauthToken(request, tokendata, function(uperror, updata){
//							if(uperror){
//								console.log(uperror);
//							}
//							console.log(updata);
//						});	
//				}	
//				else if(oauthinfo.loggedIn)
//					oauthinfo.redirectUrl = "/landing";
//				
//				response.send(302, { 'Location': oauthinfo.redirectUrl});
//			});
//		});
	});
	
	
	instance.addUrlHandle("/oauth/:provider/logout", function(request, response, next, provider){
		if(!request.getUserprofile()){
			if(request.session.oauth && request.session.oauth[provider])
				delete request.session.oauth[provider];
		} else{
			instance.getServiceloader().getService("userprofile").removeOauthToken(request, provider, function(error){
				sendResponse(response, error, {redirectUrl:"/landing"});
			});	
		}
	});
	
	instance.addUrlHandle("/oauth/:provider/profile", function(request, response, next, provider){
		instance.getOauthProvider(provider, function(error, oauthprovider){
			if(request.getUserprofile() && request.getUserprofile()[provider + "profile"])
				response.json(request.getUserprofile()[provider + "profile"])
			else if(!request.getUserprofile())
				response.redirect(oauthprovider.getConfiguration("loginUrl"), 302, request)
			else
				oauthprovider.getProfile(
					request, function(error, remoteprofile){
						console.log(remoteprofile);
						console.log(error);
						
						if(!error)
							instance.getServiceloader().getService("userprofile").updateOauthProfile(
								request, provider, remoteprofile, 
								function(error, updata){
									if(error)console.log(error);
									response.json(remoteprofile, error)
								}
							);
						else
							response.json(remoteprofile, error)
					}
				);
		});
	});
	
	instance.addUrlHandle("/oauth/:provider/callback", function(request, response, next, provider){
		instance.getOauthProvider(provider, function(error, oauthprovider){
			// let me print the userprofile
			oauthprovider.callback(request, function(error, oauthinfo, tokendata){
				// now fire an event to store this in to the profile database
				
				if(tokendata){
					if(!request.getUserprofile()) {
						console.log("INFO:>> user is not logged in and using  session to update the token")
						
						if(!request.session.oauth)request.session.oauth = {};
						request.session.oauth[provider] = tokendata;
						
						if(!oauthinfo)oauthinfo={}
						if(oauthinfo){
							oauthinfo.redirectUrl = "/oauth/" + provider + "/logincallback";
						}
						
						sendResponse(response, error, oauthinfo);
					}else
						instance.getServiceloader().getService("system_userprofile").updateOauthToken(request, tokendata, function(uperror, updata){
							instance.emit("oauth.login", {userprofile:updata});
							
							if(!oauthinfo)oauthinfo={}
							if(oauthinfo && !oauthinfo.redirectUrl){
								oauthinfo.redirectUrl = instance.getServerInstance().getConfiguration("userlandinguri");
							}
							
							sendResponse(response, error, oauthinfo);
						});
				} else{
					if(!oauthinfo)oauthinfo={}
					if(oauthinfo && !oauthinfo.redirectUrl){
						oauthinfo.redirectUrl = instance.getServerInstance().getConfiguration("userlandinguri");
					}else if(oauthinfo && !oauthinfo.loggedIn)
						oauthinfo.redirectUrl = oauthprovider.getConfiguration("loginUrl");
					
					sendResponse(response, error, oauthinfo);
				}
			});
		});
	});
	
//	instance.addUrlHandle("/oauth/:provider/test", function(request, response, next, provider){
//		
//	});
}

Oauthloader.prototype.getRouterDefaults = function(callback){
	var oauthdefaults = this.DEFAULT_PROPS;
	
	return oauthdefaults;
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
	} else if(results && results.redirectUrl){
		response.send(302, { 'Location': results.redirectUrl, "Content-Type": "text/plain", 'Cache-Control':'no-cache, no-store, max-age=0, must-revalidate'});
	} else if(results && results.statusCode && results.statusCode == 401){
		response.send(200, {"Content-Type": "text/plain"}, results.data);
	} else if(results && results.status){
		response.send(200, {"Content-Type": "text/plain"}, results.status);
	} else{
		response.send(200, {"Content-Type": "text/plain"}, results||'');
	}
}