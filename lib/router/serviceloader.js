"use strict";

/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012-2017 Faisal Kottarathil(admin@simpleportaljs.com)
 *	
 * MIT Licensed
 */
/**
 * Service | API loader middleware for `simpleportal.Server`
 *
 * @property serviceloader
 * @for simpleportal
 * @type {serviceloader}
 * @static
 */

/**
 * Service | API loader middleware for `simpleportal.Server`
 * 
 * @class serviceloader
 * @module middleware
 */
var fs = require('fs'),
	simpleportal = require('./../simpleportal'),
	util = require('./../util'),
	editorUtil=require('./../editor').Util,
	Service=require('./../service/service'),
	Routerclass = require("./router");

var ServiceLoaderConstructor = function(options, serverInstance){
	options = options||{};
	var instance = this;
	
	if(serverInstance){
		var serveroptions = {
			templatedir:serverInstance.getServerCorePath("resources/templates/service"),
			systemapidir:serverInstance.getServerCorePath("api")
		}
		options = util.extendJSON(serveroptions, options);
	}
	
	/*
	 * Registering service loader with the nodejs event emitter 
	 */
	Routerclass.call(this, options, serverInstance);
	
	instance.routerid = options.routerid||"serviceloader";
	
	instance.serviceUrl = options.serviceUrl||'/api';
	instance.viewUrl = options.viewUrl||'/view'
	instance.servicedir = options.servicedir||'api';

	instance.templatedir =  options.templatedir	|| __dirname + '/../../server/resources/templates/service';
	instance.systemapidir = options.systemapidir|| __dirname + "/../../server/api";

	instance.systemServiceUrl = options.systemServiceUrl||'system';
	instance.systemServices = [];
	
//	events.EventEmitter.call(this);
	
	// listen to server ready listener and pass on to the service
//	instance.on("server.ready", function(serverInstance){
//		console.log("Server ready");
//		instance.serverInstance = serverInstance;
//	});
	
	/**
	 * do listen to load.router
	 * {
	 * 	plugin:pluginsetting.id, 
	 *	servicedir:pluginsetting.installeddir + '/' + pluginsetting.servicedir, 
	 *	services:services_, 
	 *	serviceprefix:pluginsetting.serviceprefix
	 * }
	 */
	instance.on("load.router", function(options){
		if(options && options.plugin && options.servicedir){
			instance.loadServices(options, function(services){
				instance.emit("router.loaded." + options.plugin, services);
			});
		}
	});
	
	return this;
};

/**
 * Inherits  event emitter methods so that we can have the event methods
 */
//require("util").inherits(ServiceLoaderConstructor, events.EventEmitter);
require("util").inherits(ServiceLoaderConstructor, Routerclass);

ServiceLoaderConstructor.prototype.loadRouter = function(configuration, callback){
	var instance = this;
	
	loadSystemServices(instance, function(){
		instance.loadServices(instance.configuration, function(){
			instance.emit("router.loaded");
			
			if(callback)
				callback();
		});
	});
}


/**
 * Description
 * @method loadServices
 * @param {} configuration
 * @param {} callback
 * @return 
 */
ServiceLoaderConstructor.prototype.loadServices = function(configuration, callback){
//ServiceLoader.loadServices = function(configuration, callback){
	var instance = this;
	
	var servicedir_ = configuration && configuration.servicedir ?  configuration.servicedir : instance.servicedir;
	
	instance.getLogger().debug(instance.routerid + ':loadServices', 'loading from << ' + servicedir_);
	
	if(!fs.existsSync(servicedir_)){
		if(callback)
			callback();	
	}else {
		var stats = fs.lstatSync(servicedir_);
		if (stats.isDirectory()) {
			if(instance.configuration && instance.configuration.services && configuration && configuration.services){
				// we need to make sure we are not deleting any configuration
				if(configuration.services && configuration.services.extend){
					// inherit it not extend
					delete configuration.services.extend;
				}
				util.extendJSON(instance.configuration.services, configuration.services);
			}
			
//			loadSystemServices(instance, function(){
				// now call the normal services
				loadServices(instance, servicedir_, false, callback, configuration.plugin, configuration.serviceprefix);
//			});
			
			// it is how it is made we know which are the services
//			console.log(instance.services);
		}else if(callback)
			callback();	
	}
}

/**
 * Description
 * @method unLoadServices
 * @param {} configuration
 * @param {} callback
 * @return 
 */
ServiceLoaderConstructor.prototype.unLoadServices = function(configuration, callback){
//ServiceLoader.unLoadServices = function(configuration, callback){
	var instance = this;
	
	var servicedir_ = configuration&&configuration.servicedir ?  configuration.servicedir : instance.servicedir;
	instance.getLogger().debug(instance.routerid + ':unLoadServices', ' unoading from << -- ' + servicedir_);
	
	if(!fs.existsSync(servicedir_)){
		if(callback)
			callback();	
	} else {
		var stats = fs.lstatSync(servicedir_);
		if (stats.isDirectory()) {
			unLoadServices(instance, servicedir_, false, callback);
		}else if(callback)
			callback();
	}
}

