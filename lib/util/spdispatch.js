"use strict";
/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var dispatch = require('dispatch');
//	logger = require("./../logger");

/**
 * @class Dispatchwrapper
 * 
 * @module simpleportal
  * @submodule wrapper
 * 
 * @constructor
 * @param {} urlHandlers url handlers
 * @return 
 */
var DispatchWrapper = function(urlHandlers) {
	var instance = this;
	
	instance.urlHandlers = urlHandlers ||{};
};

/**
 * To add url handlers to the dispatch middleware
 * 
 * @method addUrlHandler
 * 
 * @param {} urlHandlers url handlers
 */
DispatchWrapper.prototype.addUrlHandler = function(urlHandlers){
	var instance = this,
		registerdUrlHandlers={};
		
	if(typeof urlHandlers == "object" && typeof urlHandlers.length == "number"){
//		console.log("We got array of handlers to register in to the service api - " + urlHandlers.length);
		
		for(url in urlHandlers){
			if(instance.urlHandlers[url]){
				console.log("We already have a url handler for this service - "+ url);
			} else {
//				console.log(url + " -- Registering url handlers");
				registerdUrlHandlers[url] = instance.urlHandlers[url] = urlHandlers[url];
			}		
		}
	}else {
//		console.log("We got object of handlers to register in to the service api - " + Object.keys(urlHandlers).length );
		for(var url in urlHandlers){
			if(instance.urlHandlers[url])
				console.log("We alread have a url handler for this service - " +  url);
			else{
//				console.log(url + " -- rgeistering the url handlers");
				registerdUrlHandlers[url] = instance.urlHandlers[url] = urlHandlers[url];
			}		
		}
	}
	
	return registerdUrlHandlers;
}

/**
 * To add multiple url handlers
 * 
 * @method addUrlHandlers
 * 
 * @param {} urlHandlers array of url handlers
 * @return 
 */
DispatchWrapper.prototype.addUrlHandlers = function(urlHandlers){
	var instance = this;
	
	for(url in urlHandlers) {
		instance.urlHandlers[url] = urlHandlers[url];
	}
}

/**
 * To get the url handlers registerd
 * 
 * @method getUrlHandlers
 * @param {} urlHandlers
 * 
 * @return array of url handlers
 */
DispatchWrapper.prototype.getUrlHandlers = function(urlHandlers){
	var instance = this;
	
	return instance.urlHandlers;
}

/**
 * To add Service global handlers
 * 
 * @method addServiceGlobalHandlers
 * 
 * @param {} module name of the Service module
 * 
 * @param {} serviceUrl API uri
 * @param {} serviceHandler 
 */
