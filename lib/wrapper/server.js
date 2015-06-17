var http = require("http"),
	ServerConfigEditor=require('./editor').ServerConfigEditor,
	events = require('events');

var mime=require('mime');

var simpleportal = require('./../simpleportal');

var util = require("util");
var logger = simpleportal.logger;

var fs=require('fs');
var connect = require('connect');

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
	
	instance.options = simpleportal.util.extendJSON({}, Server.DEFAULTS, options);
	
	if(options && options.configure){
		instance.configure = options.configure;
	}
	
	if(process.argv && process.argv.length > 2 && process.argv[2].indexOf('-mode=configuration') != -1)
		instance.options['mode-configuration']=true;
		
	instance.router = simpleportal.router;
	
	events.EventEmitter.call(instance);
	
	instance.serverstatus='init';
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
	
	//Autocreate folders
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

	if(instance.options['resources-install']){
		instance.on('configuration.ready', function(){
			logger.getInstance().info('Server.prototype.init:event', 'configuration.ready');
			
			if(instance.configuration.resources.dependencies){
				var downloads = instance.configuration.resources.dependencies;
				
				var cbdownloads = 0;
				
				if(downloads){
					logger.getInstance().info('Server.prototype.createServer', 'Installing dependencies');
					for(var index in downloads){
						var webresource = downloads[index];
						
						if(!webresource.disabled){
							webresource.resourcefolder = simpleportal.util.getServerPath(webresource.resourcefolder);
							
							var sr  = new simpleportal.Resourceinstaller(webresource);
							
							sr.install(function(error){
								if(error)
									console.log(error);
								
								if(cbdownloads++ == downloads.length-1)
									instance.emit('db.init');
							});
						}else if(cbdownloads++ == downloads.length-1)
							instance.emit('db.init');
							
					}
				} else
					instance.emit('db.init'); //mandatory to call this as configuration.ready is bypassing the init function
			}
		});
	}
	
	instance.on('server.init', function(){
		if(instance.options['mode-configuration'])
			instance.startServer();
		else
			instance.initServer(instance.configuration);
	});
	
	/*
	 * listening to on start event where we will register the router events
	 */
	instance.on('start', function(){
		instance.router.register([simpleportal.serviceloader, simpleportal.viewloader, simpleportal.pluginloader, simpleportal.oauth, simpleportal.template], function(){
			logger.getInstance().debug('Main Server - on:start', 'Router registered successfully');
		});

		instance.server.use(simpleportal.Response());
		
		instance.server.use(simpleportal.logger.getInstance().accessLog());
		
		logger.getInstance().info('Main Server - on:start', 'calling module function start');
		
		simpleportal.util.callModuleFunction(simpleportal.startuploader, true, 'start', instance, function(){
			logger.getInstance().debug('Main Server - on:start', 'Startups started succesfully');
			
			simpleportal.util.callModuleFunction(simpleportal.serviceloader, true, 'start', instance, function(){
				logger.getInstance().debug('Main Server - on:start', 'Startups inside service is loaded succesfully');
			});
		}, true);

		instance.emit('dispatch.pre', {});
	});

	instance.on('dispatch.pre', function(){
		if(instance.listeners('dispatch.ready').length == 0)
			instance.emit('dispatch.ready', {});
		else
			instance.emit('dispatch.ready', {});	
	});
	
	instance.on('dispatch.post', function(){
		instance.server.use(new simpleportal.Restfulmongo(simpleportal.serviceloader.serviceUrl));
		
		instance.server.use('/keep-alive', function(request, response){
			response.end();
		});
		
		// Simple portal resource at the end
		var staticResourceDir = simpleportal.util.getServerPath(instance.configuration.resources.root + 'public/');
		
		if(instance.options['resources-simpleportal'] && fs.existsSync(staticResourceDir + 'simpleportal'))
			instance.server.use('/simpleportal', connect.static(staticResourceDir + 'simpleportal'));
		
		if(instance.options['resources-simpleportal'] && fs.existsSync(__dirname + '/../../resources'))
			instance.server.use('/simpleportal', connect.static(__dirname + '/../../resources'));
		
		// App router bottom stack!!
		if(instance.configuration.homeuri && instance.configuration.homeuri != '/'){
			instance.server.use('/', function(request, response, next){
				//if(!/\.css|\.js|\.ico/.test(request.url))
				if(request.url == '/')
					response.redirect(instance.configuration.homeuri, 302, request);
				else if(next)
					next();
			});
		}
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
	
	/*
	 * initializing the configuration init
	 */
	instance.use(simpleportal.configuration);
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
	
			var serverconfigeditor;
			var starterurl;
			if(instance.options['mode-configuration'] && !serverconfigeditor){
				var options = {
					ext_jsonfile:simpleportal.configuration.extention_file,
					title:instance.configuration.title,
					openurl:true
				};
				
				serverconfigeditor = new ServerConfigEditor(options, instance.configuration);
				
				serverconfigeditor.route(instance.server);
				
				serverconfigeditor.on('server.reload', function(){
					instance.enable('mode-configuration', false);
					
					instance.removeAllListeners('services.ready');
					instance.on('services.ready', function(){
						instance.configure();
						
						instance.emit('start');
					});
					
					instance.use(simpleportal.configuration);
					
					//instance.initServer();
					//instance.emit('start', {});
				});
				
				if(instance.configuration.openurl)
					starterurl=instance.getServerUrl(serverconfigeditor.options.uri);
			}else {
				instance.configure();
				
				instance.emit('start', {});
			}
	
			server.listen(instance.configuration.port || 9665);
			
			instance.serverstatus='running';
			if(starterurl){
				var spawn = require('child_process').spawn;
				spawn('open', [starterurl]);
			}	
			
			logger.getInstance().info('Simple Portal -server', 'Server started, and listening on port dash - '+ instance.configuration.port);
		} catch(error){
			console.trace();
			logger.getInstance().error('Simple Portal -server', error);
		}
	else
		console.log('Server is already running!! - '+ instance.serverstatus);
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
	else if(fs.existsSync(__dirname+'/../../resources/favicon.ico'))
		instance.server.use(connect.favicon(__dirname+'/../../resources/favicon.ico'));
	
	if(instance.configureconnect)
		instance.configureconnect();
	else{
		instance.server.use(connect.cookieParser('keyboard cat'));
		
		if(configuration.secure)
			instance.server.use(connect.session({ secret:'keyboard cat', cookie: { maxAge: 60000, secure:true }}));
		else
			instance.server.use(connect.session({ secret:'keyboard cat', cookie: { maxAge: 60000}}));
	}

	if (fs.existsSync(staticResourceDir))
		instance.server.use(connect.static(staticResourceDir));
	
	if(configuration.resources.publicdirs && typeof configuration.resources.publicdirs.length != 'undefined'){
		configuration.resources.publicdirs.forEach(function(resource){
			if(fs.existsSync(resource))
				instance.server.use(connect.static(resource));
		});
	}
}

