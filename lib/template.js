/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var template = module.exports = {};

var fs = require('fs');

var mustache = require("mustache");

var util = require("./util");

var templates = {};
var options ={};

template.parseTemplateFile = function(file, content, callback){
    fs.readFile(file, 'utf8', function (err, templateBody) {
        if (err) throw err;
        
        var html = mustache.to_html(templateBody, content);
	
        callback(null, html);
    });
}

template.compile = function(templateBody, data, partials, callback){
    var html = mustache.to_html(templateBody, data, partials);
    
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
				console.log(err);
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
	console.log('Initializing Simple Template engine');
	
	if(configuration && configuration.resources && configuration.resources.template){
		if(configuration.resources.root)
			configuration.resources.template.root = (configuration.resources.root) + configuration.resources.template.root;
		
		options  = configuration.resources.template;
		options.homePage = configuration.homePage;
		template.cache(options.root);
	} else
		console.log('Template configuration is not done properly!!!');
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

template.initRouter = function(router){
	console.log('Initializing Template view router');
	var urlHandlers ={};
	if(options.homePage && options.homePage != '/'){
		urlHandlers['/'] = {
			GET: function (request, response, next) {
				console.log('Root is redirected to home page!!!');
				response.send(302, {'Location': options.homePage}, '');
			}
		};
	}
	
	urlHandlers['/pages'] = {
        GET: function (request, response, next) {
        	template.parse('layout', 
				{
					data:{},
					template:{
						'pages/content':'pages/common/home'
					}
				}, function(error, html){
					response.send(200, {}, html);
				}
			);
        },
        '/(\\w+|)/?':function(request, response, next, group){
        	template.parse(group, 
				{
					data:{},
					template:{
						'pages/content':''
					}
				}, function(error, html){
					response.send(200, {}, html);
				}
			);
        }
    };
    router.dispatch.addUrlHandlers(urlHandlers);
}

/*
 * private util function
 */
function isStringEndsWith(string, substring) {
  return string.length >= substring.length && string.substring(string.length - substring.length) == substring;
}