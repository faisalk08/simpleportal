/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var dispatch = require('dispatch');

var logger = require("./../logger").getInstance();

var DispatchWrapper = function(urlHandlers) {
	var instance = this;
	instance.urlHandlers = urlHandlers ||{};
};

DispatchWrapper.prototype.addUrlHandler = function(urlHandlers){
	var instance = this;
	for(url in urlHandlers){
		console.log(url);
		instance.urlHandlers[url] = urlHandlers[url];
	}
}

DispatchWrapper.prototype.addUrlHandlers = function(urlHandlers){
	var instance = this;
	for(url in urlHandlers){
		instance.urlHandlers[url] = urlHandlers[url];
	}
}

DispatchWrapper.prototype.getUrlHandlers = function(urlHandlers){
	var instance = this;
	return instance.urlHandlers;
}

DispatchWrapper.prototype.addServiceHandlers = function(module, serviceUrl, serviceHandler){
	var instance = this;
	if(module){
		if(typeof module == 'function' || typeof module == 'string'){
		} else {
			for(var subModule in module){
				if(typeof module == 'string' || typeof module == 'function'){
				} else {
					var moduleServiceUrl = serviceUrl + '/' + subModule;
					var childServices = module[subModule].service;
					if(childServices){
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

DispatchWrapper.prototype.updateServiceRouter = function(serviceUrl, serviceName, method, serviceHandler){
	logger.debug('Dispatch Wrapper', 'Registering Service - ' + serviceUrl);
	var instance = this;
	var urlHandlers ={};

	urlHandlers[serviceUrl] = function (request, response, next, group) {
    	if(group)
			request.pathGroup = group;
		serviceHandler(serviceName, method, request, response);
    };

	instance.addUrlHandlers(urlHandlers);
}

DispatchWrapper.prototype.getViewRouter = function(moduleName, path, viewHandler, expressionField){
	logger.debug('Dispatch Wrapper', 'Registering View  - /' + moduleName + '/' + path);
	expressionField = expressionField || 'pathGroup';
	return {
		GET: function (request, response, next, group) {
			request['path'] = {};
			if(group) { 
				request['path'][expressionField] = group;
				request['pathGroup'] = group;
			}
			
			viewHandler(moduleName, path, request, response, viewHandler);
		}
	}
}

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
										path = '/(\\w+)';
									}
									
									path = view.replace('/:' + expressionField, '/(\\w+)');
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

DispatchWrapper.prototype.handlers = function(urls){
	var instance = this;
	return dispatch(instance.urlHandlers);
}

exports.DispatchWrapper = DispatchWrapper;