//ServiceLoader.services={};
//ServiceLoader.services.service={};
ServiceLoaderConstructor.prototype.getServiceDetails=function(servicename){
	var instance = this;
	
	var servicedetails;
	if(!instance.routers[servicename] && instance.routers[ "system_"  + servicename])
		servicename = "system_" + servicename;
	
	var service_ = instance.routers[servicename];
	
	if(service_)
		servicedetails = service_.exportConfig();
	
	return servicedetails;
};

/**
 * Function called after Simpleportal server init 
 * 
 * Overriding method for handling the router functions
 * 
 * @method initRouter
 * 
 * @param {} router
 * @param {} callback
 */
ServiceLoaderConstructor.prototype.initRouter = function(router, callback){
//ServiceLoader.initRouter = function(router, callback){
	var instance = this;
	
	instance.getLogger().info(instance.routerid + ':initRouter', 'initializing serviceloader routers.');
	
//	router.dispatch.addServiceHandlers(ServiceLoader, ServiceLoader.systemServiceUrl, ServiceLoader.call);
//	router.dispatch.addServiceGlobalHandlers(ServiceLoader, ServiceLoader.systemServiceUrl, ServiceLoader.call);
	
//	console.log("registre view handler for entire service laoder");
//	console.log(" instance.serviceUrl ::: " + ":plugin/sampleview" + instance.serviceUrl);
	// let us add temporary tempates folder in to this loop
	// we need connect static api
//	var connect = require("connect");
	
//	console.log("Loading resources ---- " + simpleportal.util.getServerPath("._tmp/resources/templates"));
//	router.dispatch.addServiceHandlers(instance, "/view/:service", 
//		function(request, response, callback){
//			console.log("Dynamic templates");
//			console.log(request.params);
//			console.log("Request service ");
//			if(callback)
//				callback("No-files-found");
//		}
//		//connect.static(simpleportal.util.getServerPath("._tmp/resources/templates"))
//	);
	
	/**
	 * View handles for service apis
	 * plugin based sevice view
	 * 
	 * params.group1 is plugin
	 * params.group2 is the template dir
	 * params.group3 is the path group
	 *//*
	router.dispatch.addServiceHandlers(instance, "/:plugin/view/:templatedir" + instance.serviceUrl, function(service, method, request, response, next){
		var plugin = request.pathGroup;
		request.viewtemplatedir = request.params.group2;
		
		request.pathGroup = request.params.group3;
		
		delete request.params.group2;
		delete request.params.group3;
		
		if(request.params.group3)
			request.params.group1 = request.params.group3;
		
		request.viewservice=true;
		
		var webappsetting = simpleportal.pluginloader.getPluginDetails(plugin, "webapp");
		if(webappsetting){
			request.plugin = plugin;
			
			webappsetting.resourcepath = webappsetting.installeddir + "/resources/templates";
			
			request.webappsetting =webappsetting;
		}
		
		console.log(webappsetting);
		console.log("plugin based view handle - " + plugin);
		console.log("INFO: Service loader for api "+service + "  - using plugin api template handler /"+plugin+"view/" + request.viewtemplatedir + "/" + instance.serviceUrl);
		
		instance.call(service, method, request, response, next);
	});
	*/
	/**
	 * View handles for service apis
	 * 
	 * default view with template dir
	 * 
	 * params.group1 is plugin
	 * params.group2 is the template dir
	 * params.group3 is the path group
	 * 
	 *//*
	router.dispatch.addServiceHandlers(instance, "/view/:templatedir" + instance.serviceUrl, function(service, method, request, response, next){
		request.viewtemplatedir = request.pathGroup;
		
		request.pathGroup = request.params.group2;
		delete request.params.group3;
		
		if(request.params.group3)
			request.params.group1 = request.params.group3;
		if(request.params.group4)
			request.params.group3 = request.params.group4;
		
		request.viewservice=true;
	
		console.log("INFO: Service loader for api "+service + "  - using api template handler /view/" + request.viewtemplatedir + "/" + instance.serviceUrl);
		
		instance.call(service, method, request, response, next);
	});
	*/
	/**
	 * View handles for service apis
	 * default view
	 *//*
	router.dispatch.addServiceHandlers(instance, "/view" + instance.serviceUrl, function(service, method, request, response, next){
		request.viewservice=true;
		
		console.log("INFO: Service loader for api "+ service + "  - using api default handler /view" + instance.serviceUrl);
		
		instance.call(service, method, request, response, next);
	});
	*/
	/**
	 * View handles for service apis
	 * default view
	 *//*
	router.dispatch.addServiceHandlers(instance, "/:plugin/view", function(service, method, request, response, next){
		var plugin = request.pathGroup;
		
		request.pathGroup = request.params.group2;
		
		delete request.params.group2;
		delete request.params.group3;
		
		if(request.params.group2)
			request.params.group1 = request.params.group2;
		
		request.viewservice=true;
		
		var webappsetting = simpleportal.pluginloader.getPluginDetails(plugin, "webapp");
		if(webappsetting){
			request.plugin = plugin;
			
			webappsetting.resourcepath = webappsetting.installeddir + "/resources/templates";
			
			request.webappsetting =webappsetting;
		}
		
		console.log("INFO: Service loader for api "+service + "  - using plugin handler /"+plugin+"/view ");
		
		instance.call(service, method, request, response, next);
	});*/
	
	/**
	 * View handles for service apis
	 * default view
	 *//*
	router.dispatch.addServiceHandlers(instance, "/view", function(service, method, request, response, next){
		request.viewservice=true;
		
		console.log("INFO: Service loader for api "+service + "  - using default handler /view ");
		
		instance.call(service, method, request, response, next);
	});
	
	router.dispatch.addUrlHandler({
		"GET /view/:service": function(request, response, next){
			request.viewservice=true;
			
			var service = request.pathGroup;
			
			console.log(request.pathGroup);
			console.log(request.params);
			console.log(request.url);
			
			console.log("INFO: Service loader for api "+ request.pathGroup + "  - using default handler /view ");
			
			if(service)
				instance.call(service, method, request, response, next);
			else if(next)
				next();
		}
	});*/
//	
//	console.log(instance.configuration);
//	
	router.dispatch.addServiceHandlers(instance, instance.serviceUrl, function(service, method, request, response, next){instance.call(service, method, request, response, next);});
	var systemUrls = router.dispatch.addServiceGlobalHandlers(instance, instance.serviceUrl + "/" + instance.systemServiceUrl, function(service, method, request, response, next){instance.call(service, method, request, response, next);}, instance.viewUrl + "/" + instance.systemServiceUrl);

	registerPluginUrls(instance, systemUrls, instance.serviceUrl + "/" + instance.systemServiceUrl, instance.viewUrl + "/" + instance.systemServiceUrl);
	
	var serviceglobalUrls = router.dispatch.addServiceGlobalHandlers(instance, instance.serviceUrl, function(service, method, request, response, next){instance.call(service, method, request, response, next);}, instance.viewUrl);
	registerPluginUrls(instance, serviceglobalUrls, instance.serviceUrl, instance.viewUrl);
//	
	updateTemporaryTemplateHanler(instance, instance.viewUrl + "/" + instance.systemServiceUrl)
	updateTemporaryTemplateHanler(instance, instance.viewUrl)
	
	if(callback)
		callback();
}

