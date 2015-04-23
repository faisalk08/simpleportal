var fs = require("fs");

var simpleportal = require('./../simpleportal');

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
	instance.templateBody='';
	
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
Template.EXCEPTION_TEMPLATE_FILE = './default_/resources/templates/exception.ejs'; 

/**
 * @property EXCEPTION_TEMPLATE
 * @type string
 * @static 
 * @final
 */
Template.EXCEPTION_TEMPLATE = '<div><%if (loginRequired){%><a rel="external" href="/oauth/login">Login Required please Login</a><%} %></div>';

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
	
	var file = instance.file;
	var tmp     = file.lastIndexOf(".");
    var ext     = file.substring((tmp + 1));
    var engine    = Template.ENGINES[ext];
    
    var file = instance.file||Template.ERROR_FILE;
    
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
	
	if(instance.error && instance.error.length > 0){
		if(callback)
			callback(null, instance.html);
		else
			response.send(200, {}, instance.error.join(', '));
	} else if(instance.data && instance.data.hasOwnProperty('loginRequired')){
		instance.templateBody = Template.EXCEPTION_TEMPLATE;
		
		instance.compile();
		instance.sendToResponse(response, callback);
	}else
		fs.readFile(instance.file, 'utf-8', function(err, templateBody) {
			instance.templateBody = templateBody;
			instance.compile();
			instance.sendToResponse(response, callback);
			/*var error = '';
			
			if(instance.error && instance.error.length > 0)
				instance.html = instance.error.join(', ');
			if(callback)
				callback(null, instance.html);
			else if(response.getHeader('Content-Type') && 
				(
					response.getHeader('Content-Type').indexOf('text/json') != -1 || 
					response.getHeader('Content-Type').indexOf('application/json') != -1
				)
			)
				response.json(instance.html, error);
			else
				response.send(200, {}, instance.html);*/
	    });
}

/**
 * Description
 * @method sendToResponse
 * @param {} response
 * @param {callback} callback The callback to excecute when complete
 */
Template.prototype.sendToResponse = function(response, callback){
	var instance = this;
	var error;
	if(instance.error && instance.error.length > 0)
		error = instance.error.join(', ');
	
	if(callback)
		callback(error, instance.html);
	
	else if(response.getHeader('Content-Type') && 
		(
			response.getHeader('Content-Type').indexOf('text/json') != -1 || 
			response.getHeader('Content-Type').indexOf('application/json') != -1
		)
	)
		response.json(instance.html, error);
	else
		response.send(200, {}, instance.html);
}

/**
 * To compile the template using template engine and the data provided
 * 
 * @method compile
 */
Template.prototype.compile = function(){
	var instance = this;
	
	if(instance.exception){
		instance.html = '';
		instance.error.push(instance.exception);
	}else if(instance.templateEngine(instance.file) == 'ejs'){
		var templatetool = require('ejs');
		var fn = templatetool.compile(instance.templateBody);
		
        try{
        	instance.html = fn(instance.data);
        }catch(error){
            console.log('*********Error while processing template........');
            console.log(error);
            instance.error.push(error);
            instance.html = '';
        }
	} else if(instance.templateEngine(instance.file) == 'mustache'){
		var templatetool = require('mustache');
		var html = templatetool.to_html(instance.templateBody, instance.data, instance.partials);
	    
		instance.html = html;
	}
}
