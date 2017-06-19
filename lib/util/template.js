"use strict";
var fs = require("fs"),
	path = require("path"),
	util=require("./../util");

var Template = 
/**
  * Server side template engine where ejs|mustache template can be used for generating html content
  *  
  * @class TemplateWrapper
  * 
  * @module simpleportal
  * @submodule wrapper
  * 
  * @constructor
  * 
  * @param {} options
  */
 module.exports = function Template(options) {
	var instance = this;
	
	/**
	 * Template file path
	 * @property file
	 * @type string
	 */
	instance.file = options.file;
	instance.filelookups = options.filelookups;
	
	if(instance.file && instance.filelookups)
		instance.filelookups.unshift(instance.file);
	else if(!instance.filelookups)
		instance.filelookups = [instance.file];
	
	instance.systemincludes  = options.systemincludes;
	
	instance.exceptionfile = options.exceptionfile||Template.EXCEPTION_TEMPLATE_FILE;
	
	/**
	 * Data for rendering to the template
	 * @property data
	 * @type object
	 */
	instance.data = options.data||{};
	
	/**
	 * formatted html
	 * @property html
	 * @type string
	 */
	instance.html='';
	
	/**
	 * Template text
	 * @property templateBody
	 * @type string
	 */
	instance.templateBody= options.templateBody||'';
	
	/**
	 * partials used in the template 
	 * @property partials
	 * @type string
	 */
	instance.partials='';
	
	/**
	 * Error during template process 
	 * @property error
	 * @type array
	 */
	instance.error=[];
	
	/**
	 * Exception while fetching the data, or to show in to the html
	 * @property exception
	 * @type object
	 */
	instance.exception=options.exception||instance.data.exception;
	
	/**
	 * Template engine used
	 * @property engine
	 * @type object
	 */
	instance.engine = options.engine;
	
	return instance;
}

/**
 * @property ENGINES
 * @type array
 * @static 
 * @final
 */
Template.ENGINES = {
	'ejs':  'ejs',
	'mustache':   'mustache'
};

/**
 * @property EXCEPTION_TEMPLATE_FILE
 * @type string
 * @static 
 * @final
 */
Template.EXCEPTION_TEMPLATE_FILE = './../../server/resources/templates/public/exception.html.ejs'; 

/**
 * @property EXCEPTION_TEMPLATE
 * @type string
 * @static 
 * @final
 */
Template.EXCEPTION_TEMPLATE = '<div><%if (loginRequired){%><a rel="external" href="/oauth/login">Login Required please Login</a><%} %></div>';
//Template.EXCEPTION_TEMPLATE = '<div><%if (loginRequired){%><a rel="external" href="/oauth/login">Login Required please Login</a><%} else if(templateError){%><%= templateError %><%} %></div>';

/**
 * To get the template engin
 * 
 * @method templateEngine
 * 
 * @return engine Template engine
 */
Template.prototype.templateEngine = function(){
	var instance = this;
	
	if(instance.engine)
		return Template.ENGINES[instance.engine];
	
//	var file = instance.file;

    var file = instance.file||instance.exceptionfile;

	var tmp     = file.lastIndexOf(".");
    var ext     = file.substring((tmp + 1));
    var engine    = Template.ENGINES[ext];
	
    return engine;
}

/**
 * To render formatted html file in to the http response
 * 
 * @method render
 * @param {} response http response
 * @param {callback} callback The callback to excecute when complete 
 */