/**
 * To get the plugin specific preference details
 * @method getPreference
 * @param pluginsetting {object} plugin setting with minimum of id
 */
ServiceLoaderConstructor.prototype.getPreference = function(servicedetails, preferencekey, defaultvalue){
	var instance = this;
	
	var preference = {};
	if(servicedetails && servicedetails.name){
		var serviceInstance = instance.getService(servicedetails.name, servicedetails.plugin);
		if(serviceInstance)return serviceInstance.getPreference(preferencekey, defaultvalue);
	}
	
	return preference;
}

ServiceLoaderConstructor.prototype.removeSavedPreference = function(servicedetails, preferencekey, callback){
	var instance = this;
	
	if(servicedetails && servicedetails.name){
		var serviceInstance = instance.getService(servicedetails.name, servicedetails.plugin);
		if(serviceInstance)return serviceInstance.removeSavedPreference(preferencekey, callback);
	}else if(callback)
		callback();
};
//
///**
// * To get the plugin specific preference details
// * @method getPreference
// * @param pluginsetting {object} plugin setting with minimum of id
// */
//ServiceLoaderConstructor.prototype.getSavedPreference = function(servicedetails, preferencekey, defaultvalue, callback){
//	var instance = this;
//	
//	var preference = {};
//	if(servicedetails && servicedetails.name){
//		var serviceInstance = instance.getService(servicedetails.name, servicedetails.plugin);
//		if(serviceInstance)return serviceInstance.getSavedPreference(preferencekey, defaultvalue, callback);
//	}
//	
//	return preference;
//}


function removePluginParam(request, subfield){
	var index = 0;
	var params = Object.keys(request.params);
	for(var i = 2; i <= params.length ;  i++){
		request['params']['group' + (i-1)] = request['path']['group' + (i-1)] = request['params']['group'+(i)];
	}
	
	delete request['params']['group' + (params.length)];
	delete request['path']['group' + (params.length)];
	
	request.pathGroup = request['params']['group1'];
}

function setDynamicparams(request){
	if(request && request.query && request.query.template)
		request.servicetemplate = request.query.template;
	
	if(arguments.length > 3){
		request['params'] = request['params']||{};
		
		// to make the old code work
		request['path'] = request['path']||{};
		
		var gindex = 1,
			fieldpath;
		
		var templatepathfound = false;
		var modelpath = "";
		if(arguments.length > 4)
			for(var i = 4; i < arguments.length; i++){
				if(gindex == 1) {
					gindex++;
					
					request['params']['group' + gindex] = request['path']['group' + gindex] = arguments[i];
				} else  if(/jquerymobile|bootstrap/.test(arguments[i]) || (i == 5 && arguments.length == 8)) {
					gindex++;	
					
					if(!templatepathfound){
						templatepathfound = true
						
						request['params']['group' + gindex] = request['path']['group' + gindex] = modelpath;
					}
					
					gindex++;	
					request['params']['group' + gindex] = request['path']['group' + gindex] = arguments[i];
				} else if(!templatepathfound){
					modelpath = (modelpath ? modelpath  + '/' : '') + arguments[i];
				} else
					fieldpath = (fieldpath ? fieldpath  + '/' : '') + arguments[i];
			}
		
		request['params']['group1'] = request['path']['group1'] = request['pathGroup'] = arguments[3];
		
		if(arguments.length > 3){
			gindex++;
			
			request['params']['group' + gindex] = fieldpath;
		}
	}
}

