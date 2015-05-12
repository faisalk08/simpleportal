var http = require("http"),
	connect = require('connect'),	
	simpleportal = require('./../simpleportal'),	
	template = require('./../template'),
	Resourceinstaller=require('./resourceinstaller')
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
 * 
 * @constructor
 * @param options The options object
 */
var Configserver = 
 module.exports = function Configserver(options, parentServer) {
	var instance = this;
	
	instance.options = simpleportal.util.extendJSON({}, Configserver.CONFIG_SERVER_DEFAULTS, options);
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
						secure:instance.configuration.secure
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
		
		instance.configure();
		
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

Configserver.prototype.configure = function(){
	var instance = this;
	
	var curconfiguration = simpleportal.util.extendJSON({}, instance.configuration);
	var flattencurconfiguration = simpleportal.util.flattenJSON(curconfiguration, '__');
	
	var settingsfolder;
	
	var configurablefields  = [
        { field: 'port', type: 'int', required: true , options:{autoFormat:false}},
        { field: 'host',  type: 'text', required: true },
        { field: 'hidePort',  type: 'checkbox', required: false},
        { field: 'secure',  type: 'checkbox', required: false},
        { field: 'homeuri', type: 'text', required: true , options:{autoFormat:false}},
        
        { field: 'db__use', type: 'list', required: true, options:{items:['mongodb']}},
        
        { field: 'db__mongodb__port', type: 'int', required: true, options:{autoFormat:false}},
        { field: 'db__mongodb__host',  type: 'text', required: true},
        { field: 'db__mongodb__dbName',  type: 'text', required: true},
        
        { field: 'logger__logtype',  type: 'list', required: true, options:{items:['info', 'debug', 'warn', 'error']}},
        { field: 'logger__root',  type: 'text', required: true}
    ];
	
	instance.server.use(connect.bodyParser());
	
	if(fs.existsSync('./resources/settings'))
		settingsfolder = './resources/settings';
	else if(fs.existsSync(__dirname + '/../../resources/settings'))
		settingsfolder = __dirname + '/../../resources/settings';
	
	var cdnfolder;
	if(fs.existsSync(__dirname + '/../../resources/cdn'))
		cdnfolder = __dirname + '/../../resources/cdn';
	
	if(cdnfolder)
		instance.server.use('/cdn', connect.static(cdnfolder));	
	
	instance.server.use('/configurationform', function(request, response, next){
		template.render(settingsfolder+ '/templates/configuration.ejs', curconfiguration, function(error, replacecontent){
			response.send(200, null, replacecontent);
		});
	});
	
	instance.server.use('/configurationsettings', function(request, response, next){
		response.json(
			{
				fields:configurablefields,
        	    record:flattencurconfiguration
			}
		);
	});
	
	instance.server.use('/startserver', function(request, response, next){
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
	
	instance.server.use('/checkdbconnection', function(request, response, next){
		if(request.method == 'POST' ){
			var configuration_ext = {}; 
			
			for(var i in request.body){
				if(simpleportal.util.jsonarraycontains(configurablefields, 'field', i)){
					if(typeof request.body[i] == 'object' && request.body[i].id)
						configuration_ext[i]=request.body[i].id;
					else
						configuration_ext[i]=request.body[i];
				}	
			}
			var defalatedjson = simpleportal.util.unFlattenJSON(configuration_ext, '__');
			var latestconfiguration  = simpleportal.util.extendJSON({}, curconfiguration, defalatedjson);
			
			instance.checkDBConfig(latestconfiguration, function(error){
				if(error)
					response.json({"status": "error", "message":error});
				else
					response.json({"status": "success"});
			});
		}else{
			response.json({record:instance.configuration});
		}
	});
	
	instance.server.use('/configuration', function(request, response, next){
		if(request.method == 'POST' ){
			var configuration_ext = {}; 
			
			for(var i in request.body) {
				if(simpleportal.util.jsonarraycontains(configurablefields, 'field', i))
					if(typeof request.body[i] == 'object' && request.body[i].id)
						configuration_ext[i]=request.body[i].id;
					else
						configuration_ext[i]=request.body[i];
			}
			
			var defalatedjson = simpleportal.util.unFlattenJSON(configuration_ext, '__');
			
			if(defalatedjson && Object.keys(defalatedjson).length > 0) {
				fs.writeFileSync(simpleportal.configuration.extention_file, JSON.stringify(defalatedjson, null, '\t'));

				curconfiguration = simpleportal.util.extendJSON(curconfiguration, defalatedjson);
				flattencurconfiguration = simpleportal.util.extendJSON(flattencurconfiguration, configuration_ext);
			}
			
			if(defalatedjson.db){
				instance.checkDBConfig(curconfiguration, function(error, client){
					if(error)
						response.json({"status": "error", "message":error});
					else
						response.json({"status": "success"});
				});
			}else
				response.json({"status": "success"});
			//instance.server.close();
		}else{
			response.json({record:instance.configuration});
		}
	});
	

	if(settingsfolder){
		instance.server.use('/', function(request, response, next){
			if(request.url == '/'){
				template.render(settingsfolder+ '/templates/index.ejs', curconfiguration, function(error, replacecontent){
					response.send(200, null, replacecontent);
				});
			}else
				next();
		});
		
		instance.server.use('/', connect.static(settingsfolder));
	}
}

Configserver.DEFAULTS={
	'resources-simpleportal':true,
	'mode-configuration':false
}