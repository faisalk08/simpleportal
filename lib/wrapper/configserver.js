var http = require("http"),
	connect = require('connect'),	
	simpleportal = require('./../simpleportal'),	
	template = require('./../template'),
	Resourceinstaller=require('./resourceinstaller'),
	JSONEditor=require('./editor').JSONEditor,
	ServerConfigEditor=require('./editor').ServerConfigEditor,
	events = require('events'),
	util = require("util"),
	fs=require('fs'),
	logger = simpleportal.logger;

/**
 * Simpleportal config server, connectjs server wrapped with useful functions from Simpleportal

	Example:

	var app = new simpleportal.Configserver();

	app.start();
	
 * 
 * @class Configserver
 * @module simpleportal
 * @submodule wrapper
 * @deprecated use simpleportal.Editor.ConfigEditor
 * @constructor
 * @param options The options object
 */
var Configserver = 
 module.exports = function Configserver(options, parentServer) {
	var instance = this;
	
	instance.options = simpleportal.util.extendJSON({}, Configserver.DEFAULTS, options);
	instance.parentServer = parentServer;
	
	instance.router = simpleportal.router;
	
	events.EventEmitter.call(instance);
	
	instance.serverstatus='default';
	
	instance.on('start', function(){
		instance.startServer();
	});
	
	return instance;
}

util.inherits(Configserver, events.EventEmitter);

Configserver.prototype.init = function(){
	var instance = this;
	
	if(instance.serverstatus == 'default'){
		simpleportal.configuration.init(function(configuration){
			instance.configuration=configuration;
			
			if(instance.configuration.openurl)
				instance.on('server.start', function(){
					var spawn = require('child_process').spawn;
					
					var serverurl = simpleportal.util.constructUrl({
						host:instance.configuration.host,
						port:instance.options.port||instance.configuration.port,
						secure:instance.configuration.secure,
						path:instance.options.uri
					});
					
					spawn('open', [serverurl]);	
				});

			instance.emit('start');
		});
	}else
		throw Error('Un known status - '+ instance.serverstatus);
}

Configserver.prototype.stop = function(){
	var instance = this;
	
	instance.init();
}

Configserver.prototype.start = function(){
	var instance = this;
	
	instance.init();
}

Configserver.prototype.startServer = function(){
	var instance = this;
	
	try{
		var server = connect.createServer();
		instance.server = server;
		
		instance.server.use(connect.bodyParser());
		
		var serverconfigeditor = new ServerConfigEditor(instance.options, instance.configuration);
		serverconfigeditor.route(instance.server);
		
		//instance.configure();
		serverconfigeditor.parentServer=instance.parentServer;
		var port = instance.options.port||instance.configuration.port || 9665;
		
		server.listen(port);
		
		instance.emit('server.start');
		
		logger.getInstance().info('Simple Portal -configserver', 'Configserver started, and listening on port - '+ port);
	} catch(error){
		console.trace();
		logger.getInstance().error('Simple Portal -configserver', error);
	}
}

Configserver.prototype.checkDBConfig = function(latestconfiguration, callback){
	var dbToUse = latestconfiguration.db['use'],
		dbOptions;
	
	if(dbToUse){
		dbOptions = latestconfiguration.db[latestconfiguration.db['use']];
	} 
	
	if(dbOptions)
		require('./../db').checkDBConfig(dbOptions, function(error, client){
			if(error)
				callback(error);
			else
				callback(error, client);
		});
	else
		callback('No valid db configuration found!!');
}

Configserver.prototype.route = function(uri, server){
	var instance = this;
	
	if(typeof uri == 'object'){
		server = uri;
		uri=null;
	}
	
	uri = uri||instance.options.uri||'/configuration/';
	
	if(server){
		server.use('/startserver', function(request, response, next){
			if(request.method == 'POST' && instance.parentServer){
				instance.parentServer.enable('mode-configuration', false);
				instance.parentServer.emit('server.init');
				
				if(!fs.existsSync(simpleportal.configuration.extention_file))
					fs.writeFileSync(simpleportal.configuration.extention_file, "{}");
				
				instance.parentServer.on('start', function(error){
					response.redirect(instance.parentServer.getServerUrl(), 302, request);
				});
			}
		});
		
		server.use('/checkdbconnection', function(request, response, next){
			if(request.method == 'POST' ){
				instance.jsoneditor.update(request.body, function(error, updatedobject){
					instance.checkDBConfig(instance.jsoneditor.getObject(), function(error){
						if(error)
							response.json({"status": "error", "message" : error});
						else
							response.json({"status": "success"});
					});
				});
			}else{
				response.json({"status": "error", "message":"Not a valid API"});
			}
		});
	}
}

Configserver.prototype.configure = function(){
	var instance = this,
		settingsfolder,
		cdnfolder;
	
	if(fs.existsSync('./resources/settings'))
		settingsfolder = './resources/settings';
	else if(fs.existsSync(__dirname + '/../../resources/settings'))
		settingsfolder = __dirname + '/../../resources/settings';
	
	if(fs.existsSync(__dirname + '/../../resources/cdn'))
		cdnfolder = __dirname + '/../../resources/cdn';
	
	if(cdnfolder)
		instance.server.use('/cdn', connect.static(cdnfolder));	

	var curconfiguration = simpleportal.util.extendJSON({}, instance.configuration);
	
	var jsoneditor = instance.jsoneditor = new JSONEditor(
		{
			ext_jsonfile:simpleportal.configuration.extention_file, 
			jsonfile:simpleportal.configuration.extention_file, 
			root:settingsfolder, 
			fields:instance.options.fields
		}, curconfiguration
	);
	
	jsoneditor.route(instance.options.uri, instance.server);
	instance.route(instance.server);
}

Configserver.DEFAULTS={};