/**
 * Method to configure the connect Server, allows overriding default features of Simpleportal server
 * 
 * @method configureconnect
 */
Server.prototype.configureconnect = function() {
	var instance = this;
	
	if(instance.options['mode-configuration']){
		logger.getInstance().info('Simpleportal - Server:configureconnect' , 'SKIPPING Default Sever functions');
	}else{
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
 * To ge the Server url based ont he configiuration from the Server
 * @method getServerUrl
 * 
 */
Server.prototype.getServerUrl = function(path) {
	var instance = this;
	
	var options = {
		host:instance.configuration.host,
		port:instance.configuration.port,
		secure:instance.configuration.secure
	};
	
	if(path)
		options.path =path;
	
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
	logger.getInstance().debug('Simple Portal-server', 'Initilizing the server started...');
	
	var instance = this;
	
	instance.configuration = configuration;
	
	instance.use(simpleportal.logger.getInstance());
	instance.use(simpleportal.oauth);
	instance.use(simpleportal.template);
	
	instance.use(simpleportal.db);
	
	instance.use(simpleportal.serviceloader);
		
	if(instance.configuration.openurl)
		instance.on('start', function(){
			var spawn = require('child_process').spawn;
			
			var serverurl = instance.getServerUrl();
			
			if(serverurl)
				spawn('open', [serverurl]);	
		});
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
	logger.getInstance().info('Simple Portal - server : loadPluginURI', 'loading plugin - '+ pluginsetting.id);
	
	if(pluginsetting.plugintype=='webapp'){
		var webappuri = pluginsetting.webappuri||pluginsetting.id;
		
		if(pluginsetting.installeddir && pluginsetting.installed && fs.existsSync(pluginsetting.installeddir + '/html5')){
			logger.getInstance().info('Simple Portal - server : loadPluginURI' , 'WEBAPP -' + webappuri  + ' -- ' + pluginsetting.installeddir);
			
			if(fs.existsSync(pluginsetting.installeddir + '/filter')){
				simpleportal.filterloader.loadFilters({configuration:pluginsetting, filterdir:pluginsetting.installeddir + '/filter'}, function(error, filters){
					console.log('Loading filters for plugin - '+ pluginsetting.id);
					
					instance.registerFilter(filters, {uri:webappuri, configuration:pluginsetting}, function(){
						logger.getInstance().info('Simple Portal - server : loadPluginURI' , 'Finished regsitering filters');
						
						instance.server.use(webappuri, connect.static(pluginsetting.installeddir + '/html5'));
					});
				});	
			}else{
				instance.server.use(webappuri, connect.static(pluginsetting.installeddir + '/html5'));
				
				if(pluginsetting.webapptype == 'backbone')
					instance.server.use(webappuri, (function(data){
						var viewsettings = simpleportal.util.extendJSON({modelfiles:[], viewfiles:[]}, data);
						
						if(fs.existsSync(data.installeddir + '/html5/js/views'))
							viewsettings.modelfiles=fs.readdirSync(data.installeddir + '/html5/js/models').filter(function(f){return /\.js/.test(f);}).sort(function(a, b){return /^common\.js/.test(a) ? 0 :1; });
						if(fs.existsSync(data.installeddir + '/html5/js/views'))
							viewsettings.viewfiles=fs.readdirSync(data.installeddir + '/html5/js/views').filter(function(f){return /\.js/.test(f);}).sort(function(a, b){return /^common\.js/.test(a)? 0 :1; });
						
						return function(request, response, next){
							var filepath = request.url;
							if(request.url.lastIndexOf('?')!=-1)
								filepath = request.url.substring(0, request.url.lastIndexOf('?'));
								
							simpleportal.template.render(__dirname  + '/../../resources/templates' + filepath + '.ejs', viewsettings, function(error, html){
								if(!error)
									response.send(200, request.headers, html);
								else
									next();
							});
						}
					})(pluginsetting));
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
			
			if(instance.listeners('configuration.ready').length > 0)
				instance.emit('configuration.ready');
			else
				instance.emit('db.init');
		});
	} else if(module == simpleportal.configuration){
		module.init(instance, function(configuration){
			instance.configuration=configuration;
			
			instance.emit('server.init');
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
		
		callback(request, reponse);
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
	'mode-configuration':false
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