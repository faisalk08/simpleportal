var http = require("http");
var events = require('events');
var mime=require('mime');
var simpleportal = require('./../simpleportal');

var util = require("util");
var logger = simpleportal.logger;

var fs=require('fs');
var connect = require('connect');

//var services = simpleportal.serviceloader;
//var views = simpleportal.views;

/**
 * Simpleportal server, connectjs server wrapped with usefull functions from Simpleportal

	Example:

	var app = new simpleportal.Server();

	app.createServer();
	
 * 
 * @class Server
 * @module simpleportal
 * @submodule wrapper
 * 
 * @constructor
 * @param options The options object
 */
var Server = 
 module.exports = function Server(options) {
	var instance = this;
	options = options || {};
	instance.options = options;
	
	if(options && options.configure){
		instance.configure = options.configure;
	}

	instance.router = simpleportal.router;
	
	events.EventEmitter.call(instance);
}

util.inherits(Server, events.EventEmitter);

/**
 * Method to configure the connect Server, allows overriding default features of Simpleportal server
 * 
 * @method configureconnect
 */
Server.prototype.configureconnect = function() {
	var instance = this;
	
	var configuration = instance.configuration;
	
	simpleportal.util.callModuleFunction(simpleportal.viewloader, true, 'loadService', instance, function(){
		logger.getInstance().info('Simpleportal - Server:configureconnect' , 'Registered services needed for views');
	});
	
	logger.getInstance().info('Simpleportal - Server:configureconnect' , 'REGSISTERING APP REQUEST FILTER');
	
	if(simpleportal.filterloader.filters&&simpleportal.filterloader.filters.length != 0){
		instance.registerFilter(simpleportal.filterloader.filters, configuration, function(){
			logger.getInstance().info('Simpleportal - Server:configureconnect' , 'Finsshed regsitering filters');
		});
	}
	
	logger.getInstance().info('Simpleportal - Server:configureconnect' , 'REGSITERING WEBAPP STATIC FILES');
	
	var webapps =  simpleportal.pluginloader.getPlugins('webapp');
	webapps.forEach(function(webappsetting){
		instance.loadPluginURI(webappsetting);
	});
}

/**
 * Register the filter in to the server
 * @method registerFilter
 * 
 * @param filters Filter props array 
 * @param configuration Configuration array
 * @param callback the call back after registering
 */
Server.prototype.registerFilter = function(filters, configuration, callback) {
	var instance = this;
	if(filters&&filters.length != 0){
		for(var i = 0; i < filters.length;i++){
			var filterconfig = {homeuri:configuration.homeuri};
			
			if(configuration.webapps&&configuration.webappuris)
				filterconfig = {webapps:configuration.webapps, webappuris:configuration.webappuris};
			
			var filterprops = filters[i];
			var filtername = filterprops.name;
			
			if(configuration&&configuration.filter&&configuration.filter[filtername])
				filterconfig=simpleportal.util.extendJSON(filterconfig, configuration.filter[filtername]);
			
			if(filterconfig && filterconfig.disabled)
				logger.getInstance().info('Simpleportal - Server:registerFilter' , 'DISABLED  --- FILTER - ' + filtername);
			else{
				logger.getInstance().info('Simpleportal - Server:registerFilter' , 'FILTER - ' + filtername);
				
				if(configuration.uri)
					instance.server.use(configuration.uri, new require(filterprops.path)(filterconfig));
				else
					instance.server.use(new require(filterprops.path)(filterconfig));
			}
		}
		
		if(callback)
			callback();
	}else if(callback)
		callback();
}

/**
 * Method for configuring the Simple portal server
 * 
 * @method configure
 * @private
 */
Server.prototype.configure = function() {
	var instance = this;
	var configuration = instance.configuration;
	
	var staticResourceDir = simpleportal.util.getServerPath(configuration.resources.root + 'public/');
	
	instance.server.use(connect.compress({
		filter : function(req, res){
			return /html|text|css|javascript/.test(res.getHeader('Content-Type'));
		}
	}));
	
	if (fs.existsSync(staticResourceDir + '/favicon.ico'))
		instance.server.use(connect.favicon(staticResourceDir + '/favicon.ico'));
	else if(fs.existsSync(__dirname+'/../../resources/simpleportal/favicon.ico'))
		instance.server.use(connect.favicon(__dirname+'/../../resources/simpleportal/favicon.ico'));
	
	if (fs.existsSync(staticResourceDir))
		instance.server.use(connect.static(staticResourceDir));
	
	if(configuration.resources.publicdirs && typeof configuration.resources.publicdirs.length != 'undefined'){
		configuration.resources.publicdirs.forEach(function(resource){
			if(fs.existsSync(resource))
				instance.server.use(connect.static(resource));
		});
	}
	
	if(instance.configureconnect)
		instance.configureconnect();
	else{
		instance.server.use(connect.cookieParser('keyboard cat'));
		instance.server.use(connect.session({ secret:'keyboard cat', cookie: { maxAge: 60000/*, secure:true */}}));
	}
}

