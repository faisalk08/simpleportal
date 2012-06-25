/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var http = require("http");
var url = require("url");

var util = require("./util");

var oauth = require("./oauth");
var template = require("./template");
var configuration = require("./configuration");
var router = require("./router");
var db = require("./db");
var services = require("./services");
var views = require("./views");
var router = require("./router");

var connect = require('connect');

var logger = require('./logger').getInstance();

function start(){
	configuration.init(function(configuration){
		console.log('Initilizing the server started...');
	
		util.callModuleFunction(logger, true, 'init', configuration);
		util.callModuleFunction(oauth, true, 'init', configuration);
		util.callModuleFunction(template, true, 'init', configuration);
		
		db.init(configuration, function(error, instance){
			if(error)
				console.log('There was some problem starting the local db, please make sure you configured things properly!!');
			else {
				console.log('Initialization of db works well now!!!');
			}
			util.callModuleFunction(services, true, 'init', configuration);
	
			router.register([services, views, oauth, template]);
	
			startServer(router, configuration);
		});
	});
}

function startServer(router, configuration) {
	try{
		var staticResourceDir = configuration.resources.root + 'public/';
		
		var server = require('connect').createServer(
			connect.favicon(staticResourceDir + '/favicon.ico'),
			connect.cookieParser('keyboard cat'),
			connect.session({ secret:'keyboard cat', cookie: { maxAge: 60000 }}),
			connect.static(staticResourceDir),
			logger.accessLog(),
			router.dispatch.handlers()
		);
	
		server.listen(configuration.port || 9665);
		
		logger.info('Server', 'Server started, and listeninbg on port - '+ configuration.port);
	} catch(error){
		console.log(error);
	}
}

exports.start = start;

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