function updateTemporaryTemplateHanler(instance, viewurl, callback){
	var urls = {};
	
	urls["GET " + viewurl + "/:service/:subfield/:subfield1/:subfield2/:subfield3/templates/:template/:url"]=function(request, response, callback){
		request.viewservice = true;
		
		setDynamicparams.apply(this, arguments);
		
		instance.getLogger().info(instance.routerid, "Dynamic templates with sub template type - ");

		var apiService = instance.getService("apiservice");
		
		instance.call("apiservice", 'GET /dynamictemplate/:id/:subfield/:subsubfield/templates/:templatedir/:jsmodel', request, response, callback)
	}
	
	urls["GET " + viewurl + "/:service/:subfield/:subfield1/:subfield2/templates/:template/:url"]=function(request, response, callback){
		request.viewservice = true;
		
		setDynamicparams.apply(this, arguments);
		
		instance.getLogger().info(instance.routerid, "Dynamic templates with sub template type - ");
		var apiService = instance.getService("apiservice");
		
		instance.call("apiservice", 'GET /dynamictemplate/:id/:subfield/:subsubfield/templates/:templatedir/:jsmodel', request, response, callback)
	}
	
	urls["GET " + viewurl + "/:service/:subfield/:subfield1/templates/:template/:url"]=function(request, response, callback){
		request.viewservice = true;
		
		setDynamicparams.apply(this, arguments);
		
		instance.getLogger().info(instance.routerid, "Dynamic templates with sub template type - ");

		var apiService = instance.getService("apiservice");
		
		instance.call("apiservice", 'GET /dynamictemplate/:id/:subfield/:subsubfield/templates/:templatedir/:jsmodel', request, response, callback)
	}
	
	urls["GET " + viewurl + "/:service/:subfield/templates/:template/:url"]=function(request, response, callback){
		request.viewservice = true;
		
		setDynamicparams.apply(this, arguments);
		
		instance.getLogger().info(instance.routerid, "Dynamic templates with sub template type - ");
		var apiService = instance.getService("apiservice");
		
		instance.call("apiservice", 'GET /dynamictemplate/:id/:subfield/templates/:templatedir/:jsmodel', request, response, callback)
	}
	
	urls["GET " + viewurl + "/:service/templates/:template/:url"]=function(request, response, callback, api, templatename, templateurl){
		instance.getLogger().info(instance.routerid, "Dynamic templates with template type - " + api + " -- " + templatename + " -- " + templateurl);
		
		request.viewservice = true;
		setDynamicparams(request, response, callback, api, templatename, templateurl);
		
		var apiService = instance.getService("apiservice");
		
		instance.call("apiservice", 'GET /dynamictemplate/:id/templates/:templatedir/:jsmodel', request, response, callback);
	};
	
	urls["GET /:plugin" + viewurl + "/:service/templates/:template/:url"]=function(request, response, callback, plugin, api, templatename, templateurl){
		instance.getLogger().info(instance.routerid, "Dynamic templates with template type - " + plugin  + " / " + api + " / " + templatename + " / " + templateurl);
		
		request.viewservice = true;
		
		var webappsetting = instance.getPluginloader().getPluginDetails(plugin, "webapp");
		if(webappsetting){
			request.plugin = plugin;
			
			webappsetting.resourcepath = webappsetting.installeddir + "/resources/templates";
			
			request.webappsetting = webappsetting;
		}
		
		setDynamicparams.apply(this, arguments);
		removePluginParam(request);
		var apiService = instance.getService("apiservice");
		instance.call("apiservice", 'GET /dynamictemplate/:id/templates/:templatedir/:jsmodel', request, response, callback);
	};
	
	urls["GET /:plugin" + viewurl + "/:service/:subfield/templates/:template/:url"]=function(request, response, callback, plugin, api, subfield, templatename, templateurl){
		instance.getLogger().info(instance.routerid, "Dynamic templates with template type - " + plugin  + " / " + api + " / " + templatename + " / " + templateurl);
		
		request.viewservice = true;
		
		var webappsetting = instance.getPluginloader().getPluginDetails(plugin, "webapp");
		
		if(webappsetting){
			request.plugin = plugin;
			webappsetting.resourcepath = webappsetting.installeddir + "/resources/templates";
			request.webappsetting = webappsetting;
		}
		
		setDynamicparams.apply(this, arguments);
		removePluginParam(request);
		var apiService = instance.getService("apiservice");
		
		instance.call("apiservice", 'GET /dynamictemplate/:id/:subfield/templates/:templatedir/:jsmodel', request, response, callback);
	}
	
	urls["GET /:plugin" + viewurl + "/:service/:subfield/*/templates/:template/:url"]=function(request, response, callback, plugin, api, subfield, subsubfield, templatename, templateurl){
		instance.getLogger().info(instance.routerid, "Dynamic templates with template type - " + plugin  + " / " + api + " / " + templatename + " / " + templateurl);
		
		request.viewservice = true;
		
		var webappsetting = instance.getPluginloader().getPluginDetails(plugin, "webapp");
		
		if(webappsetting){
			request.plugin = plugin;
			webappsetting.resourcepath = webappsetting.installeddir + "/resources/templates";
			request.webappsetting = webappsetting;
		}
		
		setDynamicparams.apply(this, arguments);
		removePluginParam(request);
		var apiService = instance.getService("apiservice");
		
		instance.call("apiservice", 'GET /dynamictemplate/:id/:subfield/:subsubfield/templates/:templatedir/:jsmodel', request, response, callback);
	}
	
	var urls_ = instance.getServerInstance().getRouter("router").dispatch.addUrlHandler(urls);//connect.static(simpleportal.util.getServerPath("._tmp/resources/templates")
}