DispatchWrapper.prototype.addServiceGlobalHandlers = function(module, serviceUrl, serviceHandler, viewUrl){
	var instance = this,
		urls = {};
	
	//	console.log("Adding  Service global handleres :::" + serviceUrl);
	// let us add the view handler inside here
	// use view api here
	
	urls[serviceUrl + '/:service/:method/:submethod'] = function(request, response, next, service, method, submethod) {
//		console.log("Dynamic sub sub metod url -- ");
//		console.log("Dynamic sub url -- " + serviceUrl + '/:service/:method/:submethod');
		
		request['params'] = request['params']||{};
		
		//To make the old code work
		request['path'] = request['path']||{};
		
		request['params']['id'] = method;
			
		//To make the old code work
		request['path']['id'] = method;
		request['pathGroup'] = method;
		
		var uri = request.method + ' /:id' + '/' +submethod;		
		var uri_ = request.method + ' /' + method + '/' +submethod;
		
		serviceHandler(service, uri_, request, response, function(){
			serviceHandler(service, uri, request, response, next);
		});
	};
	
	urls[serviceUrl + '/:service/:method'] = function(request, response, next, service, method) {
//		console.log("Dynamic sub url -- " + serviceUrl + '/:service/:method');

		request['params'] = request['params']||{};
		
		//To make the old code work
		request['path'] = request['path']||{};
		
		request['params']['id'] = method;
			
		//To make the old code work
		request['path']['id'] = method;
		request['pathGroup'] = method;
		
		var uri = request.method + ' /:id';
		var uri_ = request.method + ' /' + method;
		
//		console.log("Service ehandler for serice method!!");
		
		serviceHandler(service, uri_, request, response, function(){
			serviceHandler(service, uri, request, response, next);
		});
	};
	
	urls[serviceUrl + '/:service'] = function(request, response, next, service) {
//		console.log("Dynamic sub url -- " + serviceUrl + '/:service');
		
		var uri = request.method + ' ';
		var uri_ = request.method + ' /';
		var uri_1 = request.method;
		
		// let us make a chain of callback
		serviceHandler(service, uri, request, response, function() {
			serviceHandler(service, uri_, request, response, function() {
				serviceHandler(service, uri_1, request, response, next);
			});
		});
	};
	
	var registeredhandles = instance.addUrlHandler(urls);
	if(viewUrl && registeredhandles && Object.keys(registeredhandles).length > 0 ){
		var viewUrls = {};
		
		for(var url in registeredhandles) {
			if(url.indexOf("GET ") != -1 || url.indexOf("/") == 0)
				viewUrls[url.replace(serviceUrl, viewUrl)] = dynamicGlobalViewHandler(url.replace(serviceUrl, viewUrl), registeredhandles[url]);
		}
		
		instance.addUrlHandler(viewUrls);
	}
	
	return registeredhandles;
}

function dynamicGlobalViewHandler(viewurl, callback){
	return (function(viewurl, callback){
		return function() {
			if(typeof arguments[0] == "string")
				arguments[2].viewservice = true;// request is the third argument
			else
				arguments[0].viewservice = true;
			
			callback.apply(this, arguments);
		}
	})(viewurl, callback);
}


/**
 * To add Service handler
 * @method addServiceHandlers
 * 
 * @param {} module name of the Service module
 * 
 * @param {} serviceUrl API uri
 * @param {} serviceHandler 
 * 
 */
DispatchWrapper.prototype.addServiceRouter = function(serviceModule, serviceUrl, serviceHandler){
	var instance = this;
	// to register the service handler for a specific module and it is assumed that only service mentioned in an array field service will be registered in to the api
	
//	console.log('We are updating the various apis found in the service' + serviceModule.servicename + ">>" + serviceModule.getApiUrl());
	
	if(serviceModule && serviceModule.service && serviceModule.servicename && serviceModule.call){
		// now check you have field service
		
		var moduleServiceUrl = serviceModule.getApiUrl();
		
		for(var serviceName in serviceModule.service){
			var serviceUrl_ = moduleServiceUrl;
			
			var path = serviceName;
			if(path.indexOf('/') == 0)
				path = path.substring(1);
			
			if(path.indexOf('GET ') == 0){
				path = path.substring(5);
				serviceUrl_ = 'GET ' + serviceUrl_;
			}else if(path.indexOf('PUT ') == 0){
				path = path.substring(5);
				serviceUrl_ = 'PUT ' + serviceUrl_;
			}else if(path.indexOf('POST ') == 0){
				path = path.substring(6);
				serviceUrl_ = 'POST ' + serviceUrl_;
			}else if(path.indexOf('DELETE ') == 0){
				path = path.substring(8);
				serviceUrl_ = 'DELETE ' + serviceUrl_;
			}
			
			if(!/^GET|POST|PUT|DELETE/.test(serviceUrl_)){
				serviceUrl_  = 'GET ' + serviceUrl_;
			}

			if(path.length != 0)
				serviceUrl_ = serviceUrl_ + '/' + path;  
			else
				serviceUrl_ = serviceUrl_;
			
			//check if it is GET
			// let us convert this to dynamic router
			var viewUrl_ = serviceUrl_.replace(serviceModule.getApiUrl(), serviceModule.getViewUrl()); 
			
//			var viewUrl_ = serviceUrl_.replace(serviceModule.getApiUrl(), serviceModule.getViewUrl()); 
			
			// check you have global handler with same directive
			var globalserviceUrl_ = serviceUrl_.replace(serviceModule.servicename, ":service");
			var globalviewUrl_ = viewUrl_.replace(serviceModule.servicename, ":service");
			
			if(!instance.urlHandlers[globalserviceUrl_]){
				instance.updateServiceRouter(serviceUrl_, serviceModule.servicename, serviceName, serviceHandler);
				
				if(serviceUrl_.indexOf("GET /") != -1){
					instance.updateServiceRouter(viewUrl_, serviceModule.servicename, serviceName, dynamicGlobalViewHandler(viewUrl_, serviceHandler));
				}
			}else if(!instance.urlHandlers[globalviewUrl_]){
				instance.updateServiceRouter(serviceUrl_, serviceModule.servicename, serviceName, serviceHandler);
				
				if(serviceUrl_.indexOf("GET /") != -1){
					instance.updateServiceRouter(viewUrl_, serviceModule.servicename, serviceName, dynamicGlobalViewHandler(viewUrl_, serviceHandler));
				}
			}
		}
	}
}

