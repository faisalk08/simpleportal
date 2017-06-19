"use strict";

var http = require("http"),
	events = require('events'),
	fs=require('fs'),
	util = require("util"),
	path = require("path"),
	connect = require('connect'),
	simpleportal = require('./../simpleportal'),
	ResponseService = require('./../service/response'),
	Resourceinstaller = require('./../util/resourceinstaller'),
	Template=require("./../util/template"),
	Configuration = require("./configuration"),
	Restfulmongo = require("./../router/restfulmongo"),
	Routerclass = require("./../router/router"),
	Serviceloader=require('./../router/serviceloader'),
	ViewLoader = require('./../router/viewloader'),
	StartupLoader = require('./../router/startuploader'),
	PluginLoader = require('./../router/pluginloader'),
	FilterLoader = require('./../router/filterloader'),
	OauthLoader = require('./../router/oauthloader'),
	Notificationcenter= require("./../util/notificationcenter"),
	Logger = require("./../util/logger").Logger,
	DBPool = require('./dbpool'),
	moment = require("moment");

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

	events.EventEmitter.call(instance);
	
	instance.options = simpleportal.util.extendJSON({}, Server.DEFAULTS, options);
	
	if(options && options.configure){
		instance.configure = options.configure;
	}
	
	if(process.argv 
			&& process.argv.length > 2 
			&& process.argv[2].indexOf('-mode=configuration') != -1)
		instance.options['mode-configuration']=true;
		
	instance.serverstatus='init';
	
	instance._configuration = {};
	instance._routers = [];
	
	return instance;
}
util.inherits(Server, events.EventEmitter);

/**
 * Method for creating / starting the Simpleportal server
 * 
 * @method createServer
 * @param {object} options options while creating the server 
 */
Server.prototype.createServer = function(options) {
	var instance = this;
	
	//Auto create folders
	if(!options || (options&&!options.disableautocreate)){
		simpleportal.util.checkDirSync(simpleportal.util.getServerPath('api'));
		simpleportal.util.checkDirSync(simpleportal.util.getServerPath('view'));
		simpleportal.util.checkDirSync(simpleportal.util.getServerPath('filter'));
		
		simpleportal.util.checkDirSync(simpleportal.util.getServerPath('resources'));
		
		simpleportal.util.checkDirSync(simpleportal.util.getServerPath('resources/public'));
		simpleportal.util.checkDirSync(simpleportal.util.getServerPath('resources/plugin'));
	}
	
	if(options&&options.install)
		instance.options['resources-install']=true;
	
	instance.init();
}

/**
 * Server initialization , it will be first method executed in the servers life cycle.
 * 
 * @method init
 * @private
 */
