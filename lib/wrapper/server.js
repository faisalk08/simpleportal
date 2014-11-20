var http = require("http");
var events = require('events');
var mime=require('mime');
var simpleportal = require('simpleportal');
var logger = require('simpleportal').logger;
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
	
	instance.server.use(connect.compress({
		filter : function(req, res){
			return /html|text|css|javascript/.test(res.getHeader('Content-Type'));
		}
	}));
	
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
		
		instance.emit('start', {});

		server.listen(instance.configuration.port || 9665);
		
		logger.getInstance().info('Simple Portal -server', 'Server started, and listening on port - '+ instance.configuration.port);
	} catch(error){
		console.log(error);
		logger.getInstance().error('Simple Portal -server', error);
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
		
		instance.server.use(simpleportal.logger.getInstance().accessLog());
		//instance.server.use(instance.router.dispatch.restfulmongo());
		instance.emit('dispatch.pre', {});
	});

	instance.on('dispatch.pre', function(){
		instance.emit('dispatch.ready', {});	
	});
	
	instance.on('dispatch.post', function(){
		instance.server.use(new simpleportal.Restfulmongo(simpleportal.services.serviceUrl));	
	});
	
	instance.on('dispatch.ready', function(){
		instance.server.use(instance.router.dispatch.handlers());
		instance.emit('dispatch.post', {});
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
	
	http.ServerResponse.prototype.json = function(body, error){
		simpleportal.util.sendServiceResponse(this, error, body);
	}
	

	http.ServerResponse.prototype.redirect = function(url, status, req){
	  var app = this.app
	    , base = '/'
	    , status = status || 302
	    , head = 'HEAD' == req.method
	    , body;

	  // Setup redirect map
	  var map = {
	      back: req.header('Referrer', base)
	    , home: base
	  };

	  // Support custom redirect map
	  map.__proto__ = {};

	  // Attempt mapped redirect
	  var mapped = 'function' == typeof map[url]
	    ? map[url](req, this)
	    : map[url];

	  // Perform redirect
	  url = mapped || url;

	  // Relative
	  if (!~url.indexOf('://')) {
	    // Respect mount-point
	    if ('/' != base && 0 != url.indexOf(base)) url = base + url;

	    // Absolute
	    var host = req.headers.host
	      , tls = req.connection.encrypted;
	    url = 'http' + (tls ? 's' : '') + '://' + host + url;
	  }

	  // Support text/{plain,html} by default
	  if (req.accepts('html')) {
	    body = '<p>' + http.STATUS_CODES[status] + '. Redirecting to <a href="' + url + '">' + url + '</a></p>';
	    this.header('Content-Type', 'text/html');
	  } else {
	    body = http.STATUS_CODES[status] + '. Redirecting to ' + url;
	    this.header('Content-Type', 'text/plain');
	  }

	  // Respond
	  this.statusCode = status;
	  this.header('Location', url);
	  this.end(head ? null : body);
	};
	
	var req = http.IncomingMessage.prototype;
	
	req.flash = function(type, msg){
	  if (this.session === undefined) throw Error('req.flash() requires sessions');
	  var msgs = this.session.flash = this.session.flash || {};
	  if (type && msg) {
	    var i = 2
	      , args = arguments
	      , formatters = this.app.flashFormatters || {};
	    formatters.__proto__ = flashFormatters;
	    msg = utils.miniMarkdown(msg);
	    msg = msg.replace(/%([a-zA-Z])/g, function(_, format){
	      var formatter = formatters[format];
	      if (formatter) return formatter(utils.escape(args[i++]));
	    });
	    return (msgs[type] = msgs[type] || []).push(msg);
	  } else if (type) {
	    var arr = msgs[type];
	    delete msgs[type];
	    return arr || [];
	  } else {
	    this.session.flash = {};
	    return msgs;
	  }
	};
	

	req.header = function(name, defaultValue){
	  switch (name = name.toLowerCase()) {
	    case 'referer':
	    case 'referrer':
	      return this.headers.referrer
	        || this.headers.referer
	        || defaultValue;
	    default:
	      return this.headers[name] || defaultValue;
	  }
	};
	

	req.accepts = function(type){
	  var accept = this.header('Accept');

	  // normalize extensions ".json" -> "json"
	  if (type && '.' == type[0]) type = type.substr(1);

	  // when Accept does not exist, or contains '*/*' return true
	  if (!accept || ~accept.indexOf('*/*')) {
	    return true;
	  } else if (type) {
	    // allow "html" vs "text/html" etc
	    if (!~type.indexOf('/')) type = mime.lookup(type);

	    // check if we have a direct match
	    if (~accept.indexOf(type)) return true;

	    // check if we have type/*
	    type = type.split('/')[0] + '/*';
	    return !!~accept.indexOf(type);
	  } else {
	    return false;
	  }
	};
	

	http.ServerResponse.prototype.header = function(name, val){
	  if (1 == arguments.length) return this.getHeader(name);
	  this.setHeader(name, val);
	  return this;
	};

}

Server.prototype.createServer = function() {
	var instance = this;

	/**
	 * Creating server.
	 */
	instance.init();
}

Server.prototype.initServer = function(configuration){
	logger.getInstance().debug('Simple Portal-server', 'Initilizing the server started...');
	
	var instance = this;
	
	instance.configuration = configuration;

	instance.use(simpleportal.logger.getInstance());
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
				logger.getInstance().error('Simple Portal-server', 'There is some problem starting the local db, please make sure you configured things properly!!');
			instance.dbInstance = dbInstance;
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
			
			// calling modules onSatrtup function.
			if(instance.configuration.callservicestartup)
				simpleportal.util.callModuleFunction(module, true, 'startup', function(){});
		});
	} else{ 
		simpleportal.util.callModuleFunction(module, true, 'init', instance.configuration);	
	}
}

Server.prototype.request = function(urlhandler){
	var instance = this;
	
	instance.router.dispatch.addUrlHandler(urlhandler)
}

Server.prototype.post = function(path, callback){
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
	
	handler['POST ' + path] = function(request, reponse, next, group){
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
	
	instance.router.dispatch.addUrlHandler(handler);
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
	
	instance.router.dispatch.addUrlHandler(handler);
}

Server.CONNECT = 'connect';
Server.REST_SERVER = 'rest_server';
Server.WEB_SERVER = 'web_server';

//exports.Server = Server;