DispatchWrapper.prototype.addServiceHandlers = function(module, serviceUrl, serviceHandler){
	var instance = this;
	
//	console.log("Adding more service urls to the links  :::" + serviceUrl);
//	return;
	
	if(module){
		if(typeof module == 'function' || typeof module == 'string'){
		} else {
			for(var subModule in module){
				if(typeof module == 'string' || typeof module == 'function'){
				} else if(module[subModule]){
//					console.log("Adding more service urls to the links  :::" + serviceUrl + ">>>" + subModule);
					
					var moduleServiceUrl = serviceUrl + '/' + subModule;
					
					if(module[subModule].serviceurl)
						moduleServiceUrl = serviceUrl + '/' + module[subModule].serviceurl;
						//console.log(module[subModule].serviceurl);
					else if(module[subModule] && module[subModule].name)
						moduleServiceUrl = serviceUrl + '/' + module[subModule].name;
					
					var childServices;
					if(module[subModule])
						childServices = module[subModule].service;
					
					if(childServices){
						// console log ('We need to sort the services according to the regular expression'
						
						for(var serviceName in childServices){
							var serviceUrl_ = moduleServiceUrl;
							
							var path = serviceName;
							if(path.indexOf('/') == 0)
								path = path.substring(1);
							
							if(path.indexOf('GET ') == 0){
								path = path.substring(5);
								serviceUrl_ = 'GET ' + serviceUrl_;
							}else if(path.indexOf('PUT ') == 0){
								path = path.substring(5);
								serviceUrl_ = 'PUT ' + serviceUrl_;
							}else if(path.indexOf('POST ') == 0){
								path = path.substring(6);
								serviceUrl_ = 'POST ' + serviceUrl_;
							}else if(path.indexOf('DELETE ') == 0){
								path = path.substring(8);
								serviceUrl_ = 'DELETE ' + serviceUrl_;
							}
							
							if(!/^GET|POST|PUT|DELETE/.test(serviceUrl_)){
								serviceUrl_  = 'GET ' + serviceUrl_;
							}

							if(path.length != 0)
								serviceUrl_ = serviceUrl_ + '/' + path;  
							else
								serviceUrl_ = serviceUrl_;
							
							instance.updateServiceRouter(serviceUrl_, subModule, serviceName, serviceHandler);
						}
					}
				}
			}
		}
	}
}

/**
 * To update the service router 
 * 
 * @method updateServiceRouter
 * 
 * @param {} serviceUrl
 * @param {} serviceName
 * @param {} method
 * @param {} serviceHandler
 */