Server.prototype.init = function() {
	var instance = this;

	if(instance.options['resources-install']) {
		instance.on('configuration.ready', function(){
			instance.getLogger().info('Server:init@event[configuration.ready]', 'configuration.ready');
			
			if(instance.getConfiguration('resources').dependencies){
				var downloads = instance.getConfiguration('resources').dependencies;
				
				var cbdownloads = 0;
				
				if(downloads && downloads.length > 0){
					for(var index in downloads){
						var webresource = downloads[index];
						
						if(!webresource.disabled){
							webresource.resourcefolder = simpleportal.util.getServerPath(webresource.resourcefolder);
							webresource.resourcebundle = webresource.resourcename + '.tar.gz';
							
							var sr  = new Resourceinstaller(webresource);
							
							sr.install(function(error){
								if(error)
									instance.getLogger().error("server:init", error);
								
								if(cbdownloads++ == downloads.length-1)
									instance.emit('db.init');
							});
						}else if(cbdownloads++ == downloads.length-1)
							instance.emit('db.init');
					}
				} else
					instance.emit('db.init'); //mandatory to call this as configuration.ready is bypassing the init function
			} else
				instance.emit('db.init'); //mandatory to call this as configuration.ready is bypassing the init function
		});
	}
	
	instance.on('db.error', function(error){
		instance._dbError = error;
		
		instance.startServer();
	});
	
	instance.on('server.init', function(){
		instance.initServer();
	});
	
	/*
	 * listening to on start event where we will register the router events
	 */
	instance.on('start', function(){
		//@TODO find a dynamic calling based on the instance of check if it is Router sub class add in to the router
		instance.getLogger().info('Main Server - on:start', 'calling module function start');
		
		instance.viewloader.on("router.start", function(){
			instance.getLogger().debug("Server.event@[router.start]", "router.start is invoked.");
			
			instance.server.use(ResponseService());
			
			instance.server.use(instance.getLogger().accessLog());

			var resourcetempdir = instance.getTempDirectory();//instance.getConfiguration("resources").tempdir || "data/._tmp";
			
			// auto generated template 
			instance.server.use("/view/system", connect["static"](simpleportal.util.getServerPath(resourcetempdir + "/system")));
			
			var routers_ = simpleportal.util.clone(instance._routers);
			
			initRouter(instance, routers_, function(){
				instance.getLogger().debug('Server.@start', 'finished calling all services init function.');
				
				// router ready and router called
				instance.serviceloader.startAll(function(){
					instance.getLogger().debug('Server.@startAll', 'finished calling all services start function.');
					
					connect["static"]("/view", simpleportal.util.getServerPath(resourcetempdir +  "/templates"));

					instance.emit('dispatch.pre', {});
				});
			});
		});
		
		instance.startuploader.on("router.start",  function(){
			instance.getLogger().info("Server", "startuploader>>> -- router .start is called");
			
			instance.viewloader.startAll();
		});
		
		instance.startuploader.startAll();
	});

	instance.on('dispatch.pre', function(){
		if(instance.listeners('dispatch.ready').length == 0)
			instance.emit('dispatch.ready', {});
		else
			instance.emit('dispatch.ready', {});	
	});
	
	instance.on('dispatch.post', function(){
		//@TODO security check is skipped during this process
//		instance.server.use(new Restfulmongo(instance.serviceloader.serviceUrl));
		
		instance.server.use('/keep-alive', function(request, response){
			response.end();
		});
		
//		if(fs.existsSync(__dirname + '/../../resources/templates/layout/timed-out.html.ejs'))
//			instance.server.use("/timed-out", function(request, response, next){
//				simpleportal.template.render(__dirname + '/../../resources/templates/layout/timed-out.html.ejs', instance.getConfiguration(), function(error, html){
//					if(error && next)
//						next();
//					else
//						response.send(200, {}, html);
//				});
//			});
		
		// Simple portal resource at the end
		var staticResourceDir = simpleportal.util.getServerPath(instance.getConfiguration('resources').root + 'public/');
		
//		if(instance.options['resources-simpleportal'] && fs.existsSync(staticResourceDir + 'simpleportal'))
//			instance.server.use('/simpleportal', connect.static(staticResourceDir + 'simpleportal'));
		
//		if(instance.options['resources-simpleportal'] && fs.existsSync(__dirname + '/../../resources'))
//			instance.server.use('/simpleportal', connect.static(__dirname + '/../../resources'));
		
		// ui plugin use common path from simpleportal
		if(instance.pluginloader.uiplugindir)
			instance.server.use('/uiplugin', connect["static"](instance.pluginloader.uiplugindir));
		
		if(instance.pluginloader.systemuiplugindir)
			instance.server.use('/uiplugin', connect["static"](instance.pluginloader.systemuiplugindir));
		
//		if(instance.configuration.homeuri && instance.configuration.homeuri != '/'){
//			if(fs.existsSync(staticResourceDir + 'home')){
//				instance.server.use(instance.configuration.homeuri, connect.static(staticResourceDir + 'home'));
//			}
//		}
		
//		instance.server.use('/home', connect.static(__dirname + '/../../resources/home'));
//		instance.server.use('/cdn', connect.static(__dirname + '/../../resources/cdn'));
//		instance.server.use('/cdn', instance.getconnect.static(__dirname + '/../../resources/cdn'));
		
		if(instance.getConfiguration('loginuri') != "/login")
			instance.server.use("/login", function(request, response){
				response.header('Cache-Control', 'no-cache');
				
				response.redirect(instance.getConfiguration('loginuri'), 302, request);
			});
	
		if(instance.getConfiguration('dashboarduri') != "/dashboard")
			instance.server.use("/dashboard", function(request, response){
				response.header('Cache-Control', 'no-cache');
				
				response.redirect(instance.getConfiguration('dashboarduri'), 302, request);
			});
		
		var commonurimapping = [
			{url:'/theme', path:'/theme'},
			{url:'/session-locked', path:'/session-locked'},
			{url:'/terms-of-service', path:'/terms-of-service'}
		];
		registerPublicPageMapping(instance, commonurimapping);
		
//		instance.server.use('/theme', function(request, response, next){
//			sendTemplatePage(instance, instance.getServerCorePath("resources/public/theme"), "/theme", request, response, next);
//		});
//		
//		instance.server.use('/session-locked', function(request, response, next){
//			sendTemplatePage(instance, instance.getServerCorePath("resources/public/session-locked"), "/session-locked", request, response, next);
//		});
//		
//		instance.server.use('/terms-of-service', function(request, response, next){
//			sendTemplatePage(instance, instance.getServerCorePath("resources/public/terms-of-service"), "/terms-of-service", request, response, next);
//		});
		
//		instance.server.use('/signin', function(request, response, next){
//			sendTemplatePage(__dirname + "/../../server/resources/public/signin", "/signin", request, response, next);
//		});

		var serverpublicpagedir = simpleportal.util.getServerPath("resources/templates/public/pages");
//		var pagedirs = [];
		 
		if(fs.existsSync(serverpublicpagedir)){
			instance.server.use('/pages/', function(request, response, next){
				setDynamicPage(instance, request.url, serverpublicpagedir, request, response, next);
			});
		}
		
		instance.server.use('/pages/', function(request, response, next){
//			var templatedir = instance.getServerCorePath("resources/templates/public/pages");
			if(request.publicpagelayout)
				next();
			else
				setDynamicPage(instance, request.url, instance.getServerCorePath("resources/templates/public/pages"), request, response, next);
		});
		
		instance.server.use('/pages/', function(request, response, next){
			sendDynamicPage(instance, request.url, request, response, next);
		});
		
		updateServerWebpages(instance);
		
		// App router bottom stack!
		if(instance.getConfiguration('homeuri') && instance.getConfiguration('homeuri') != '/'){
//			if(fs.existsSync(staticResourceDir + 'home')){
//				instance.server.use(instance.configuration.homeuri, connect.static(staticResourceDir + 'home'));
//			}
//			
			instance.getLogger().info("Server", "Home uri is ::: " + instance.getConfiguration('homeuri'));
			instance.server.use("/", function(request, response, next){
//				instance.getLogger().info("Server", "Home uri is ::: " + instance.getConfiguration('homeuri') + ">> "+ request.url);
				
				if((request.url == '/home/' && !instance.getConfiguration('homeuri') != '/home') || request.url == '/')
					response.redirect(instance.getConfiguration('homeuri'), 301, request);
				else if(next)
					next();
			});
		}
		
//		instance.server.use(connect.static(__dirname + '/../../server/resources/templates/webapp'));
	});
	
	instance.on('dispatch.ready', function(){
		instance.server.use(instance.router.getDispatchHandler());
		
		instance.emit('dispatch.post', {});
	});
	
	instance.on('services.ready', function(){
		instance.startServer();
	});

	instance.on('restart', function(){
		instance.getLogger().info("Server", 'Restart is called');
	});
		
	instance.on('shutdown', function(error) {
		instance.getLogger().info("Server", 'Server shutdown is called.');
		
		instance.serviceloader.shutdownAll(function(error){
			if(error)
				instance.getLogger().error("Server", error);
			else{
				if(instance.listeners('services.shutdown').length == 0)
					instance.emit('server.exit');
				else
					instance.emit('services.shutdown');
			}
		})
//		simpleportal.util.callModuleFunction(simpleportal.serviceloader, true, 'shutdown', instance.getConfiguration(), function(){
//			if(instance.listeners('services.shutdown').length == 0)
//				instance.emit('server.exit');
//			else
//				instance.emit('services.shutdown');
//		});
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
	
	process.on('uncaughtException', function (exception, e) {
	   // handle or ignore error
		console.error("Unknown exception " + exception+'');
		console.trace(exception);
	});

	/*
	 * initializing the configuration init
	 */
//	instance.use(simpleportal.configuration);
	
	/**
	 * get the ip address 
	 */
//	var ipaddress;
//	require('dns').lookup(require('os').hostname(), function (err, ipaddr, fam) {
//		if(!err&&ipaddr)instance.setConfiguration("hostip", ipaddr);
//	});
	
	var os = require('os');
	var interfaces = os.networkInterfaces();
	var ipset = false;
	for (var k in interfaces) {
	    for (var k2 in interfaces[k]) {
	        var address = interfaces[k][k2];
	        if (!ipset && address.family === 'IPv4' && !address.internal) {
	            instance.setConfiguration("hostip", address.address);
	            ipset= true;
	        }
	    }
	}
	
	var configuration = new Configuration({
		defaultfile:instance.getServerCorePath("configuration.json")
	});
	
	configuration.read(function(error, configjson){
		if(!configuration.extfile)
			instance.enable('mode-configuration');
		
		instance.setConfiguration(configuration.getConfiguration());
		instance.setConfiguration("simpleportal_version", simpleportal.version);
		
		var loggerconfig = simpleportal.util.extendJSON({}, instance.getConfiguration("logger")),
			resourceconfig = instance.getConfiguration("resources");
		
		if(!loggerconfig.root || !(loggerconfig.root.indexOf(".") == 0 || loggerconfig.root.indexOf("/") == 0) )	
			loggerconfig.root = simpleportal.util.appendFilePath(resourceconfig.datadir, loggerconfig.root||"log");
		
		instance.logger = new Logger(loggerconfig);
		
		instance.emit('server.init');
	});
}

/**
 * To update the router
 */
function initRouter(instance, routers_, callback){
	instance.getRouter(routers_.splice(0, 1)).initRouter(instance.router, function(error, data){
		if(!routers_ || routers_.length == 0){
			callback();
		}else
			initRouter(instance, routers_, callback);
	});	
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
	
	if(instance.serverstatus != 'running')
		try{
			var server = connect.createServer();
			
			instance.server = server;
			
			instance.configure();
				
			instance.emit('start', {});
			
			server.listen(instance.getConfiguration('port', 9665));
			
			instance.getLogger().info("Server", "Server listening on port -- " + instance.getConfiguration('port', 9665));
			
			instance.serverstatus = 'running';
			
			instance.emit("server.ready");
		} catch(error){
			instance.getLogger().error('server:startServer', error);
		}
	else
		instance.getLogger().info("Server", "Server is already running- " + instance.serverstatus);
}

/**
 * Method for configuring the Simple portal server
 * 
 * @method configure
 * @private
 */
Server.prototype.configure = function() {
	var instance = this,
		staticResourceDir = simpleportal.util.getServerPath(instance.getConfiguration('resources').root + 'public/');
	
	instance.server.use(connect.compress({
		filter : function(req, res){
			return /html|image|text|css|javascript/.test(res.header('Content-Type'));
		}
	}));
	
	// let us check if configuration has favicon
	var faviconconfig = instance.getConfiguration('favicon');
	if(faviconconfig && faviconconfig.length > 0  && faviconconfig[0].content){
		var favicondata = instance.getConfiguration('favicon')[0],
			faviconbuffer = new Buffer(favicondata.content, 'base64');
		
		instance.server.use(connect.favicon(faviconbuffer));
	} else if (fs.existsSync(staticResourceDir + '/favicon.ico'))
		instance.server.use(connect.favicon(staticResourceDir + '/favicon.ico'));
	else if(fs.existsSync(instance.getServerCorePath("resources/favicon.ico")))
		instance.server.use(connect.favicon(instance.getServerCorePath("resources/favicon.ico")));
	
	// let us check if configuration has favicon
	var logoconfig = instance.getConfiguration('logo');
	if(logoconfig && logoconfig.length > 0  && logoconfig[0].content){
		var logodata = logoconfig[0],
			logobuffer = new Buffer(logodata.content, 'base64');
		
		instance.server.use("/logo", function(req, res){
			res.end(logobuffer);
		});
	}
//	instance.server.use('/icons', connect.static(__dirname + '/../../resources/templates/plugin/webapp/icons'));
//	if(instance.configureconnect) {
//		instance.configureconnect();
//	}else{
//		instance.server.use(connect.cookieParser('keyboard cat'));
//		
//		if(instance.getConfiguration('secure'))
//			instance.server.use(connect.session({ secret:'keyboard cat', cookie: { maxAge: 60000, secure:true }}));
//		else
//			instance.server.use(connect.session({ secret:'keyboard cat', cookie: { maxAge: 60000}}));
//	}

	if (fs.existsSync(staticResourceDir))
		instance.server.use(connect["static"](staticResourceDir));
	
	if(instance.getConfiguration('resources').publicdirs && typeof instance.getConfiguration('resources').publicdirs.length != 'undefined'){
		instance.getConfiguration('resources').publicdirs.forEach(function(resource){
			if(fs.existsSync(resource))
				instance.server.use(connect["static"](resource));
		});
	}
	
	if(instance._dbError)
		instance.server.use((function(){
			return function(request, response, next){
				sendException(instance, response, {exception:instance._dbError}); 
			}
		})());
}

var sendException = function(instance, response, viewoptions){
	if(!viewoptions)
		return;
	
	viewoptions.exceptionfile = simpleportal.rootdir + '/resources/templates/exception.html.ejs';

	viewoptions.data = {serverconfig : instance.getConfiguration()};
		
	var templateProcess = new Template(viewoptions);
	
	templateProcess.render(response);
}

/**
 * Method to configure the connect Server, allows overriding default features of Simpleportal server
 * 
 * @method configureconnect
 */
Server.prototype.configureconnect = function() {
	var instance = this;
	instance.getLogger().info("Server:configureconnect", "configuring the connect ");
	
	if(instance.options['mode-configuration']){
		instance.getLogger().info('Simpleportal - Server:configureconnect' , 'SKIPPING Default Sever functions');
	}
}

/**
 * To ge the Server url based on the configiuration from the Server
 * @method getServerUrl
 * 
 */
Server.prototype.getServerUrl = function(path, actual) {
	var instance = this;
	
	var options = simpleportal.util.copyJSON({}, ['host', 'port', 'secure'], instance.getConfiguration());
	
	if(options.host == "localhost" && actual)
		options.host = instance.getConfiguration("hostip", options.host);
	
	if(instance.getConfiguration("hidePort"))
		options.port = instance.getConfiguration("secure") ? 443 : 80; 
	
	if(path)
		options.path = path;
	
	return simpleportal.util.constructUrl(options);
};

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
	var instance = this;
	instance.getLogger().debug('Server:initServer', 'Initilizing the server.');
	
	if(instance.getConfiguration("notificationcenter")){
		instance.notificationcenter = new Notificationcenter(
			{
				osnotification:instance.getConfiguration("osnotification"),
				title:instance.getConfiguration("title")
			}
		);
	}
	
	if(instance.getConfiguration("db")) {
		var dbTouse =  instance.getConfiguration("db").use;
		
		var dbConfiguration  = instance.getConfiguration("db")[dbTouse];
		
		instance.dbpool = new DBPool();
		
		instance.dbpool.registerDB('default', dbConfiguration);
		instance.dbpool.getInstance('default', function(error, dbInstance){
			if(error){
				instance.getLogger().error('Server:initServer', 'DB configuration is not done properly!!!');
				// server db has issue
				instance.emit('db.error', error);
			}else{
				instance._dbInstance = dbInstance;
				
				if(instance.listeners('configuration.ready').length > 0)
					instance.emit('configuration.ready');
				else
					instance.emit('db.init');	
			}
		});
	} else {
		logger.getInstance().info('Simple Portal -db', 'DB configuration is not done properly!!!');
		callback('DB configuration is not done properly!!!')
	}
	
	instance.router = simpleportal.router;//@TODO replace with simpleportal
	
	instance.use(new StartupLoader({}, instance));
	instance.use(new OauthLoader({}, instance));
	instance.use(new FilterLoader({}, instance));
	instance.use(new Serviceloader({}, instance));
	instance.use(new ViewLoader({}, instance));
	instance.use(new PluginLoader(instance.options, instance));
	
	if(instance.getConfiguration('openurl'))
		instance.on('start', function(){
			var spawn = require('child_process').spawn;
			
			var serverurl = instance.getServerUrl();
			
			if(serverurl)
				spawn('open', [serverurl]);
		});
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
	if(module && module.routerid && instance[module.routerid]){
		instance.getLogger().warn("Server.use", module.routerid + " already registered.");
		return;
	}
	
	if(module && module.routerid){
		// Router module is being added
		instance.getLogger().debug("Server.use", module.routerid + " in to the router list.");
		
		instance._routers.push(module.routerid);
		instance[module.routerid] = module;
	}
	
	if(module instanceof Routerclass){
		if(typeof instance.routerCount != 'number')
			instance.routerCount = 0;
		
		if(typeof instance.finishedRouterCount != 'number')
			instance.finishedRouterCount = 0;
		
		if(typeof instance.finishedRouterLoadedCount != 'number')
			instance.finishedRouterLoadedCount = 0;
		
		instance.routerCount++;
		
		// wait for all router to load to procee to next step
		instance.on("router.loaded", function(){
			instance.getLogger().debug("Server:use@event[router.loaded]", "server router.loaded event is fired.");
			
			module.initAll.apply(module);
		});
		
		instance.on('db.init', function(error){
			module.on("router.init", function(){
//				instance.getLogger().info("Server.event:router.init", "Router startup is called --- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> " + module.routerid + ">>> "  + "["+instance.routerCount+"]" + instance.finishedRouterCount);
				
				instance.finishedRouterCount++;
				
				if(instance.finishedRouterCount == instance.routerCount){
					instance.getLogger().debug("Server.Router@event[router.init]", "callback from all "+ "["+instance.routerCount+"]" + "Server.Router@event[router.init]")
					
					instance.emit('services.ready');
				}
			});
			
			module.on("router.loaded", function(){
				instance.finishedRouterLoadedCount++;
				
				if(instance.finishedRouterLoadedCount == instance.routerCount){
					instance.getLogger().debug("Server.Router@event[router.loaded]", "callback from all "+ "["+instance.routerCount+"]" + "Server.Router@event[router.loaded]")
					
					instance.emit("router.loaded");
				}
			});
			
			module.initServer(instance, function(){});
		});
	}else{ 
		simpleportal.util.callModuleFunction(module, true, 'init', instance, function(){});	
	}

	if(module instanceof Routerclass){
		instance.on("server.ready", function(){
			module.emit("server.ready", instance);
		});
	}
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
		
		callback(request, reponse, next);
	}
	
	instance.router.dispatch.addUrlHandler(handler);
}

