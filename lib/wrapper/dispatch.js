/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var dispatch = require('dispatch');

var DispatchWrapper = function(urlHandlers) {
	var instance = this;
	instance.urlHandlers = urlHandlers ||{};
};

DispatchWrapper.prototype.addUrlHandlers = function(urlHandlers){
	var instance = this;
	for(url in urlHandlers){
		instance.urlHandlers[url] = urlHandlers[url];
	}
}

DispatchWrapper.prototype.addServiceHandlers = function(module, serviceUrl, serviceHandler){
	var instance = this;
	if(module){
		if(typeof module == 'function' || typeof module == 'string'){
		} else {
			for(var subModule in module){
				if(typeof module == 'function'){
				} else {
					var moduleServiceUrl = serviceUrl + '/' + subModule;
					var childServices = module[subModule].service;
					if(childServices){
						for(var serviceName in childServices){
							var serviceUrl_ = moduleServiceUrl + '/' + serviceName; 
							instance.updateServiceRouter(serviceUrl_, subModule, serviceName, serviceHandler);
						}
					}
				}
			}
		}
	}
}

DispatchWrapper.prototype.updateServiceRouter = function(serviceUrl, serviceName, method, serviceHandler){
	console.log('Registering service handler for url-' + serviceUrl);
	var instance = this;
	var urlHandlers ={};
	urlHandlers[serviceUrl] = {
        GET: function (request, response, next) {
        	serviceHandler(serviceName, method, request, response);
        }
    };
	instance.addUrlHandlers(urlHandlers);
}

DispatchWrapper.prototype.getViewRouter = function(moduleName, path, viewHandler){
	console.log('Registering view handler for url- /' + moduleName + '/' + path);
	return {
		GET: function (request, response, next, group) {
			if(group)
				request.pathGroup = group;
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
								var index =  path.indexOf('/');
								if(index == 0)
									path = path;
								else
									path = '/' + path;
								
								childViewHandles[path] = instance.getViewRouter(subModule, view, viewHandler);
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