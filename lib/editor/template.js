"use strict";

/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012-2017 Faisal Kottarathil(admin@simpleportaljs.com)
 *	
 * MIT Licensed
 */
/**
 * Template middleware for `simpleportal.Server`
 *
 * @property template
 * @for simpleportal
 * @type {template}
 * @static
 */

/**
 * Template middleware for `simpleportal.Server`
 * 
 * @class template
 * @module middleware
 * @static
 */
var template = module.exports = {};

var fs = require('fs'),
	util = require("./../util"),
//	logger = require("./logger"),
	templatetool = require("ejs");

//var mustache = require("mustache");

var templates = {};
var options ={};

template.convertTemplate = function(templatebody, templatecontent, callback){
	callback(null, templatetool.render(templatebody, templatecontent));
}

/**
 * Description
 * @method render
 * @param {} file
 * @param {} content
 * @param {} callback
 * @return 
 */
template.render = function(file, content, callback){
	// if field is typeof object
	var templatecontent = util.extendJSON({}, content, {
		getFieldFromObject:require('./editorutil').getFieldFromObject,
    	arraycontains:util.arraycontains
    });
	
    //may be included the service template content at the top
    var systemincludes = content.systemincludes;
    
    var templatebody = '';
    if(systemincludes){
    	for(var index in systemincludes){
    		templatebody += "\n<%- include "+systemincludes[index]+" %>\n"; 
        }
    }
    
	if(typeof file == 'object' && file.layout){
		fs.readFile(file.file, 'utf8', function (err, contentbody) {
	        if (err) {
	        	console.trace(err);
	        	
	        	callback(err);
	        }else{
	        	fs.readFile(file.layout, 'utf8', function (err, layoutbody) {
	        		contentbody = layoutbody.replace("<%- include(bodytemplate) %>", contentbody);
			        callback(null, templatetool.render(templatebody + '' + contentbody, templatecontent));
	    		});
	        }
		});
	}else{
		if(file && file.file)
			fs.readFile(file.file, 'utf8', function (err, contentbody) {
		        callback(err, templatetool.render(contentbody ? templatebody + contentbody : '', templatecontent));
			});
		else if(file)
			fs.readFile(file, 'utf8', function (err, contentbody) {
				callback(err, templatetool.render(contentbody ? templatebody + contentbody : '', templatecontent));
			});
		else
			callback("Not a valid template!");
	}
}

/**
 * Description
 * @method parseTemplateFile
 * @param {} file
 * @param {} content
 * @param {} callback
 * @return 
 */
template.parseTemplateFile = function(file, content, callback){
    fs.readFile(file, 'utf8', function (err, templateBody) {
        if (err) throw err;
        
        var html = templatetool.to_html(templateBody, content);
	
        callback(null, html);
    });
}

/**
 * Description
 * @method compile
 * @param {} templateBody
 * @param {} data
 * @param {} partials
 * @param {} callback
 * @return 
 */
template.compile = function(templateBody, data, partials, callback){
    var html = templatetool.to_html(templateBody, data, partials);
    
    callback(null, html);
}

/**
 * Description
 * @method parse
 * @param {} templateName
 * @param {} content
 * @param {} callback
 * @return 
 */
template.parse = function(templateName, content, callback){
	var templateBody;//@TODO - need to use caching here!!
	if(templateBody){
		compile_(templateBody, content, callback);
	} else{
		read(templateName, function (templateBody) {
			compile_(templateBody, content, callback);
		});
	}
	
	/**
	 * Description
	 * @method compile_
	 * @param {} templateBody
	 * @param {} content
	 * @param {} callback
	 * @return 
	 */
	function compile_(templateBody, content, callback){
		var partials = templates;
		if(content.template){
			for(partial in content.template){
				partials[partial] = template.get(content.template[partial]) || content.template[partial];
			}
		}
		
		template.compile(templateBody, content.data, partials, function(error, html){
			callback(error, html);
		});	
	}
}

/**
 * Description
 * @method cache
 * @param {} dir
 * @param {} prefix
 * @return 
 */
template.cache = function(dir, prefix){
	try{
		if(fs.existsSync(dir)){
			var files = fs.readdirSync(dir);
			for (var i in files) {
				var currentFile = dir + '/' + files[i];
				var stats = fs.statSync(currentFile);
				if (stats.isFile() && isStringEndsWith(files[i], '.mustache')) {
					read((prefix ? prefix+'/' : '') + files[i]);
				} else if (stats.isDirectory())
					template.cache(currentFile, (prefix ? prefix+'/' : '') + files[i]);
			}
		}
	}catch(err){
		console.trace(err);
	}
}

/**
 * Description
 * @method read
 * @param {} file
 * @param {} name
 * @param {} callback
 * @return 
 */