Template.prototype.render = function(response, callback){
	var instance = this;
	
	if(typeof response == 'function')
		callback = response;
	
	instance.templateError = null;
	
	if(instance.templateBody){
		instance.compile();
		
		instance.sendToResponse(response, callback);
	} else if(instance.error && instance.error.length > 0){
		if(callback)
			callback(null, instance.html);
		else
			response.send(200, {}, instance.error.join(', '));
	} else if(instance.data && instance.data.hasOwnProperty('loginRequired')){
		instance.templateBody = Template.EXCEPTION_TEMPLATE;
		
		instance.compile();
		instance.sendToResponse(response, callback);
	}else if(instance.exception && instance.exceptionfile){
		getTemplate( [instance.exceptionfile], function(err, templateBody) {
			instance.templateBody = templateBody;
			
			if(instance.exception && typeof instance.exception == 'string' && instance.exception.indexOf("<body>") != -1){
				instance.exception = util.getTextBetween(instance.exception, '<body>', '</body>');
			}
			
			instance.compile();
			
			instance.sendToResponse(response, callback);
	    });
	}else{
		getTemplate(instance.filelookups, function(err, templateBody, templateprops){
			instance.templateFile = templateprops;
			
			instance.templateError = err;
			instance.templateBody = templateBody;

			var systemincludes = '';
			// if system includes
			if(instance.systemincludes){
		    	for(var index in instance.systemincludes){
		    		systemincludes += '\n<%- include ' + instance.systemincludes[index] + ' %>\n'; 
		        }
		    }
			
			instance.templateBody = systemincludes + templateBody;
			
			instance.compile();
			instance.sendToResponse(response, callback);
	    });
	}
}

/**
 * Description
 * @method sendToResponse
 * @param {} response
 * @param {callback} callback The callback to excecute when complete
 */
Template.prototype.sendToResponse = function(response, callback, headers){
	var instance = this;
	
	var error;
	if(instance.error && instance.error.length > 0)
		error = instance.error.join(', ');
	
	headers = headers||{};
	
	if(callback)
		callback(error, instance.html);
	else if(response && response.callback){
		var body = response.callback.replace(/[^\w$.]/g, '') + '(' + JSON.stringify(instance.html) + ');';
		headers['Content-Type'] = 'text/javascript';
	
		if(error)
			response.send(404, {}, error);
		else
			response.send(200, headers, body);
	} else if(response && response.getHeader('Content-Type') && 
		(
			response.getHeader('Content-Type').indexOf('text/json') != -1 || 
			response.getHeader('Content-Type').indexOf('application/json') != -1
		)
	)
		response.json(instance.html, error);
	else if(response && error)
		response.send(404, {}, error);
	else if(response)
		response.send(200, {}, instance.html);
}

/**
 * To compile the template using template engine and the data provided
 * 
 * @method compile
 */
Template.prototype.compile = function(){
	var instance = this;

	if(instance.exception)
		instance.data.exception=instance.exception;
	
	if(instance.templateError){
		instance.html= "<div>"+ instance.templateError +"</div>";
	}else if(instance.exception && !instance.exceptionfile){
		instance.html = '';
		
		instance.error.push(instance.exception);
	}else if(instance.templateEngine(instance.file) == 'ejs'){
		var templatetool = require('ejs');
		
		if(!instance.data.filename)
    		instance.data.filename = instance.file;
		
		try{
			// should make a clone of this object
			var dataToProcess = util.extendJSON({
				languageid:'en'
			}, instance.data);
			
			var translations = {en:{
				"remember-me":"Remember me",
				"oauth-provider-profile":"{0} profile"
			}};
			
			var Utils = require("./../template/util");
			
			dataToProcess.getMessage = function(key, args){
				return Utils.getTranlsatedMessage(translations, this.languageid, key, args);
			}
			
			if(!dataToProcess.templatedir)
				dataToProcess.templatedir = "./../../server/resources/templates/public";
			
			instance.html = templatetool.render(instance.templateBody, dataToProcess);
		}catch(error){
			console.trace(error);
			
			instance.error.push(error);
			instance.html = '';
	    }
	} else if(instance.templateEngine(instance.file) == 'mustache'){
		var templatetool = require('mustache');
		var html = templatetool.to_html(instance.templateBody, instance.data, instance.partials);
	    
		instance.html = html;
	}
}

/**
 * To read the template using filelookups !!
 */
var getTemplate = function(filelookups, callback){
	if( !filelookups || filelookups.length <= 0 ){
		callback("No file found to load");
	}else{
		var filetoread = path.normalize(filelookups[0]);
		
		fs.readFile(filetoread, 'utf-8', function(err, templateBody) {
			if(err)
				console.error(err);
			
			if(!err){
				// need to include the template details in to the callback
				fs.stat(filetoread, function(error, stat){
					callback(err, templateBody, {file:filetoread, stat:stat});
				});
			} else if( filelookups.length > 1 ){
				getTemplate(filelookups.splice(1), callback);
			} else
				callback(err, templateBody || '', filetoread);
		});
	}
}