DispatchWrapper.prototype.updateServiceRouter = function(serviceUrl, serviceName, method, serviceHandler){
//	console.log('Dispatch Wrapper:' + 'Registering Service - ' + serviceUrl);
	//	console.log('Dispatch Wrapper : '+'Registering Service - ' + serviceUrl + ">>" + serviceName + ">>" + method);
	
	var instance = this;
	var urlHandlers ={};

	//  let me have a look how is it done
	//	var serviceUrl = serviceUrl.replace("/" + serviceName, "/:service");
	if(instance.urlHandlers[serviceUrl]){
		//@TODO check and logg this event console.log("do we have same api url >>>> " + serviceUrl);
		// how about i conver this into another url
	}else{
		// console.log("URL Handler for api -- " + serviceUrl);
		urlHandlers[serviceUrl] = function (request, response, next, group, group1, group2) {
	    	if(arguments.length > 3){
	    		request['params'] = request['params']||{};
				
				// to make the old code work
				request['path'] = request['path']||{};
				
				var gindex = 2;
				if(arguments.length > 4)
					for(var i = 4; i < arguments.length; i++){
						request['params']['group'+gindex] = request['path']['group'+gindex]=arguments[i];
						
						gindex++;
					}
				
				request['params']['group1'] = request['path']['group1'] = request['pathGroup'] = arguments[3];
	    	}
	    	
			serviceHandler(serviceName, method, request, response, next);
	    };	
	}

	instance.addUrlHandler(urlHandlers);
}

/**
 * To get the Service view router
 * 
 * @method getViewRouter
 * 
 * @param {} moduleName
 * @param {} path
 * @param {} viewHandler
 * @param {} expressionField
 * 
 * @return ObjectExpression
 */
DispatchWrapper.prototype.getViewRouter = function(moduleName, path, viewHandler, expressionField){
	logger.getInstance().debug('Dispatch Wrapper', 'Registering View  - /' + moduleName + '/' + path);
	expressionField = expressionField || 'pathGroup';
	return {
		GET: function (request, response, next, group, group1, group2) {
			request['params'] = request['params']||{};
			
			//to make the old code work
			request['path'] = request['path']||{};
			
			if(group) {
				request['params'][expressionField] = group;
				request['params']['group'] = group;
				
				//to make the old code work
				request['path'][expressionField] = group;
				request['pathGroup'] = group;
				
				
				var gindex = 2;
				if(arguments.length > 4)
					for(var i = 4; i < arguments.length; i++){
						request['params']['group'+gindex] = request['path']['group'+gindex]=arguments[i];
						
						gindex++;
					}
//				
//				
//				request['params']['group'] = group;
//				request['params']['group1'] = group1;
//				request['params']['group2'] = group2;
			}
			
			viewHandler(moduleName, path, request, response, viewHandler);
		}
	}
}

/**
 * To add a view handler
 * 
 * @method addViewHandlers
 * 
 * @param {} module
 * @param {} viewUrl
 * @param {} viewHandler
 */
DispatchWrapper.prototype.addViewHandlers = function(module, viewUrl, viewHandler){
	var instance = this;
	
	var urlHandlers ={};
	
	if(module){
		if(typeof module == 'string' || typeof module == 'function'){
		} else {
			for(var subModule in module){
				if(subModule && subModule != undefined){
					if(typeof module == 'string' || typeof module == 'function'){
					} else {
						var childViews = module[subModule].view;
						var childViewHandles = {};
						
						if(childViews){
							var firstView = null;
							for(var view in childViews){
								if(!firstView)
									firstView = view;
								var path = view;
								
								var expressionField;
								
								var spec_index = path.indexOf('/:');
								if(path.indexOf('/:') != -1){
									expressionField = path.substring(spec_index + 2);
									var endIndex = expressionField.indexOf('/');
									if(endIndex != -1){
										expressionField = expressionField.substring(0, endIndex);
										//path = '/(\\w+)';
										path = '/:expression';
									}
									
									//path = view.replace('/:' + expressionField, '/(\\w+)');
									path = view.replace('/:' + expressionField, '/:expression');
								} else if(path.indexOf('/') == 0)
									path = path;
								else
									path = '/' + path;
								
								childViewHandles[path] = instance.getViewRouter(subModule, view, viewHandler, expressionField);
							}
							if(firstView)
								childViewHandles['GET'] = instance.getViewRouter(subModule, firstView, viewHandler);
							
							urlHandlers['/' +subModule]=childViewHandles;
						}
					}
				}
			}
		}
	}
	
//	instance.addUrlHandlers(urlHandlers);
	instance.addUrlHandler(urlHandlers);
}