function updatePluginViewHanler(instance, viewurl, callback){
	return (function(instance, viewurl, callback){
		return function(request){
			request.viewservice=true;
			
			instance.getLogger().debug(instance.routerid, "Plugin uri :" + viewurl);
			
			if(arguments.length > 0){
				var plugin = arguments[3];
				var webappsetting = instance.getPluginloader().getPluginDetails(plugin, "webapp");
				
				if(webappsetting){
					request.plugin = plugin;
					
					webappsetting.resourcepath = webappsetting.installeddir + "/resources/templates";
					
					request.webappsetting = webappsetting;
					
					var newarguments=[];
					var index = 0;
					for(var i in arguments){
						if(i != 3)
							newarguments[index++] = arguments[i];
					}
					
					callback.apply(this, newarguments);
				} else
					callback.apply(this, arguments);
			}else
				callback.apply(this, arguments);
		}
	})(instance, viewurl, callback);
}

function registerPluginUrls(instance, registeredhandles, serviceUrl, viewUrl){
	if(viewUrl && registeredhandles && Object.keys(registeredhandles).length > 0 ){
		var viewUrls = {};
		for(var url in registeredhandles){
			if(url.indexOf("GET ") != -1 || url.indexOf("/") == 0){
				var viewurl_ = url.replace(serviceUrl, "/:pluginid" + viewUrl);
				var mobileviewurl_ = url.replace(serviceUrl, "/:pluginid/mobile" + viewUrl);
				
				viewUrls[viewurl_] = updatePluginViewHanler(instance, viewurl_, registeredhandles[url]);
				viewUrls[mobileviewurl_] = updatePluginViewHanler(instance, mobileviewurl_, registeredhandles[url]);
				
				if(url == "/api/:service") {
					viewUrls[viewurl_ + '/'] = updatePluginViewHanler(instance, viewurl_ + '/', registeredhandles[url]);
					
					viewUrls[mobileviewurl_ + '/'] = updatePluginViewHanler(instance, mobileviewurl_ + '/', registeredhandles[url]);
				}
			}	
		}
		instance.getServerInstance().getRouter("router").dispatch.addUrlHandler(viewUrls);
	}
}

/**
 * Description
 * @method updateServiceRouter
 * @param {} service
 * @param {} configuration
 * @param {} dbInstance
 * @return 
 */
ServiceLoaderConstructor.prototype.updateServiceRouter = function(service, configuration, dbInstance){
//ServiceLoader.updateServiceRouter = function(service, configuration, dbInstance){
	var instance = this;
	
	//service.init(configuration, dbInstance);
	//service.startup();
	
	if(configuration && instance.configuration&&instance.configuration.services&&configuration&&configuration.services){
		util.extendJSON(instance.configuration.services, configuration.services);
	}
	
	//var serviceurl = ServiceLoader.serviceUrl;
    	
	// now let us check u have any specifc router installed
	//	console.log("now let us check u have any specifc router installed - " +service.name + service.serviceurl);
	//	console.log(service.service);
	instance.getServerInstance().getRouter("router").dispatch.addServiceRouter(service, instance.serviceUrl, function(){instance.call.apply(instance, arguments)});
	//	console.log("now let us check u have any specifc router installed - " +service.name)
	
	//router.dispatch.addServiceHandlers(service, serviceurl, ServiceLoader.call);
	//router.dispatch.addServiceGlobalHandlers(service, serviceurl, ServiceLoader.call);
}

ServiceLoaderConstructor.prototype.invoke=function(service, method, request, callback, aditionaldata){
//ServiceLoader.invoke = function(service, method, request, callback, aditionaldata){
	console.log("INFO: Calling service - " + service + ' - ' + method)
	var query={},
		instance = this;
	
	if(typeof request == "function"){
		callback=request;
		request ={query:{}};
	}else if(typeof callback == 'object'){
		aditionaldata = callback;
		callback = null;
	}	
	
	if(method.indexOf("?") != -1){
		method = method.substring(0, method.indexOf("?"));
		query = util.getParamValues({url:method});
		
		if(!request)
			request={query:query};
		
		request = util.extendJSON(request, {query:query});
	}
	
	var apiService = instance.getService(service);
	
	if(!apiService){
		callback('service-not-found-' + service, {});
	} else{
		var caller = apiService.service[method];
		if(!caller && apiService[method])
			caller = apiService[method];
		
		if(!caller){
			if(callback)
				callback('service-not-found-' + method, {});
		} else{
			if(typeof caller == 'string')
				caller = apiService.service[caller];
			
			if(caller){
				caller(request, {}, callback, aditionaldata);
			}else if(callback)
				callback('service-not-found-' + method, {});
		}
	}
}

