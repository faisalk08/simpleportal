/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

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
var ViewLoader = module.exports = {};

var fs = require('fs');
var url = require('url');

var logger = require("./logger");

/**
 * URI for view handlers
 * @property viewUrl
 * @type string
 */
ViewLoader.viewUrl = '';

/**
 * Default directory where view files are stored
 * 
 * @property viewdir
 * @type string
 */
ViewLoader.viewdir = 'view';

/**
 * To load views
 *  
 * @method loadViews
 * 
 * @param {} configuration
 * @param {callback} callback The callback to excecute when complete
 */
ViewLoader.loadViews = function(configuration, callback){
	viewdir = configuration&&configuration.viewdir ?  configuration.viewdir : ViewLoader.viewdir;
	
	logger.getInstance().info('Simple Portal - viewLoader : loadViews', 'loading views - ' + viewdir);
	
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
						    
						    logger.getInstance().info('Simple Portal - viewLoader : loadViews', 'loading view -' + name);
							
						    ViewLoader.__defineGetter__(name, function(){
					            return require(path);
						    });
						}
				    }
				});
			}/* else{
				logger.getInstance().debug('Simple Portal-ViewLoader', 'Views folder is not found in your root, using default..');
	
				fs.readdirSync(__dirname + '/../default_/views').forEach(function(filename){
				    if (/\.js$/.test(filename)) {
						if(filename != 'index.js'){
						    var name = filename.substr(0, filename.lastIndexOf('.'));
						    ViewLoader.__defineGetter__(name, function(){
					            return require(__dirname + '/../default_/views/' + name);
						    });
						}
				    }
				});
			}*/
			
			if(callback)
				callback();	
		}else if(callback)
			callback();	
	}
}

/**
 * To register the router from the view loader
 * 
 * @method initRouter
 * @param {} router
 * @param {callback} callback The callback to excecute when complete
 * @return 
 */
ViewLoader.initRouter = function(router, callback){
	logger.getInstance().info('Simple Portal - ViewLoader : initRouter', 'Initializing ViewLoader routers');
	
	router.dispatch.addViewHandlers(ViewLoader, ViewLoader.viewUrl, ViewLoader.call);
    
    if(callback)
    	callback();
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
ViewLoader.call = function(moduleName, method, request, response, callback){
	logger.getInstance().debug('Simple Portal -ViewLoader', 'Request for view - '+ moduleName + ' method - '+ method +' -- is made');
        
	var caller = ViewLoader[moduleName].view[method];
	if(!caller)
		for (caller in ViewLoader[moduleName].view) break;
	
	if(typeof caller == 'string')
		caller = ViewLoader[moduleName].view[caller];
	
	var parsedUrl= url.parse(request.url, false );
	var queryParam = parsedUrl.query;
	
	if(queryParam){
		var ajax = queryParam.substring(queryParam.indexOf('ajax=')+5);
		if(ajax.indexOf('&') != -1)
			ajax = ajax.substring(0, ajax.indexOf('&'));
		request.ajax = ajax == 'true';
	}
	
	caller(request, response, function(error, results){
		callback(response, error, results);
	});
}

/**
 * To update configuration
 * 
 * @method updateConfiguration
 * @param {} configuration
 */
ViewLoader.updateConfiguration=function(configuration){
	ViewLoader.configuration=configuration;
}