/**
 * To get all handlers registerd
 * 
 * @method handlers
 * @param {} urls
 * 
 * @return array of api url handlers
 */
DispatchWrapper.prototype.handlers = function(urls){
	var instance = this;
	
//	logger.getInstance().debug('Simpleportal - dispatchwrapper', 'Registering the regular service handlers');
	
	var sortedUrlHandlers = sortUrlHandlers(instance.urlHandlers);
	
//	console.log(sortedUrlHandlers);
	
	return dispatch(sortedUrlHandlers);
}

function sortUrlHandlers(urlHandlers){
	var sortedUrlHandlers = {};
	
    var keys = Object.keys(urlHandlers),
    	i, 
    	len = keys.length;
    
    var fullUrls = [],
    	defaultUrls = [],
    	postUrls = [],
    	putUrls = [],
    	deleteUrls = [],
    	getUrls = []; 
    
	for(var index in keys){
		url = keys[index];
		if(url.indexOf('POST') == 0)
			postUrls.push(url);
		else if(url.indexOf('PUT') == 0)
			putUrls.push(url);
		else if(url.indexOf('GET') == 0)
			getUrls.push(url);
		else if(url.indexOf('DELETE') == 0)
			deleteUrls.push(url);
		else
			defaultUrls.push(url);
	}
	
	//if default the it is GET
	for(var index in defaultUrls){
		var url = defaultUrls[index];
		
		urlHandlers['GET ' + url]=urlHandlers[url];
		getUrls.push('GET ' + url);
	}
	
	fullUrls = sortUrls(fullUrls)
	fullUrls = fullUrls.concat(sortUrls(getUrls));
	fullUrls = fullUrls.concat(sortUrls(postUrls));
	fullUrls = fullUrls.concat(sortUrls(putUrls));
	fullUrls = fullUrls.concat(sortUrls(deleteUrls));
	
//	console.log(fullUrls);
	
	for(var index in fullUrls){
		var url = fullUrls[index];
		
		sortedUrlHandlers[url]=urlHandlers[url];
	}
	
	return sortedUrlHandlers;
}

function sortUrls(urls){
	return urls.sort(function(a, b){
		// number fo forward slash
		if((a.match(/\//g) || []).length > (b.match(/\//g) || []).length) 
			return -1;  

		// keep regular expression at the end
		if((a.match(/\//g) || []).length == (b.match(/\//g) || []).length && (a.match(/:/g) || []).length < (b.match(/:/g) || []).length)
        	return -1;  
		
		// if number of forward slash is equal then check for number of regular expression
		 if((a.match(/:/g) || []).length > (b.match(/:/g) || []).length)
	        return 1;  
		 
		// keep regular expression at the end
        if((a.match(/\//g) || []).length < (b.match(/\//g) || []).length) return 1;
        
        //Normal sorting with alphabet
        var nameA=a.toLowerCase(), nameB=b.toLowerCase();
        if (nameA < nameB) //sort string ascending
        	return -1;
        if (nameA > nameB)
        	return 1;
        
        return 0;
	});
}

module.exports = DispatchWrapper;