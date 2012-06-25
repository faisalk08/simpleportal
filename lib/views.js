var views = module.exports = {};

var fs = require('fs');
var url = require('url');

var viewUrl = '';

var logger = require("./logger").getInstance();

var viewdir = './views';
fs.lstat(viewdir, function(err, stats) {
	if (!err && stats.isDirectory()) {
		fs.readdirSync(viewdir).forEach(function(filename){
		    if (/\.js$/.test(filename)) {
				if(filename != 'index.js'){
				    var name = filename.substr(0, filename.lastIndexOf('.'));
				    var path = fs.realpathSync(viewdir + '/' + name + '.js');
				    views.__defineGetter__(name, function(){
				            return require(path);
				    });
				}
		    }
		});
	} else{
		console.log('Views folder is not found in your root, using default..');

		fs.readdirSync(__dirname + '/../default_/views').forEach(function(filename){
		    if (/\.js$/.test(filename)) {
				if(filename != 'index.js'){
				    var name = filename.substr(0, filename.lastIndexOf('.'));
				    views.__defineGetter__(name, function(){
				            return require(__dirname + '/../default_/views/' + name);
				    });
				}
		    }
		});
	}
});

/*
 * overriding the home page redirection
 */
views.initRouter = function(router){
    console.log('Initializing view routers');
    router.dispatch.addViewHandlers(views, viewUrl, views.call);
}

views.call = function(moduleName, method, request, response, callback){
	console.log('Request for view - '+ moduleName + ' method - '+ method +' -- is made');
        
	var caller = views[moduleName].view[method];
	if(!caller)
		for (caller in views[moduleName].view) break;
	
	if(typeof caller == 'string')
		caller = views[moduleName].view[caller];
	
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