/**
 * Description
 * @method call
 * @param {} service
 * @param {} method
 * @param {} request
 * @param {} response
 * @param {} next
 * @return 
 */
ServiceLoaderConstructor.prototype.call=function(service, method, request, response, next){
//ServiceLoader.call = function(service, method, request, response, next){
	var instance = this;
	instance.getLogger().debug(instance.routerid, "Calling service - " + service + ' - ' + method + ">>> " + request.url)
	
	var serviceInstance = instance.getService(service);
	
	if(!serviceInstance)
		if(next)
			next();
		else{
			util.sendServiceResponse(response, 'Service Not found', {});
			return;
		}
	else{
		instance.getLogger().debug(instance.routerid, "Calling service - " + service + ' - ' + method)
		
		serviceInstance.call(method, request, response, function(error, results, headers){
			if(next && error && typeof error == "string" && error.indexOf("no-such-method") == 0)
				next();
			else
				util.sendServiceResponse(response, error, results, headers);
		});
	}
}

/**
 * Description
 * @method updateConfiguration
 * @param {} configuration
 * @return 
 */
ServiceLoaderConstructor.prototype.getUpdatedConfiguration=function(plugin){
//ServiceLoader.getUpdatedConfiguration=function(plugin){
	var instance = this;
	
	var services = {};
	for(var subModule in instance){
		var details = getServiceDetails(instance, subModule);
		
		if(details && (!plugin || (details.plugin == plugin))){
			services[details.name]=details.configuration;
		}	
	}
	
	return util.extendJSON({}, services);
}

/**
 * To register a service by file path
 * @method registerServices
 * @param {} servicefile
 * @param {} configuration
 * @param {} callback
 * @return 
 */
ServiceLoaderConstructor.prototype.registerService=function(servicefile, props, callback){
	props=props||{};
	
	var instance = this;
	fs.stat(servicefile, function(error, stats){
		if( !error && stats.isFile()){
			var service = util.getResourceFromUrl(servicefile).substr(0, servicefile.lastIndexOf('.js'));
			
			var loaded = __loadService(instance, {
				path:servicefile, 
				name:props.name, 
				plugin:props.plugin,
				serviceprefix:props.serviceprefix, 
				servicetype:props.servicetype
			});
				
        	if(callback)
        		callback(!loaded ? "Service not loaded!." : null);
		} else if(callback)
    		callback();
	});
}

///**
// * Description
// * @method registerServices
// * @param {} servicedir
// * @param {} configuration
// * @param {} callback
// * @return 
// */
//
//ServiceLoaderConstructor.prototype.registerServices=function(servicedir, configuration, callback){
////ServiceLoader.registerServices=function(servicedir, configuration, callback){
//	var instance = this;
//	
//	instance.getLogger().info('Simple Portal : serviceloader', 'registerServices  -- ' + servicedir);
//	
//	if(fs.readdirSync(servicedir).length == 0)
//		callback();
//	else {
//		var services_ = fs.readdirSync(servicedir).forEach(function(filename){
//			if(/\.js$/.test(filename)){
//				services_.push(servicedir+ '/' + services[i]);
//			}
//		});
//		
//		__registerServices(instance, services_, configuration, callback);
//	}
//};

ServiceLoaderConstructor.prototype.getService = function(servicename, serviceInstance){
	var instance = this;
	
	if(!instance.routers[servicename] && instance.routers[ "system_"  + servicename])
		servicename = "system_" + servicename;
	
	var service = instance.routers[servicename];
	
	if((!service || !service.get)){
		var plugin;
		if (typeof serviceInstance == "string")
			plugin = serviceInstance;
		else if(serviceInstance instanceof Service)
			plugin = serviceInstance.plugin;
		else if(serviceInstance && serviceInstance.plugin)
			plugin = serviceInstance.plugin;
		else if(serviceInstance && serviceInstance.pluginid)
			plugin = serviceInstance.pluginid;
		
		if(plugin){
			var webapp = instance.getPluginloader().getPluginDetails(plugin, "webapp");
			if(webapp && webapp.serviceprefix){
				instance.getLogger().debug(instance.routerid, "getting api service --- " + webapp.serviceprefix + servicename);
				
				service = instance.routers[webapp.serviceprefix + servicename];	
			}
		}
	}
	
	return service;
}

/*
 * Private functions
 */
var registerEvents = function(instance, servicename){
	if(servicename && instance.routers[servicename].get && instance.routers[servicename].on){
		//Service init broadcasted using Serviceloader 
		instance.routers[servicename].on("init", function(data){
			// let us call update router for individual routers
			instance.updateServiceRouter(instance.routers[servicename]);
			
			instance.emit("service-init", this);
		});
		
		//Service startup broadcasted using Serviceloader
		instance.routers[servicename].once("startup", function(){
			instance.emit("servicestartup", this);
		});
		
		//Service startup broadcasted using Serviceloader
		instance.routers[servicename].on("backup", function(data){
			instance.emit("service.backup", data);
		});
		
		var serviceevents = [];
		for(var eventkey in simpleportal.Constants.ServiceEvents)
			serviceevents.push(simpleportal.Constants.ServiceEvents[eventkey]);
		
		for(var eventkey in simpleportal.Constants.CommonAPIEvents)
			serviceevents.push(simpleportal.Constants.CommonAPIEvents[eventkey]);

		for(var key in serviceevents)
			registerServiceEvent(instance, servicename, serviceevents[key]);
		
		//Escalating server ready event to sub apis
//		registerServiceloaderEvent(instance, servicename, "server.ready");
	}
}