/**
 * To stop the Server
 * 
 * @method stopServer
 * @private 
 */
Server.prototype.stopServer = function() {
	var instance = this;
	
	instance.emit('shutdown');
}

/**
 * To shutdown the process , should be last method before the server is shuts down its services.
 * 
 * @method closeServer
 * @private 
 */
Server.prototype.closeServer = function() {
	var instance = this;
	
	process.exit();
}

/**
 * To start the Simpleportal server
 * 
 * @method startServer
 * @private
 */
Server.prototype.startServer = function() {
	var instance = this;
	try{
		var server = connect.createServer();
		instance.server = server;
		
		instance.configure();
		
		if(fs.existsSync(__dirname + '/../../resources'))
			instance.server.use(connect.static(__dirname + '/../../resources'));
		/*
		if(fs.existsSync(__dirname + '/../../doc'))
			instance.server.use('/simpleportal/apidoc', connect.static(__dirname + '/../../doc'));
		*/
		instance.emit('start', {});

		server.listen(instance.configuration.port || 9665);
		
		logger.getInstance().info('Simple Portal -server', 'Server started, and listening on port - '+ instance.configuration.port);
	} catch(error){
		console.log(error);
		logger.getInstance().error('Simple Portal -server', error);
	}
}

/**
 * Server initialization , it will be first method executed in the servers life cycle.
 * 
 * @method init
 * @private
 */
