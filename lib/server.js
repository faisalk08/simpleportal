/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var http = require("http");
var url = require("url");

var util = require("./util");
var events = require('events');

var oauth = require("./oauth");
var template = require("./template");
var configuration = require("./configuration");
var router = require("./router");
var db = require("./db");
var services = require("./services");
var views = require("./views");
var router = require("./router");

var logger = require('./logger').getInstance();

/*
 * overriding the NODE js Response method!!!
 */
http.ServerResponse.prototype.send = function (status, headers, body) {
	if(headers && !headers['content-type']){
		headers['Content-Type'] = 'text/html; charset=UTF-8';
	}
	this.writeHead(status, headers);
	this.write(body || '');
    this.end();
};

function Server(options) {
	var instance = this;
	options = options || {};
	if(options && options.configure){
		instance.configure=options.configure;
	}
		
	events.EventEmitter.call(instance);
}

require("util").inherits(Server, events.EventEmitter);

Server.prototype.configure = function(router, configuration) {
	var instance = this;
	var staticResourceDir = configuration.resources.root + 'public/';
	var connect = require('connect');
	
	instance.server.use(connect.favicon(staticResourceDir + '/favicon.ico'));
	instance.server.use(connect.cookieParser('keyboard cat'));
	instance.server.use(connect.session({ secret:'keyboard cat', cookie: { maxAge: 60000 }}));
	instance.server.use(connect.static(staticResourceDir));
	
	if(configuration.resources.publicdirs && typeof configuration.resources.publicdirs.length != 'undefined'){
		configuration.resources.publicdirs.forEach(function(resource){
			instance.server.use(connect.static(resource));
		});
	}
	
	instance.server.use(logger.accessLog());
	instance.server.use(router.dispatch.handlers());
}

Server.prototype.startServer = function(router, configuration) {
	var instance = this;
	try{
		var server = require('connect').createServer();
		instance.server = server;
		
		instance.configure(router, configuration);
		/*
		var staticResourceDir = configuration.resources.root + 'public/';
		
		var server = require('connect').createServer();
		
		server.use(connect.favicon(staticResourceDir + '/favicon.ico'));
		server.use(connect.cookieParser('keyboard cat'));
		server.use(connect.session({ secret:'keyboard cat', cookie: { maxAge: 60000 }}));
		server.use(connect.static(staticResourceDir));
		
		if(configuration.resources.publicdirs && typeof configuration.resources.publicdirs.length != 'undefined'){
			configuration.resources.publicdirs.forEach(function(resource){
				server.use(connect.static(resource));
			});
		}
		
		server.use(logger.accessLog());
		server.use(router.dispatch.handlers());*/
	
		server.listen(configuration.port || 9665);
		
		logger.info('Simple Portal -server', 'Server started, and listening on port - '+ configuration.port);

		instance.emit('start', {});
	} catch(error){
		console.log(error);
		logger.error('Simple Portal -server', error);
	}
}

Server.prototype.init = function() {
	var instance = this;

	configuration.init(function(configuration){
		instance.initServer(configuration)}
	);
}

Server.prototype.createServer = function() {
	var instance = this;

	instance.init();
}

Server.prototype.preStartServer = function(error, dbInstance) {
	var instance = this;
	var configuration = instance.configuration;

	if(error)
		logger.error('Simple Portal-server', 'There is some problem starting the local db, please make sure you configured things properly!!');
	util.callModuleFunction(services, true, 'init', configuration);

	router.register([services, views, oauth, template]);
	instance.startServer(router, configuration);
}

Server.prototype.initServer = function(configuration){
	var instance = this;
	instance.configuration = configuration;
	logger.debug('Simple Portal-server', 'Initilizing the server started...');

	util.callModuleFunction(logger, true, 'init', configuration);
	util.callModuleFunction(oauth, true, 'init', configuration);
	util.callModuleFunction(template, true, 'init', configuration);
	
	db.init(configuration, function(error, dbInstance){
		instance.preStartServer(error, dbInstance)
	});
}

exports.Server = Server;