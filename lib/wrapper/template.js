var fs = require("fs");

var simpleportal = require('simpleportal');

var Template = module.exports = function Template(options) {
	var instance = this;
	
	instance.file = options.file;
	instance.data = options.data||{};
	
	instance.html='';
	instance.templateBody='';
	instance.partials='';
	instance.error=[];
	instance.exception=options.exception||instance.data.exception;
}

/*
 * file - example - 'views/'+view+".ejs"
 */
Template.ENGINES = {
	'ejs':  'ejs',
	'mustache':   'mustache'
};
Template.EXCEPTION_TEMPLATE_FILE = './default_/resources/templates/exception.ejs'; 
Template.EXCEPTION_TEMPLATE = '<div><%if (loginRequired){%><a rel="external" href="/oauth/login">Login Required please Login</a><%} %></div>';

/**
 * file - view.ejs|layout.mustache
 */
Template.prototype.templateEngine = function(){
	var instance = this;
	
	var file = instance.file;
	var tmp     = file.lastIndexOf(".");
    var ext     = file.substring((tmp + 1));
    var engine    = Template.ENGINES[ext];
    
    var file = instance.file||Template.ERROR_FILE;
    
    return engine;
}

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