Server.prototype.init = function() {
	var instance = this;

	/*
	 * initializing the configuration init
	 */
	instance.use(simpleportal.configuration);
	
	/*
	 * listening to on start event where we will register the router events
	 */
	instance.on('start', function(){
		instance.router.register([simpleportal.serviceloader, simpleportal.viewloader, simpleportal.pluginloader, simpleportal.oauth, simpleportal.template], function(){
			logger.getInstance().debug('Main Server - on:start', 'Router registered successfully');
		});

		instance.server.use(simpleportal.Response());
		
		instance.server.use(simpleportal.logger.getInstance().accessLog());
		
		instance.emit('dispatch.pre', {});
		
		simpleportal.util.callModuleFunction(simpleportal.startuploader, true, 'start', instance, function(){
			logger.getInstance().debug('Main Server - on:start', 'Startups started succesfully');
			
			simpleportal.util.callModuleFunction(simpleportal.serviceloader, true, 'start', instance, function(){
				logger.getInstance().debug('Main Server - on:start', 'Startups inside service is loaded succesfully');
			});
		});
	});

	instance.on('dispatch.pre', function(){
		instance.emit('dispatch.ready', {});	
	});
	
	instance.on('dispatch.post', function(){
		instance.server.use(new simpleportal.Restfulmongo(simpleportal.serviceloader.serviceUrl));
	});
	
	instance.on('dispatch.ready', function(){
		instance.server.use(instance.router.getDispatchHandler());
		
		instance.emit('dispatch.post', {});
	});
	
	instance.on('services.ready', function(){
		instance.startServer();
	});

	instance.on('restart', function(){
		console.log('restart is called');
	});
		
	instance.on('shutdown', function(error){
		simpleportal.util.callModuleFunction(simpleportal.serviceloader, true, 'shutdown', instance.configuration, function(){
			if(instance.listeners('services.shutdown').length == 0)
				instance.emit('server.exit');
			else
				instance.emit('services.shutdown');
		});
	});
	
	instance.on('server.exit', function(error){
		process.exit();
	});
	
	process.on ('SIGTERM', function(){
		instance.stopServer();
	});
	
	process.on ('SIGINT', function(){
		instance.stopServer();
	});
	
	/**
	 * overriding the NODE js Response method!!!
	 * 
	 * @method send
	 * 
	 * @param {} status
	 * @param {} headers
	 * @param {} body
	 * @private
	 */
	http.ServerResponse.prototype.send = function (status, headers, body) {
		if(headers && !(headers['content-type'] || headers['Content-Type'])){
			headers['Content-Type'] = 'text/html; charset=UTF-8';
		}
		
		this.writeHead(status, headers);
		this.write(body || '');
	    this.end();
	};
	
	/**
	 * Setting the content type of the response using a function
	 * 
	 * @method contentType
	 * @param {string} value
	 * 
	 * @return contentType
	 * @private
	 */
	http.ServerResponse.prototype.contentType = function(value){
		if(value)
			this.content_type = value;
		
		return this.content_type;
	}
	
	/**
	 * Sending the response as json 
	 * 
	 * @method json
	 * 
	 * @param {} body
	 * @param {} error
	 * @return
	 * @private 
	 */
	http.ServerResponse.prototype.json = function(body, error){
		simpleportal.util.sendServiceResponse(this, error, body);
	}
	

	/**
	 * Redirecting user request based on the status and the current request header 
	 * 
	 * @method redirect
	 * @param {} url
	 * @param {} status
	 * @param {} req
	 * @private 
	 */
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
	
	/**
	 * Description
	 * @method flash
	 * @param {} type
	 * @param {} msg
	 * @return
	 * @private
	 */
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
	

	/**
	 * Method for setting the response header
	 * @method header
	 * @param {} name
	 * @param {} defaultValue
	 * @return
	 * @private 
	 */
	req.get =req.header = function(name, defaultValue){
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
	

	/**
	 * Method for reading the accept header from user request
	 * @method accepts
	 * @param {} type
	 * @return
	 * @private 
	 */
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
	

	/**
	 * MEthod for reading the user header from the request
	 * @method header
	 * @param {} name
	 * @param {} val
	 * @return ThisExpression
	 * @private
	 */
	http.ServerResponse.prototype.header = function(name, val){
	  if (1 == arguments.length) return this.getHeader(name);
	  this.setHeader(name, val);
	  return this;
	};

}

/**
 * Method for creating / starting the Simpleportal server
 * 
 * @method createServer
 * @param {object} options options while creating the server 
 */
Server.prototype.createServer = function(options) {
	var instance = this;

	//Autocreate folders
	if(!options || (options&&!options.disableautocreate)){
		simpleportal.util.checkDirSync(simpleportal.util.getServerPath('api'));
		simpleportal.util.checkDirSync(simpleportal.util.getServerPath('view'));
		simpleportal.util.checkDirSync(simpleportal.util.getServerPath('filter'));
		
		simpleportal.util.checkDirSync(simpleportal.util.getServerPath('resources/public'));
		simpleportal.util.checkDirSync(simpleportal.util.getServerPath('resources/plugin'));
	}	
		
	instance.init();
}

/**
 * Method used to initialize the server
 * 
 * @method initServer
 * 
 * @param {} configuration The server configuration
 * @private
 *  
 */
Server.prototype.initServer = function(configuration){
	logger.getInstance().debug('Simple Portal-server', 'Initilizing the server started...');
	
	var instance = this;
	
	instance.configuration = configuration;

	instance.use(simpleportal.logger.getInstance());
	instance.use(simpleportal.oauth);
	instance.use(simpleportal.template);
	
	instance.use(simpleportal.db);
	
	instance.use(simpleportal.serviceloader);
}

/**
 * Overriden method for registering the various middlewares for the server.
 * 
 * @method use
 * 
 * @param {} module The module you want to use for the server.
 */
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
			instance.initServer(configuration);
		});
	} else if(module == simpleportal.serviceloader){
		instance.on('db.init', function(error){
			simpleportal.serviceloader.updateConfiguration(instance.configuration);
			simpleportal.pluginloader.updateConfiguration(instance.configuration);
			simpleportal.viewloader.updateConfiguration(instance.configuration);
			
			instance.loadServices(function(error, data){
				simpleportal.util.callModuleFunction(simpleportal.serviceloader, true, 'init', instance.configuration, function(){
					logger.getInstance().info('Simple Portal -server : use', 'calling service startup');
					
					// calling modules onSatrtup function.
					if(instance.configuration.callservicestartup)
						simpleportal.util.callModuleFunction(simpleportal.serviceloader, true, 'startup', instance.configuration, function(){
							instance.emit('services.ready');
						});
					else
						instance.emit('services.ready');
				});
			}, false);
		});
	} else{ 
		simpleportal.util.callModuleFunction(module, true, 'init', instance.configuration, function(){});	
	}
}

/**
 * Method for openning the uris mentione din the plugins
 * 
 * @method loadPluginURI
 * 
 * @param {} pluginsetting Plugin settings 
 * @param {callback} callback The callback to excecute when complete
 * @private 
 */
