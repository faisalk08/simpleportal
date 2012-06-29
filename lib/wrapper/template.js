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
}

/*
 * file - example - 'views/'+view+".ejs"
 */
Template.ENGINES = {
	'ejs':  'ejs',
	'mustache':   'mustache'
};

/**
 * file - view.ejs|layout.mustache
 */
Template.prototype.templateEngine = function(){
	var instance = this;
	
	var file = instance.file;
	var tmp     = file.lastIndexOf(".");
    var ext     = file.substring((tmp + 1));
    var engine    = Template.ENGINES[ext];
    
    return engine;
}

Template.prototype.render = function(response, callback){
	var instance = this;
	
	callback = callback;
	if(typeof response == 'function')
		callback = response;
	
	fs.readFile(instance.file, 'utf-8', function(err, templateBody) {
		instance.templateBody = templateBody;
		instance.compile();
		if(callback)
			callback(null, instance.html);
		else if(response.getHeader('Content-Type') && 
			(
				response.getHeader('Content-Type').indexOf('text/json') != -1 || 
				response.getHeader('Content-Type').indexOf('application/json') != -1
			)
		)
			response.json(instance.html);
		else
			response.send(200, {}, instance.html);
		
    });
}

Template.prototype.compile = function(){
	var instance = this;
	
	if(instance.templateEngine(instance.file) == 'ejs'){
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
