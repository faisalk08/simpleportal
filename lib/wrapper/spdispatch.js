/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var dispatch = require('dispatch');

var logger = require("./../logger");

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
	var instance = this;
	for(url in urlHandlers){
		instance.urlHandlers[url] = urlHandlers[url];
	}
}

/**
 * TO add multiple url handlers
 * 
 * @method addUrlHandlers
 * 
 * @param {} urlHandlers array of url handlers
 * @return 
 */
DispatchWrapper.prototype.addUrlHandlers = function(urlHandlers){
	var instance = this;
	
	for(url in urlHandlers){
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
DispatchWrapper.prototype.addServiceGlobalHandlers = function(module, serviceUrl, serviceHandler){
	var instance = this;
	
	var urls = {};
	
	urls[serviceUrl+'/:service/:method/:submethod'] = function(request, response, next, service, method, submethod){
		request['params'] = request['params']||{};
		
		//to make the old code work
		request['path'] = request['path']||{};
		
		request['params']['id'] = method;
			
		//to make the old code work
		request['path']['id'] = method;
		request['pathGroup'] = method;
		
		var uri = request.method + ' /:id' + '/' +submethod;		
		var uri_ = request.method + ' /' + method + '/' +submethod;
		
		serviceHandler(service, uri_, request, response, function(){
			serviceHandler(service, uri, request, response, next);
		});
	};
	
	urls[serviceUrl+'/:service/:method'] = function(request, response, next, service, method){
		request['params'] = request['params']||{};
		
		//to make the old code work
		request['path'] = request['path']||{};
		
		request['params']['id'] = method;
			
		//to make the old code work
		request['path']['id'] = method;
		request['pathGroup'] = method;
		
		var uri = request.method + ' /:id';
		var uri_ = request.method + ' /' + method;
		
		serviceHandler(service, uri_, request, response, function(){
			serviceHandler(service, uri, request, response, next);
		});
	};
	
	urls[serviceUrl+'/:service'] = function(request, response, next, service){
		var uri = request.method + ' ';
		var uri_ = request.method + ' /';
		var uri_1 = request.method;
		
		serviceHandler(service, uri, request, response, function(){
			serviceHandler(service, uri_, request, response, function(){
				serviceHandler(service, uri_1, request, response, next);
			});
		});
	};
	
	instance.addUrlHandler(urls);
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
DispatchWrapper.prototype.addServiceHandlers = function(module, serviceUrl, serviceHandler){
	var instance = this;
	
	if(module){
		if(typeof module == 'function' || typeof module == 'string'){
		} else {
			for(var subModule in module){
				if(typeof module == 'string' || typeof module == 'function'){
				} else {
					var moduleServiceUrl = serviceUrl + '/' + subModule;
					
					if(module[subModule] && module[subModule].name)
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
	logger.getInstance().debug('Dispatch Wrapper', 'Registering Service - ' + serviceUrl);
	var instance = this;
	var urlHandlers ={};

	urlHandlers[serviceUrl] = function (request, response, next, group, group1, group2) {
    	if(group){
    		request['params'] = request['params']||{};
			
			//to make the old code work
			request['path'] = request['path']||{};
			
			request.pathGroup = group;
			request.pathGroup1 = group1;
			
			request['params']['group1'] = group;
			request['params']['group2'] = group1;
			request['params']['group3'] = group2;
			
			//to make the old code work
			request['path']['group1'] = group;
			request['path']['group2'] = group1;
			request['path']['group3'] = group2;
			
			request['pathGroup'] = group;
			request['pathGroup1'] = group1;
			request['pathGroup2'] = group2;
    	}
    	
		serviceHandler(serviceName, method, request, response);
    };

	instance.addUrlHandlers(urlHandlers);
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
				
				//to make the old code work
				request['path'][expressionField] = group;
				request['pathGroup'] = group;
				
				request['params']['group'] = group;
				request['params']['group1'] = group1;
				request['params']['group2'] = group2;
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
	
	instance.addUrlHandlers(urlHandlers);
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
	
	logger.getInstance().debug('Simpleportal - dispatchwrapper', 'Registering the regular service handlers');
	
	var sortedUrlHandlers = sortUrlHandlers(instance.urlHandlers);
	
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
	
	//console.log(fullUrls);
	
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

exports.DispatchWrapper = DispatchWrapper;