Server.prototype.loadPluginURI = function(pluginsetting, callback){
	var instance = this;
	logger.getInstance().info('Simple Portal - server : loadPluginURI', 'loading services');
	
	if(pluginsetting.plugintype=='webapp'){
		var webappuri = pluginsetting.webappuri||pluginsetting.id;
		
		if(pluginsetting.installeddir && pluginsetting.installed && fs.existsSync(pluginsetting.installeddir + '/html5')){
			logger.getInstance().info('Simple Portal - server : loadPluginURI' , 'WEBAPP -' + webappuri  + ' -- ' + pluginsetting.installeddir);
			
			if(fs.existsSync(pluginsetting.installeddir + '/filter')){
				simpleportal.filterloader.loadFilters({configuration:pluginsetting, filterdir:pluginsetting.installeddir + '/filter'}, function(error, filters){
					console.log('Loading filters for plugin - '+ pluginsetting.id);
					console.log(filters);
					
					instance.registerFilter(filters, {uri:webappuri, configuration:pluginsetting}, function(){
						logger.getInstance().info('Simple Portal - server : loadPluginURI' , 'Finished regsitering filters');
						
						instance.server.use(webappuri, connect.static(pluginsetting.installeddir + '/html5'));
					});
				});	
			}else{
				instance.server.use(webappuri, connect.static(pluginsetting.installeddir + '/html5'));	
			}
		}	
	}
	
	if(callback)
		callback();
}

/**
 * Description
 * @method loadServices
 * @param {callback} callback The callback to excecute when complete
 * @param {} restart
 * @private 
 */
Server.prototype.loadServices = function(callback, restart){
	var instance = this;
	logger.getInstance().info('Simple Portal -server : loadServices', 'loading services');
	
	simpleportal.serviceloader.loadServices(instance.configuration, function(){
		if(!restart)
			instance.loadPlugins(callback, restart);
		else if(callback)
			callback();
	});
}

/**
 * Description
 * @method loadPlugins
 * @param {callback} callback The callback to excecute when complete
 * @param {} restart
 * @private 
 */
Server.prototype.loadPlugins = function(callback, restart){
	var instance = this;
	logger.getInstance().info('Simple Portal -server : loadPlugins', 'loading plugins');
	
	simpleportal.pluginloader.loadPluginFromDirectory('resources/public', instance.configuration, function(perror, pdata){
		simpleportal.pluginloader.loadPlugins(instance.configuration, function(error){
			logger.getInstance().info('Simple Portal -server : loadPlugins', 'loading plugins finished now searching inside public directory');
			
			if(!restart)
				instance.loadViews(callback, restart);
			else if(callback)
				callback();
		});
	});
}

/**
 * Description
 * @method loadViews
 * @param {callback} callback The callback to excecute when complete
 * @param {} restart
 * @private 
 */
Server.prototype.loadViews = function(callback, restart){
	var instance = this;
	logger.getInstance().info('Simple Portal -server : loadViews', 'loading views');
	
	simpleportal.viewloader.loadViews(instance.configuration, function(){
		if(!restart)
			instance.loadStartups(callback, restart);
		else if(callback)
			callback();
	});
}

/**
 * Description
 * @method loadStartups
 * @param {callback} callback The callback to excecute when complete
 * @param {} restart
 * @private 
 */
Server.prototype.loadStartups = function(callback, restart){
	var instance = this;
	logger.getInstance().info('Simple Portal -server : loadStartups', 'loading startups');
	
	simpleportal.startuploader.loadStartups(instance.configuration, function(){
		if(!restart)
			instance.loadFilters(callback, restart);
		else if(callback)
			callback();
	});
}

/**
 * Description
 * @method loadFilters
 * @param {callback} callback The callback to excecute when complete
 * @param {} restart
 * @private 
 */
Server.prototype.loadFilters = function(callback, restart){
	var instance = this;
	logger.getInstance().info('Simple Portal -server : loadFilters', 'loading views');
	
	simpleportal.filterloader.loadFilters(instance.configuration, function(){
		if(callback)
			callback();
	});
}

/**
 * Description
 * @method request
 * @param {} urlhandler
 * @private 
 */
Server.prototype.request = function(urlhandler){
	var instance = this;
	
	instance.router.dispatch.addUrlHandler(urlhandler)
}

/**
 * Method for adding new POST apis
 * 
 * @method post
 * @param {string} path URI for the api
 * @param {callback} callback The callback to excecute when complete
 */
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

/**
 * MEthod for adding new GET apis
 * 
 * @method get
 * @param {string} path URI for the api
 * @param {callback} callback The callback to excecute when complete
 */
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

/**
 * @property CONNECT
 * @type string 
 * @static
 */
Server.CONNECT = 'connect';

/**
 * @property REST_SERVER
 * @type string  
 * @static
 */
Server.REST_SERVER = 'rest_server';

/**
 * @property WEB_SERVER
 * @type string  
 * @static
 * 
 */
Server.WEB_SERVER = 'web_server';