var http = require("http");
var events = require('events');

var simpleportal = require('simpleportal');
var logger = require('simpleportal').logger.getInstance();
var services = simpleportal.services;
var views = simpleportal.views;

var Server = module.exports = function Server(options) {
	var instance = this;
	options = options || {};
	instance.options = options;
	
	if(options && options.configure){
		instance.configure = options.configure;
	}

	instance.router = simpleportal.router;
	
	events.EventEmitter.call(instance);
}

require("util").inherits(Server, events.EventEmitter);

Server.prototype.configure = function() {
	var instance = this;
	var configuration = instance.configuration;
	
	var staticResourceDir = configuration.resources.root + 'public/';
	var connect = require('connect');
	
	instance.server.use(connect.favicon(staticResourceDir + '/favicon.ico'));
	instance.server.use(connect.static(staticResourceDir));
	
	if(configuration.resources.publicdirs && typeof configuration.resources.publicdirs.length != 'undefined'){
		configuration.resources.publicdirs.forEach(function(resource){
			instance.server.use(connect.static(resource));
		});
	}
	
	if(instance.configureconnect)
		instance.configureconnect();
	else{
		instance.server.use(connect.cookieParser('keyboard cat'));
		instance.server.use(connect.session({ secret:'keyboard cat', cookie: { maxAge: 60000 }}));
	}
}

Server.prototype.startServer = function() {
	var instance = this;
	try{
		var server = require('connect').createServer();
		instance.server = server;
		
		instance.configure();
		
		server.listen(instance.configuration.port || 9665);
		
		logger.info('Simple Portal -server', 'Server started, and listening on port - '+ instance.configuration.port);

		instance.emit('start', {});
	} catch(error){
		console.log(error);
		logger.error('Simple Portal -server', error);
	}
}

Server.prototype.init = function() {
	var instance = this;

	/**
	 * initializing the configuration init
	 */
	instance.use(simpleportal.configuration);
	
	/**
	 * listening to on start event where we wiil register the router events
	 */
	instance.on('start', function(){
		instance.router.register([services, views, simpleportal.oauth, simpleportal.template]);
		
		instance.server.use(simpleportal.Response());
		
		instance.server.use(simpleportal.logger.accessLog());
		instance.server.use(instance.router.dispatch.handlers());
	});
	
	instance.on('services.ready', function(){
		instance.startServer();
	});

	/**
	 * overriding the NODE js Response method!!!
	 */
	http.ServerResponse.prototype.send = function (status, headers, body) {
		if(headers && !(headers['content-type'] || headers['Content-Type'])){
			headers['Content-Type'] = 'text/html; charset=UTF-8';
		}
		
		this.writeHead(status, headers);
		this.write(body || '');
	    this.end();
	};
	
	http.ServerResponse.prototype.contentType = function(value){
		if(value)
			this.content_type = value;
		return this.content_type;
	}
	
	http.ServerResponse.prototype.json = function(body){
		simpleportal.util.sendServiceResponse(this, null, body);
	}
}

Server.prototype.createServer = function() {
	var instance = this;

	/**
	 * Creating server.
	 */
	instance.init();
}

Server.prototype.initServer = function(configuration){
	logger.debug('Simple Portal-server', 'Initilizing the server started...');
	
	var instance = this;
	
	instance.configuration = configuration;

	instance.use(simpleportal.logger);
	instance.use(simpleportal.oauth);
	instance.use(simpleportal.template);
	
	instance.use(simpleportal.db);
	
	var services = simpleportal.services;
	
	instance.use(services);
}

Server.prototype.use = function(module){
	var instance = this;
	
	if(module == simpleportal.db){
		module.init(instance.configuration, function(error, dbInstance){
			if(error)
				logger.error('Simple Portal-server', 'There is some problem starting the local db, please make sure you configured things properly!!');
			
			instance.emit('db.init');
		});
	} else if(module == simpleportal.configuration){
		module.init(function(configuration){
			instance.initServer(configuration)
		});
	} else if(module == simpleportal.services){
		instance.on('db.init', function(){
			simpleportal.util.callModuleFunction(module, true, 'init', instance.configuration);
			instance.emit('services.ready');
		});
	} else{ 
		simpleportal.util.callModuleFunction(module, true, 'init', instance.configuration);	
	}
}

Server.prototype.request = function(urlhandler){
	var instance = this;
	
	instance.router.dispatch.addUrlHandler(urlhandler)
}

Server.prototype.get = function(path, callback){
	var instance = this;
	var handler =[];
	
	var expressionField;
	
	var spec_index = path.indexOf('/:');
	if(path.indexOf('/:') != -1){
		expressionField = path.substring(spec_index + 2);
		var endIndex = expressionField.indexOf('/');
		if(endIndex != -1){
			expressionField = expressionField.substring(0, endIndex);
		}
	}
	
	handler[path] = function(request, reponse, next, group){
		request['params'] = request['params']||{};

		//to make the old code work..
		request['path'] = request['path']||{};
		
		if(group) {
			request['params'][expressionField] = group;
			
			//to make the old code work..
			request['path'][expressionField] = group;
			request['pathGroup'] = group;
		}
		
		callback(request, reponse);
	}
	
	instance.router.dispatch.addUrlHandler(handler)
}

Server.CONNECT = 'connect';
Server.REST_SERVER = 'rest_server';
Server.WEB_SERVER = 'web_server';

//exports.Server = Server;