function read(file, name, callback){
	if(file.indexOf('/') == 0 || file.indexOf('.') == 0){
		//path absolute or relative
		readFile(file, null, callback);
	} else{
		//relative to configuration
		if(typeof name == 'function'){
			callback = name;
			name = file;
		} else if(name){}
		else
			name = file;
		
		name = name.substring(0, name.indexOf('.mustache'));
		
		readFile(file, name, callback);
	}
	
	/**
	 * Description
	 * @method readFile
	 * @param {} file
	 * @param {} cacheName
	 * @param {} callback
	 * @return 
	 */
	function readFile(file, cacheName, callback){
		if(!isStringEndsWith(file, '.mustache'))
			file = file + '.mustache';
		
		if(file.indexOf(options.root) != 0)
			file = options.root + '/' + file;
		
		if(typeof cacheName == 'function'){
			callback = cacheName;
			cacheName = null;
		}
		
		util.readFile(file, function(err, templateBody){
			if(err){
				logger.getInstance().error('Simple Portal -template', err);
				if(callback)
					callback(err);
			} else{
				if(cacheName){
					templates[cacheName]= templateBody.toString();
				}
				
				if(callback)
					callback(templateBody);
			}
		});
	}
}

/**
 * Description
 * @method get
 * @param {} templateName
 * @return MemberExpression
 */
template.get = function(templateName){
	return templates[templateName];
}

/**
 * Description
 * @method init
 * @param {} configuration
 * @return 
 */
template.init = function(configuration){
	logger.getInstance().debug('Simple Portal -template', 'Initializing Simple Template engine');
	
	if(configuration && configuration.resources && configuration.resources.template){
		if(configuration.resources.root)
			configuration.resources.template.root = (configuration.resources.root) + configuration.resources.template.root;
		
		options  = configuration.resources.template;
		options.homePage = configuration.homePage;
		
		template.cache(util.getServerPath(options.root));
	} else
		logger.getInstance().debug('Simple Portal -template', 'Template configuration is not done properly!!!');
}


/**
 * Description
 * @method renderPage
 * @param {} response
 * @param {} templateData
 * @param {} callback
 * @return 
 */
template.renderPage = function(response, templateData, callback){
	if(templateData && templateData.data && (templateData.data.error || templateData.data.exception)){
		if(templateData.data.exception)
			templateData.data.error = templateData.data.exception;
		
		template.parse(templateData.layout, 
			{
				data:templateData.data, 
				template:{
					'pages/content':'pages/common/error'
				}
			}, function(error, html){
				callback(null, html);
			}
		);
	} else{
		template.parse(templateData.layout, 
			{
				data:templateData.data,
				template:templateData.template
			}, function(error, html){
				callback(error, html);
			}
		);
	}
}

/**
 * Description
 * @method detailPage
 * @param {} request
 * @param {} response
 * @param {} options
 * @return 
 */
template.detailPage = function(request, response, options){
	var error = options.error;
	var result = options.result;
	var model = options.model;
	var layout = options.layout;
	var contentPage = options.contentPage;
	var pageTitle = options.pageTitle;
	
	var data = result||{};
	
	if(error){
		logger.getInstance().error('Simple Portal -template', 'Some error from --' + model + '--' + error);
	} else if(result.redirectUrl){
		response.writeHead(301, {'Location':result.redirectUrl});
		response.end();
	} else{
		logger.getInstance().debug('Simple Portal -template', 'data returned - ' + result.toString());
	}
	
	layout = layout||'layout';
	model = model||'model';
	contentPage = contentPage||'pages/' + model + '/details';
	data['error'] = error;
	if(pageTitle)
		data['pageTitle'] = pageTitle;
	
	template.renderPage(
		response,
		{
			layout:layout,
			data:data,
			template:{
				'pages/content':contentPage
			}, error:error
		}, function(error, html){
			response.send(200, {}, html);
		}
	);
}

/**
 * Description
 * @method listPage
 * @param {} request
 * @param {} response
 * @param {} options
 * @return 
 */
template.listPage = function(request, response, options){
	var error = options.error;
	var result = options.result;
	var model = options.model;
	var layout = options.layout;
	var contentPage = options.contentPage;
	var pageTitle = options.pageTitle;
	
	layout = layout||'layout';
	model = model||'model';
	contentPage = contentPage||'pages/' + model + '/list';
	
	var data = {};
	if(result && result[model]){
		data = result;
		data['empty'] = data[model].length==0;
		data['error'] = error;
	}else{
		result = result||{};
		data[model] = result;
		data['empty'] = result.length==0;
		data['error'] = error;
	}
	
	if(error){
		logger.getInstance().error('Simple Portal -template', 'Some error from --' + model + '--' + error);
	} else if(result.redirectUrl){
		response.writeHead(301, {'Location':result.redirectUrl});
		response.end();
	} else{
		logger.getInstance().debug('Simple Portal -template', 'data returned - ' + result.toString());
	}
	
	if(pageTitle)
		data['pageTitle'] = pageTitle;
	
	template.renderPage(
		response,
		{
			layout:  request.ajax ? contentPage : layout,
			data:data,
			template:{
				'pages/content':contentPage
			}, error:error
		}, function(error, html){
			response.send(200, {}, html);
		}
	);
}

/**
 * Description
 * 
 * @method initRouter
 * @param {} configuration
 * @param {} callback
 * @return 
 */
template.initRouter = function(configuration, callback){
	logger.getInstance().info('Simple Portal - templateloader : initRouter', 'Initializing template routers');
	
	if(callback)
		callback();
}

/**
 * private util function
 * @method isStringEndsWith
 * @param {} string
 * @param {} substring
 * @return LogicalExpression
 */
function isStringEndsWith(string, substring) {
  return string.length >= substring.length && string.substring(string.length - substring.length) == substring;
}
