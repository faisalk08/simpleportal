"use strict";

/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012-2017 Faisal(admin@simpleportaljs.com)
 *	
 * MIT Licensed
 */

var fs = require('fs'),
	util = require("./../util"),
	url = require('url'),
//	logger = require("./../logger"),
	ViewService = require("./../service/viewservice"),
	Routerclass = require("./router");

/**
 * Application view loader middleware for `simpleportal.Server`
 *
 * @property viewloader
 * @for simpleportal
 * @type {viewloader}
 * @static
 */

/**
 * Application view loader middleware for `simpleportal.Server`
 * 
 * @class viewloader
 * @module middleware
 */
var ViewLoader = module.exports = function(options, serverInstance){
	var instance = this;
	if(serverInstance){
		var serveroptions = {
			systemviewdir:serverInstance.getServerCorePath("view")
		}
		options = util.extendJSON(serveroptions, options);
	}
	
	Routerclass.call(instance, options, serverInstance);
	
	options = options||{};
	
	instance.routerid = options.routerid||"viewloader";
	
	instance.viewUrl = options.viewUrl || "";
	instance.viewdir = options.viewdir || "view";
	instance.systemviewdir = options.systemviewdir||__dirname + "/../../server/view";

	instance.preferencekey = 'view';
	instance.routers = {};
	
	return instance;
};
require("util").inherits(ViewLoader, Routerclass);

ViewLoader.prototype.loadRouter = function(configuration, callback){
	var instance = this;
	
	instance.loadViews({viewdir:instance.systemviewdir, prefix:'system_'}, function(){
		instance.loadViews(configuration, function(){
			instance.emit("router.loaded");
			
			if(callback)
				callback();
		});
	});
}

/**
 * To load routers
 *  
 * @method loadViews
 * 
 * @param {} configuration
 * @param {callback} callback The callback to excecute when complete
 */
ViewLoader.prototype.loadViews = function(configuration, callback){
	var instance = this;
	
	var viewdir = configuration&&configuration.viewdir ?  configuration.viewdir : instance.viewdir;

	instance.getLogger().info(instance.routerid + ':loadViews', 'loading from << ' + viewdir);
	
	if(!fs.existsSync(viewdir)){
		if(callback)
			callback();	
	}else{
		var stats = fs.lstatSync(viewdir);
		
		if (stats.isDirectory()) {
			if (stats.isDirectory()) {
				fs.readdirSync(viewdir).forEach(function(filename){
				    if (/\.js$/.test(filename)) {
						if(filename != 'index.js'){
						    var name = filename.substr(0, filename.lastIndexOf('.'));
						    var path = fs.realpathSync(viewdir + '/' + name + '.js');
						    
						    instance.getLogger().debug(instance.routerid + ':loadViews', 'loading view -' + name);

						    var servicename = name;
						    if(configuration && configuration.prefix)
						    	servicename = configuration.prefix + name;
						    
						    try{
						    	if(!instance[servicename])
							    	instance.routers.__defineGetter__(servicename, function(){
							            return require(path);
								    });
						    } catch(error){
								delete instance.routers[servicename];
								
								instance._routererrors[servicename] = {plugin:configuration.id, error:error};
								
								instance.getLogger().error(instance.routerid + ':loadViews', error);
							} 
						}
				    }
				});
			}
			
			if(callback)
				callback();	
		}else if(callback)
			callback();	
	}
}

/**
 * Server callback 
 * 
 * @method call
 * @param {} moduleName
 * @param {} method
 * @param {} request
 * @param {} response
 * @param {callback} callback The callback to excecute when complete
 */
ViewLoader.prototype.call = function(moduleName, method, request, response, next) {
	var instance = this;
	
	var caller = instance.routers[moduleName].view[method];
//	if(!caller)
//		for (caller in instance[moduleName].view) break;
	
	if(typeof caller == 'string')
		caller = instance.routers[moduleName].view[caller];
	
	var parsedUrl= url.parse(request.url, false );
	var queryParam = parsedUrl.query;
	
	if(queryParam){
		var ajax = queryParam.substring(queryParam.indexOf('ajax=')+5);
		if(ajax.indexOf('&') != -1)
			ajax = ajax.substring(0, ajax.indexOf('&'));
		
		request.ajax = ajax == 'true';
	}
	
	if(caller)
		caller(request, response, function(error, viewdata){
	//		callback(response, error, results);
			util.sendServiceResponse(response, error, viewdata);
		});
	else if(next)
		next();
}

ViewLoader.prototype.registerViewHandler = function(){
	var instance = this;
	instance.getLogger().info('ViewLoader class : loadViews', "Calling view loader registerViewHandler");
	
	if(instance.routers){
		for(var view in instance.routers){
			instance.urlHandles["GET /" + view] = instance.routers[view].urlHandles;
			
			if(!instance.routers[view].urlHandles['GET'] && instance.routers[view].urlHandles['/'])
				instance.routers[view].urlHandles['GET'] = instance.routers[view].urlHandles['/'];
		}
	}
//	console.log(instance.urlHandles);
//	instance.urlHandles = addViewHandlers(instance, instance.viewUrl, function(){instance.call.apply(instance, arguments);});
}

/**
 * Private method for updating all sub module which is view service in to the url handler
 */
var addViewHandlers = function(module, viewUrl, viewHandler){
	var urlHandlers ={};
	
	if(module){
		if(typeof module == 'string' || typeof module == 'function'){
		} else {
			for(var subModule in module){
				if(subModule && subModule != undefined && module[subModule] && typeof module[subModule] == "object"){
					if(typeof module == 'string' || typeof module == 'function'){
					} else {
						var childViews = module[subModule].urlHandles;
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
								
								childViewHandles[path] = getViewRouter(subModule, view, viewHandler, expressionField);
							}
							if(firstView)
								childViewHandles['GET'] = getViewRouter(subModule, firstView, viewHandler);
							
							urlHandlers['/' + subModule]=childViewHandles;
						}
					}
				}
			}
		}
	}
	
	return urlHandlers;
}


var getViewRouter = function(moduleName, path, viewHandler, expressionField){
//	logger.getInstance().debug('Dispatch Wrapper', 'Registering View  - /' + moduleName + '/' + path);
	
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
			}
			
			viewHandler(moduleName, path, request, response, viewHandler);
		}
	}
}