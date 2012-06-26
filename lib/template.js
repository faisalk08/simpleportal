/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var template = module.exports = {};

var fs = require('fs');

//var mustache = require("mustache");

var util = require("./util");

var templates = {};
var options ={};
var logger = require("./logger").getInstance();

var templatetool = require("mustache");

template.parseTemplateFile = function(file, content, callback){
    fs.readFile(file, 'utf8', function (err, templateBody) {
        if (err) throw err;
        
        var html = templatetool.to_html(templateBody, content);
	
        callback(null, html);
    });
}

template.compile = function(templateBody, data, partials, callback){
    var html = templatetool.to_html(templateBody, data, partials);
    
    callback(null, html);
}

template.parse = function(templateName, content, callback){
	var templateBody;//@TODO - need to use caching here!!
	if(templateBody){
		compile_(templateBody, content, callback);
	} else{
		read(templateName, function (templateBody) {
			compile_(templateBody, content, callback);
		});
	}
	
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

template.cache = function(dir, prefix){
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
				logger.error('Simple Portal -template', err);
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

template.get = function(templateName){
	return templates[templateName];
}

template.init = function(configuration){
	logger.debug('Simple Portal -template', 'Initializing Simple Template engine');
	
	if(configuration && configuration.resources && configuration.resources.template){
		if(configuration.resources.root)
			configuration.resources.template.root = (configuration.resources.root) + configuration.resources.template.root;
		
		options  = configuration.resources.template;
		options.homePage = configuration.homePage;
		template.cache(options.root);
	} else
		logger.debug('Simple Portal -template', 'Template configuration is not done properly!!!');
}


template.renderPage = function(response, templateData, callback){
	if(templateData.data.error || templateData.data.exception){
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

template.detailPage = function(request, response, options){
	var error = options.error;
	var result = options.result;
	var model = options.model;
	var layout = options.layout;
	var contentPage = options.contentPage;
	var pageTitle = options.pageTitle;
	
	var data = result||{};
	
	if(error){
		logger.error('Simple Portal -template', 'Some error from --' + model + '--' + error);
	} else if(result.redirectUrl){
		response.writeHead(301, {'Location':result.redirectUrl});
		response.end();
	} else{
		logger.debug('Simple Portal -template', 'data returned - ' + result.toString());
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
		logger.error('Simple Portal -template', 'Some error from --' + model + '--' + error);
	} else if(result.redirectUrl){
		response.writeHead(301, {'Location':result.redirectUrl});
		response.end();
	} else{
		logger.debug('Simple Portal -template', 'data returned - ' + result.toString());
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

/*
 * private util function
 */
function isStringEndsWith(string, substring) {
  return string.length >= substring.length && string.substring(string.length - substring.length) == substring;
}