var registerServiceEvent = function(instance, servicename, event){
	if(instance.routers[servicename])
		instance.routers[servicename].on(event, function(data){
			instance.emit("service." + servicename + "." + event, data);
		});	
};


/**
 * Description
 * @method loadServices
 * @param {} dir
 * @param {} includeindex
 * @param {} callback
 * @return 
 */
function loadServices(instance, dir, includeindex, callback, plugin, serviceprefix){
	var servicesfound = getServices(instance, dir, includeindex, plugin, serviceprefix);
	
	var totcount = servicesfound.length;
	var fincount = 0;
	
	if(servicesfound&&servicesfound.length > 0)
		for(var i in servicesfound){
			var serviceprops = servicesfound [i];
			var loaded = __loadService(instance, serviceprops);
			
			if(totcount - 1 == fincount++)
				if(callback)
					callback(servicesfound);
		}
	else if(callback)
		callback();
}


function getSystemServices(instance){
	// if it is default include the plugin loader in it
	if(instance.systemServices.length == 0){
		instance.systemServices = getServices(instance, instance.systemapidir, false);
	}
	
	return instance.systemServices;
}

/**
 * Description
 * @method getServices
 * @param {} dir
 * @param {} includeindex
 * @return services
 */
function getServices(instance, dir, includeindex, plugin, serviceprefix){
	includeindex = includeindex||false;
	var services = [];
	
	var servicetype = "system";
	if(dir == instance.servicedir)
		servicetype="server";
	
	if(fs.existsSync(dir)){
		fs.readdirSync(dir).forEach(function(filename){
		    if (/\.js$/.test(filename)) {
	            if((includeindex && filename == 'index.js') || filename != 'index.js'){
	            	var stats = fs.lstatSync(dir + '/' + filename);
	            	
	                var name = filename.substr(0, filename.lastIndexOf('.'));
	                var service = name;
	                if(name == 'index'){
	                	service = dir.substring(dir.lastIndexOf('/') +1, dir.length)
	                }
	                var path = fs.realpathSync(dir + '/' + name + '.js');
	                
	                services.push({path:path, name:service, plugin:plugin, servicetype:servicetype, serviceprefix:serviceprefix, stats:stats});
	            }
		    }else if(!/^\./.test(filename)){
		    	var stats = fs.lstatSync(dir + '/' + filename);

			    // Is it a directory?
			    if (stats.isDirectory()&&!(filename=='html5'||filename=='lib'||filename=='util'||filename=='models'||filename=='views')) {
			    	var subservices = getServices(instance, dir + '/' + filename, true, plugin);
			    	if(subservices.length > 0)
			    		for(var i in subservices)
			    			services.push(subservices[i]);
			    }
		    }
		});	
	}
	
	return services;
}

/**
 * Description
 * @method __loadService
 * @param {} serviceprops
 * @return 
 */
function __loadService(instance, serviceprops){
	var servicename = serviceprops.name;
	if(serviceprops.system)
		servicename = "system_"+serviceprops.name;
	
	if(serviceprops.serviceprefix){
		servicename = serviceprops.serviceprefix + servicename;
	}else if(instance.routers[servicename]){
		if(serviceprops.plugin)
			servicename = serviceprops.plugin + "_" + serviceprops.name;
	}
	
	instance.getLogger().debug(instance.routerid + ':__loadService', serviceprops.name + ' << ' + servicename  + ' << ' + serviceprops.path);
	
	if(!instance.routers[servicename]) {
		try{
			instance.routers.__defineGetter__(servicename, function(){
	            return require(serviceprops.path);
	        });

			instance.routers[servicename].plugin=serviceprops.plugin;
			if(serviceprops.plugin && serviceprops.plugin != "")
				instance.routers[servicename].servicetype = "plugin";
			else if ( serviceprops.servicetype )
				instance.routers[servicename].servicetype = serviceprops.servicetype;
			
			if(serviceprops.system)
				instance.routers[servicename].serviceurl = instance.systemServiceUrl + '/' + serviceprops.name;
			else if(serviceprops.serviceprefix && servicename != serviceprops.name)
				instance.routers[servicename].serviceurl = servicename;
				
			instance.routers[servicename].servicepath = serviceprops.path;
			
			if(serviceprops.stats)
				instance.routers[servicename].stats = serviceprops.stats;
			
			if(serviceprops.path)
				instance.routers[servicename].servicefile = serviceprops.path;
			
			instance.routers[servicename].servicename =servicename;
			
			registerEvents(instance, servicename);

			return true;
		}catch(error){
			delete instance.routers[servicename];
			
			console.error(error);
			
			serviceprops.error=error;
			instance._routererrors[servicename] = {plugin:serviceprops.plugin, error:error};

			if(error.code == "MODULE_NOT_FOUND" && serviceprops.plugin){
				var plmissingdep = instance.getPluginloader().getPluginErrors()[serviceprops.plugin]||{};
				
				if(!plmissingdep.missingnpmdependancies)
					plmissingdep.missingnpmdependancies = [];
				
				var module = util.getTextBetween(error.message, "'", "'");
				plmissingdep.missingnpmdependancies.push(module);
				
				if(!instance.getPluginloader().getPluginErrors()[serviceprops.plugin])
					instance.getPluginloader().getPluginErrors()[serviceprops.plugin] = plmissingdep;
			}	
			
			instance.getLogger().error(instance.routerid + ':' + servicename, error);
			
//			throw error;
			
			return false;
		}
	}else{
		instance.getLogger().error(instance.routerid + ':__loadService', serviceprops.name + ' << ' + servicename  + ' already registered.');
		
		return false;
	}
}