/**
 * Method for adding new GET apis
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
		
		callback(request, reponse, next);
	}
	
	instance.router.dispatch.addUrlHandler(handler);
}

/**
 * Method for adding new GET apis
 * 
 * @method get
 * @param {string} path URI for the api
 * @param {callback} callback The callback to excecute when complete
 */
Server.prototype.enable = function(module, arg){
	var instance = this;
	
	if(arg != false)
		instance.options[module] = true;
	else
		instance.options[module] = false;
}

Server.DEFAULTS={
	'resources-simpleportal':true,
	'mode-configuration':false,
	coredir:__dirname + "/../../server"
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

Server.prototype.getConfiguration = function(key, defaultvalue){
	if(key)
		return this._configuration[key]||defaultvalue;
	else
		return this._configuration;
}

Server.prototype.setConfiguration = function(key, value) {
	var instance = this;
	
	if(key && typeof key != "object" && value)
		this._configuration[key] = value;
	else if(typeof key == "object"){
		simpleportal.util.extendJSON(this._configuration, key);

		if(key && key.preference){
			instance.emit("preference.change", key.preference);
		}
	}
	
	if(instance.getRouter("logger") && typeof key == "object" && key.hasOwnProperty("logger") && key.hasOwnProperty("logger")){
		var loggerprops = key.logger;
		if ( loggerprops["logtype"])
			instance.getRouter("logger").setConfiguration("logtype", loggerprops["logtype"]);
		
		if ( loggerprops["console"] )
			instance.getRouter("logger").setConfiguration("console", loggerprops["console"]);
	}
}

Server.prototype.getDBPool = function(){
	return this.dbpool;
}

Server.prototype.getDBInstance = function(callback, callback1){
	if(callback && typeof callback == "string")
		this.dbpool.getInstance(callback, callback1);
	else if(callback)
		this.dbpool.getInstance("default", callback);
	else
		return this._dbInstance;
}

Server.prototype.getStorageServiceInstance = function(serviceprops, callback){
	if(callback)
		callback(null, new simpleportal.Service.StorageService(serviceprops, this));
	else
		return new simpleportal.Service.StorageService(serviceprops, this);
}

Server.prototype.getLogger = function(){
	// ge the logger registered with in the simpleportal
	return this.logger;
}

Server.prototype.useStaticRouter = function(url, filepath){
	var instance = this;
	
	if(url && filepath){
		this.server.use(url, connect["static"](filepath));
	}
}

Server.prototype.getServer = function(){
	return this["server"];
}

Server.prototype.getRouter = function(routerid){
	return this[routerid];
}

Server.prototype.getServerPort = function(actual){
	var instance = this;
	if(actual)
		return instance.getConfiguration("port");
	
	else if(instance.getConfiguration("port") == "80" || instance.getConfiguration("port") == "443")
		return "";
	else if(instance.getConfiguration("hidePort"))
		return "";
	else
		return instance.getConfiguration("port");
}

//Server.prototype.getServerUrl = function(suburl, actual){
//	var instance = this;
//	var localHost = instance.getConfiguration("host");
//	
//	if(localHost != "localhost" && actual)
//		localHost = instance.getConfiguration("hostip", localHost);
//	
//	return 'http://' + localHost
//		+ ":" + instance.getConfiguration("port") + (suburl ? suburl : '');
//}

/**
 * @method getServerData
 * @static
 */
Server.prototype.getServerData = function(callback){
	var data = {
		themes:[],
		curtheme:{},
		layout:{}
	};
	
	callback(data);
}

Server.prototype.getServerCorePath = function(file, subpath1, subpath2, subpath3, subpath4){
	var instance = this;
	
	return path.normalize(simpleportal.util.appendFilePath(instance.options.coredir, file, subpath1, subpath2, subpath3, subpath4));
}

Server.prototype.getTempDirectory = function(file, subpath1, subpath2, subpath3, subpath4){
	var instance = this;
	
	var temppath = this.getConfiguration("resources").tempdir || "._tmp";
	
	return instance.getDataDirectory(temppath, file, subpath1, subpath2, subpath3, subpath4);
}

Server.prototype.getDataDirectory = function(file, subpath1, subpath2, subpath3, subpath4){
	var rootpath = this.getConfiguration("resources").datadir || "data";
		rootpath = simpleportal.util.getServerPath(rootpath);
	
	return simpleportal.util.appendFilePath(rootpath, file, subpath1, subpath2, subpath3, subpath4);
}

Server.prototype.removeServerAction = function(action){
	if(!this._serveractions)
		this._serveractions = [];
	
	if(simpleportal.util.jsonarraycontains(this._serveractions, 'action', action)){
		this._serveractions = this._serveractions.filter(function(actionprops){
			return actionprops['action']==action;
		});
	}
}

Server.prototype.registerServerAction = function(actionconfig){
	if(!this._serveractions)
		this._serveractions = [];
	
	if(!simpleportal.util.jsonarraycontains(this._serveractions, 'action', actionconfig.action))
		this._serveractions.push(actionconfig);
}

Server.prototype.getServerActions = function(){
	return this._serveractions;
}


/*
 * Local methods for simpleportal server
 */

function setDynamicPage(instance, webappuri, templatedir, request, response, next){
	if(webappuri){
		if(webappuri.lastIndexOf("/") == webappuri.length-1)
			webappuri = webappuri.substring(0, webappuri.length-1);
	}	
	
	var pagefile = templatedir + webappuri;
	
	if(pagefile.indexOf("?") != -1)
		pagefile = pagefile.substring(0, pagefile.indexOf("?"));
	
	if(pagefile.indexOf(".html") == -1){
		pagefile = pagefile + ".html";
	}
	
	fs.stat(pagefile + ".ejs", function(error){
		if(!error)
			request.publicpagelayout = pagefile + ".ejs";
//		else
//			delete request.publicpagelayout;
		next();
	});
}

function sendDynamicPage(instance, webappuri, request, response, next){
	var templatedir = instance.getServerCorePath("resources/templates/public");
	var templatepath = templatedir + "/index.html.ejs";
	
	if(request.publicpagelayout){
		var templateOption =  {
			file: templatepath,
			exceptionfile:templatedir + "/exception.html.ejs",
			data:simpleportal.util.extendJSON({
				htmlfile:'/pages' + request.url,
				templatedir:templatedir,
				pagelayout: request.publicpagelayout,
				webappuri:'/pages' + webappuri,
				curtime:moment().format('MMMM Do YYYY, h:mm:ss a'),
				serverconfig:instance.getConfiguration(),
				userprofile:request.getUserprofile()
			})
		};
		
		var resourceconfig = instance.getConfiguration("resources", {});
		if(resourceconfig && resourceconfig.defaulttheme){
			templateOption.data.themeconfig = instance.getRouter("pluginloader").getPluginDetails(resourceconfig.defaulttheme, "theme");
		}
		
		if(webappuri.indexOf(".html") != -1){
			templateOption.file = request.publicpagelayout; 
			
			delete templateOption.data.pagelayout;
		}
		var templateProcess = new Template(templateOption);
		
		templateProcess.render(response);
	} else
		next();
}

var updateWebpages = function(pagedir, serverconfig, callback){
	var publicpageuri = "/pages";
	
	simpleportal.util.getResources(pagedir, {resourcekey:"public", includeroot:false, extension:".html.ejs"}, function(error, webpages){
		if(webpages && webpages.length > 0){
			for(var i in webpages){
				delete webpages[i].path;
				webpages[i].uri = publicpageuri + webpages[i].id.replace(".html.ejs", "");
				webpages[i].id = webpages[i].id.replace(".html.ejs", "").replace("/", "");
				if(webpages[i].display)
					webpages[i].display = webpages[i].display.replace(".html.ejs", "");
				
				if(!webpages[i].status)
					webpages[i].status="active";
				
				var curwebpage = simpleportal.util.getJSONObject(serverconfig.webpages, 'id', webpages[i].id);
				
				if(!curwebpage){
					webpages[i].hidden = true;
					serverconfig.webpages.push(webpages[i]);
				} else {
					if(curwebpage.display)
						webpages[i].display = curwebpage.display;
					
					simpleportal.util.extendJSON(curwebpage, webpages[i]);
				}
			};
		}
		
		if(callback)callback();
	}, []);
}

var updateServerWebpages = function(instance){
	var serverconfig = instance.getConfiguration();
	if(serverconfig && !serverconfig.webpages)
		serverconfig.webpages = [
			{header:true, url:'', uri:(typeof serverconfig.loginuri !== 'undefined' ? serverconfig.loginuri : '/signin'), icon:"glyphicon glyphicon-log-in", id:'login', signin:false},
			{header:true, url:'', uri:(typeof serverconfig.logouturi !== 'undefined' ? serverconfig.logouturi : '/logout'), icon:"glyphicon glyphicon-off", id:'logout', signin:true}
        ];
	
	updateWebpages(instance.getServerCorePath("resources/templates/public/pages"), serverconfig, function(){
		updateWebpages(simpleportal.util.getServerPath("resources/templates/public/pages"), serverconfig, function(){
			if(serverconfig.logouturi){
				var logoutlink = simpleportal.util.getJSONObject(serverconfig.webpages, 'id', "logout");
				logoutlink.uri = serverconfig.logouturi;
			}
			
			if(serverconfig.loginuri){
				var loginlink = simpleportal.util.getJSONObject(serverconfig.webpages, 'id', "signin");
				loginlink.uri = serverconfig.loginuri;
			}
			
			if(serverconfig.termsofserviceuri){
				var termsofservicelink = simpleportal.util.getJSONObject(serverconfig.webpages, 'id', "terms-of-service");
				if(termsofservicelink)
					termsofservicelink.uri = serverconfig.termsofserviceuri;
			}
		});
	});
}

var registerPublicPageMapping = function(instance, urimappings){
	for(var i in urimappings){
		registerPublicPage(instance, urimappings[i]) 
	}
}

var registerPublicPage = function(instance, urimapping){
	instance.server.use(urimapping.url, function(request, response, next){
		sendTemplatePage(instance, instance.getServerCorePath("resources/templates/public", urimapping.path), urimapping.uri, request, response, next);
	});
}

var sendTemplatePage = function(instance, templatepath, url, request, response, next){
	if(request.url == "/" || /(\.html|\.css|\.js)$/.test(request.url)) {
		var templatefile = "index.html.ejs";
		
//		if(request.url.indexOf(".html") != -1 || request.url.indexOf(".js") != -1)
		if(/(\.html|\.css|\.js)$/.test(request.url))	
			if(request.url.indexOf("?") != -1)
				templatefile = request.url.substring(0, request.url.indexOf("?")) + ".ejs";
			else
				templatefile = request.url + ".ejs";
		
		var defaulttheme = instance.getConfiguration("resources").defaulttheme;
		var themeconfig = instance.getRouter("pluginloader").getPluginDetails(defaulttheme, "theme");
		
		var templateProcess = new Template({
			file: templatepath + "/" + templatefile,
			data:simpleportal.util.extendJSON({
				themeconfig:themeconfig,
				webappuri:url,
				curtime:moment().format('MMMM Do YYYY, h:mm:ss a')
			}, {serverconfig:instance.getConfiguration()}, {userprofile:request.getUserprofile()})			
		});
		
		templateProcess.render(response);
	} else
		next();
}