function loadSystemServices(instance, callback){
	if(instance.systemServices != 0)
		callback();
	else{
		var servicesfound = getSystemServices(instance);
		
		var totcount = servicesfound.length;
		var fincount =0;
		
		if(servicesfound&&servicesfound.length > 0)
			for(var i in servicesfound){
				var serviceprops =servicesfound[i];
				
				serviceprops.system=true;
				
				var loaded = __loadService(instance, serviceprops);
				
				if(totcount-1 == fincount++)
					if(callback)
						callback(servicesfound);
			}
		else if(callback)
			callback();
	}
}

///**
// * Description
// * @method registerService
// * @param {} file
// * @param {} configuration
// * @param {} dbInstance
// * @param {} callback
// * @return 
// */
//function registerService(instance, file, configuration, dbInstance, callback){
//	instance.getLogger().info('Simple Portal : serviceloader', 'registerService  -- ' + file);
////	console.log('Simple Portal : serviceloader registerService  -- ' + file);
//	
//	if( fs.existsSync(file) && /\.js$/.test(file)){
//		var path = fs.realpathSync(file);
//		
//		var startindex=0;
//		
//		if(file.lastIndexOf('/') >= 0)
//			startindex=file.lastIndexOf('/')+1;
//		
//		var name = file.substring(startindex, file.lastIndexOf('.js'));
//		
//        var service = name;
//        
//        if(name == 'index'){
//        	service = file.substring(file.lastIndexOf('/') +1, (file.length-1))
//        }
//        
//        if(configuration && configuration.serviceprefix){
//        	service = configuration.serviceprefix + service;
//    	}else if(instance.routers[service]){
////        	console.log("Registering the Services for - " + service + ' ---- ' + configuration.plugin);
//        	
//        	if(configuration && configuration.plugin)
//        		service = configuration.plugin + '_' + service;
//        }
//        
//        if(instance.routers[service]){
//        	callback('Service - '+ service +' already registered');
//        }else{
//        	instance.routers.__defineGetter__(service, function(){
//                return require(path);
//            });
//        	
////        	instance.__defineGetter__(service, function(){
////                return require(path);
////            });
//
//        	// check it is system service
////        	instance.updateServiceRouter(instance.routers[service], configuration, dbInstance);
//
//    		instance.routers[service].servicename =service;
//    		
//            callback();
//        }
//	}else
//		callback('No such service file found - ' + file);
//}

/**
 * Description
 * @method unLoadServices
 * @param {} dir
 * @param {} includeindex
 * @param {} callback
 * @return 
 */
function unLoadServices(instance, dir, includeindex, callback){
	var servicesfound = getServices(instance, dir, includeindex);
	
	var totcount = servicesfound.length;
	var fincount =0;
	if(servicesfound && servicesfound.length > 0)
		for(var i in servicesfound){
			var serviceprops =servicesfound[i];
			
			delete instance.routers[serviceprops.name];
		}
	
	if(callback)
		callback();
}

/**
 * Description
 * @method getServiceDetails
 * @param {} servicename
 * @return servicedetails
 */
function getServiceDetails(instance, servicename){
	var servicedetails;
	if(typeof instance.routers[servicename] == 'string' || typeof instance.routers[servicename] == 'function'){}
	else if(instance.routers[servicename]) {
		if(!instance.routers[servicename]&&instance.routers["system_" +servicename])
			servicename="system_"+servicename;
		
		var service_=instance.routers[servicename];
		
		if(service_)
			servicedetails = service_.exportConfig();
	}
	
	return servicedetails;
}

///**
// * To register services 
// * 
// * @method __registerServices
// * 
// * @param {} servicedir
// * @param {} services
// * @param {} configuration
// * @param {} callback
// * 
// * @private
// */
//__registerServices=function(instance, servicedir, services, configuration, callback){
//	var __registerServices_count = services.length;
//	var __registerServices_fincount =0;
//	
//	for(var i in services)
//		registerService(instance, services[i], configuration, instance.dbInstance, function(error){
//			if(error)
//				errors.push(error);
//			
//			if( __registerServices_fincount++ == __registerServices_count-1 )
//				callback(errors, services);
//		});
//}

var ExportFunction = (function() {
	return ServiceLoaderConstructor;
}());

module.exports = ExportFunction;