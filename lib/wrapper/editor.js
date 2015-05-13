var simpleportal = require('./../simpleportal'),	
	template = require('./../template'),
	Resourceinstaller=require('./resourceinstaller')
	events = require('events'),
	util = require("util"),
	fs=require('fs'),
	logger = simpleportal.logger;

/**
 * Class for modifying json files 
 * 
 * @class JSONEditor
 */
var JSONEditor = function(options, defaultconfiguration){
	var instance = this;

	instance.init(options, defaultconfiguration);
	
	return instance;
}

util.inherits(JSONEditor, events.EventEmitter);

JSONEditor.DEFAULTS={
	title:'JSON Editor',
	name:'jsoneditor',
	uri:'/jsoneditor/',	
	root:__dirname + '/../../resources/settings',
	cdndir:__dirname + '/../../resources/cdn',
	index:'index.ejs',
	form1:'configuration',
	form:'tabbedconfiguration',
	template:'ejs',
	fields:[]
};

JSONEditor.prototype.activate = function(disable){
	var instance = this;
	
	var active = true;
	if(!disable)
		active = false;
	
	instance.active=active;
}

JSONEditor.prototype.init = function(options, defaultconfiguration){
	var instance = this;
	
	console.log('JSONEditor:init - Initilaizing the JSON Editor');
	
	instance.options = simpleportal.util.clone(JSONEditor.DEFAULTS);
	
	if(options)
		instance.options = simpleportal.util.extendJSON(instance.options, options);
	
	if(instance.options.root){
		instance.options.templatedir =  instance.options.root + '/templates'; 
	}else{
		throw Error('JSON Editor need the root folder to proceed!');	
	}
	
	if(instance.options.jsonfile)
		instance.jsonfile = instance.options.jsonfile;
	
	if(instance.options.ext_jsonfile)
		instance.ext_jsonfile = instance.options.ext_jsonfile;
	
	instance.jsonobject = {};
	instance.defaultjsonobject = {};
	instance.editorsettings={};
	
	if(defaultconfiguration) {
		instance.defaultjsonobject = simpleportal.util.extendJSON({}, defaultconfiguration);
		
		instance.updateJSONObject(instance.defaultjsonobject);
	}
	
	instance.editorsettings.name= (instance.options.name || 'jsoneditor');
	instance.editorsettings.header= (instance.options.title || 'Configuration / JSON Editor');
	instance.editorsettings.url= (instance.options.uri || '/')  + 'update';
	
	instance.editorsettings.formURL= (instance.options.uri || '/') + 'template/' + instance.options.form||'configuration';
	instance.editorsettings.fields= instance.options.fields||[];
	
	instance.active=true;

	events.EventEmitter.call(instance);
}

JSONEditor.prototype.updateJSONObject = function(defaultconfiguration){
	var instance = this;
	
	instance.jsonobject = {};
	var tabbedfields = {general:[]};
	
	var flattenjson = simpleportal.util.flattenJSON(defaultconfiguration, '__');
	
	if(defaultconfiguration){
		for(var i in instance.options.fields){
			var field = instance.options.fields[i];
			
			if(typeof flattenjson[field.field] == 'object' && flattenjson[field.field].id) // FIX- when using w2ui list plugin data is send in a object with id as the value
				instance.jsonobject[field.field]=flattenjson[field.field].id;
			else
				instance.jsonobject[field.field]=flattenjson[field.field];
			
			if(field.field.indexOf('__') != -1){
				var tab = field.field.substring(0, field.field.indexOf('__'));
				if(!tabbedfields[tab])
					tabbedfields[tab]=[];
				
				tabbedfields[tab].push(field);
			}else
				tabbedfields['general'].push(field);
		}
	}
	
	var tabs =[];
	for(var i in tabbedfields){
		tabs.push({id:i, caption:i, fields:tabbedfields[i]})
	}
	
	instance.tabs = tabs;
	instance.editorsettings.tabs=tabs;
}

JSONEditor.prototype.getEditorSettings = function(flatten){
	var instance = this;
	
	return instance.editorsettings;
}

JSONEditor.prototype.getJSONObject = function(flatten){
	var instance = this;
	
	if(flatten)
		return simpleportal.util.flattenJSON(instance.jsonobject, '__');
	else
		return instance.jsonobject;
}

JSONEditor.prototype.getObject = function(flatten){
	var instance = this;
	
	var object = simpleportal.util.clone(instance.editorsettings);
	object.record = instance.getJSONObject(flatten);
	
	return object;
}

JSONEditor.prototype.renderTemplate = function(templatename, data, response){
	var instance = this;
	
	template.render(instance.getTemplatePath(templatename), data, function(error, html){
		if(typeof response == 'function')
			response(error, html);
		else
			response.send(200, null, html);
	});
}

JSONEditor.prototype.getTemplatePath = function(templatename){
	var instance = this;
	
	return simpleportal.util.getServerPath(instance.options.templatedir + '/' + templatename + '.ejs');
}

JSONEditor.prototype.render = function(data, response){
	var instance = this;
	
	instance.renderTemplate('index', data, response);
}

JSONEditor.prototype.update = function(object, callback){
	var instance = this;
	
	var jsonchanges = {}; 
	
	// can be either way now iterating object instead of fields, if only one changes then no need to iterate entire fields list
	for(var i in object){
		var fieldprops=simpleportal.util.getJSONObject(instance.options.fields, 'field', i);
		if(fieldprops && !fieldprops['disabled']){
			if(typeof object[i] == 'object' && object[i].id){ // FIX- when using w2ui list plugin data is send in a object with id as the value
				if(instance.jsonobject[i] != object[i].id)
					jsonchanges[i]=object[i].id;
			} else if(instance.jsonobject[i] != object[i])
				jsonchanges[i]=object[i];
			
			if(fieldprops.type=='checkbox' && jsonchanges[i]=='1')
				jsonchanges[i]=true;
			else if(fieldprops.type=='checkbox' && jsonchanges[i]!='1')
				jsonchanges[i]=false;
		}	
	}
	var jsonchanges_unflattened = simpleportal.util.unFlattenJSON(jsonchanges, '__');
	
	instance.jsonobject  = simpleportal.util.extendJSON(instance.jsonobject, jsonchanges);
	
	if(callback)
		callback(null, jsonchanges_unflattened);
}

JSONEditor.prototype.save = function(updatedobject){
	var instance = this;
	
	console.log('Saving the data to the file  --- '+ instance.ext_jsonfile);
	if(instance.ext_jsonfile && updatedobject && Object.keys(updatedobject).length > 0) {
		var jsontoupdate = simpleportal.util.clone(updatedobject);
		
		if(fs.existsSync(instance.ext_jsonfile)){
			var curjson = simpleportal.util.readJSONFile(instance.ext_jsonfile);
			
			jsontoupdate = simpleportal.util.extendJSON(curjson, jsontoupdate);
		}
		
		fs.writeFileSync(instance.ext_jsonfile, JSON.stringify(jsontoupdate, null, '\t'));	
	}
}

JSONEditor.prototype.read = function(){
	var instance = this;
}

/**
 * Default HTTP Router for connect | express style router for external servers
 * @method route
 * @param uri URI prefix for the editor
 * @param server HTTP server connect | express server
 */
JSONEditor.prototype.route = function(uri, server){
	var instance = this;
	
	if(typeof uri == 'function'){
		server = uri;
		uri=null;
	}
	
	uri = uri||instance.options.uri||'/jsoneditor/';
	
	if(server){
		var connect = require('connect');
		
		if(connect)
			server.use(uri, (function(){
				return function(request, response, next){
					if(!instance.active){
						var obj = simpleportal.util.clone(instance.getEditorSettings());
						obj.message='Editor is not active!'
						
						instance.renderTemplate('error', obj, response);
					}else
						next();	
				}
			})());
		
		if(connect)
			server.use(uri, connect.bodyParser());
		
		console.log('JSONEditor : route : To GET|POST the configuration  -' + uri + 'update');
		server.use(uri + 'update', function(request, response, next){
			if(request.method == 'POST' ){
				instance.update(request.body, function(error, updatedobject){
					if(updatedobject && Object.keys(updatedobject).length > 0) {
						instance.save(updatedobject);
						response.json({"status": "success"});
					}else
						response.json({"status": "error", "message":"No data to update"});
				});
			}else{
				response.json({record:instance.getJSONObject()});
			}
		});
		
		console.log('JSONEditor : route : To GET the json settings  -' + uri + 'editorsettings');
		server.use(uri + 'editorsettings', function(request, response, next){
			response.json(instance.getObject());
		});
		
		console.log('JSONEditor : route : To GET the processed html from template  -' + uri + 'template/');
		server.use(uri + 'template/', function(request, response, next){
			var templatename = request.url.replace('/', '');
			if(templatename && templatename != ''){
				instance.renderTemplate(templatename, instance.getObject(), response);
			}else
				next();
		});
		
		console.log('JSONEditor : route : To Open the JSON editor  -' + uri);
		server.use(uri, function(request, response, next){
			function directory() {
			      var target = request.url.format(request.originalUrl += '/');
			      response.statusCode = 303;
			      response.setHeader('Location', target);
			      response.end('Redirecting to ' + escape(target));
		    }
			
			if(request.url == '/'&&request.originalUrl.lastIndexOf('/')  == request.originalUrl.length )
				directory();
			else if(request.url == '/')
				instance.render(instance.getEditorSettings(), response);
			else
				next();
		});
		
		if(connect){
			if(instance.options.cdndir && fs.existsSync(instance.options.cdndir))
				server.use('/cdn', connect.static(instance.options.cdndir));
			
			server.use(uri, connect.static(instance.options.root));
		}	
	}	
}

var ServerConfigEditor = function(options, defaultconfiguration) {
	console.log('ServerConfigEditor:init - Initilaizing the ServerConfigEditor Editor');
	
	var options_ = simpleportal.util.clone(ServerConfigEditor.DEFAULTS);
	
	if(options)
		options_ = simpleportal.util.extendJSON(options_, options);
	
	ServerConfigEditor.super_.call(this, options_, defaultconfiguration); // not necessary, but it's neater to keep it there.
	
	var instance = this;
		
	var tabs = instance.editorsettings.tabs;
	var dbtab = simpleportal.util.getJSONObject(tabs, 'id', 'db');
	
	if (dbtab){
		dbtab.buttons=[];
		dbtab.buttons.push({field:'checkdbconnection', type:'button', action:'checkdbconnection', html:{caption:'Test Database connection'}});
		dbtab.buttons.push({field:'', type:'link', html:{caption:'Download Mongo DB'}, action:'http://www.mongodb.org/downloads?_ga=1.138445744.2085945964.1424807802'});
	}
	
	var generaltab = simpleportal.util.getJSONObject(tabs, 'id', 'general');
	if(generaltab){
		generaltab.buttons=[];
		generaltab.buttons.push({field:'reloadserver', type:'button', action:'reloadserver', html:{caption:'Reload server'}});
	}	
	
	return this;
}

util.inherits(ServerConfigEditor, JSONEditor);

ServerConfigEditor.DEFAULTS = {
	uri:'/configuration/',	
	fields:[
	   { html:{caption:'Title'}, field: 'title', type: 'text', required: true , options:{autoFormat:false}},
       { html:{caption:'Server port'}, field: 'port', type: 'int', required: true , options:{autoFormat:false}},
       { html:{caption:'Server host'}, field: 'host',  type: 'text', required: true },
       { html:{caption:'Hide port'}, field: 'hidePort',  type: 'checkbox', required: false},
       { html:{caption:'Secure'}, field: 'secure',  type: 'checkbox', required: false},
       { html:{caption:'Home URI'}, field: 'homeuri', type: 'text', required: true , options:{autoFormat:false}},
       { html:{caption:'Open URL on start'}, field: 'openurl',  type: 'checkbox'},
       
       { html:{caption:'Database to use'}, field: 'db__use', type: 'list', required: true, options:{items:['mongodb']}},
       
       { html:{caption:'Database port'}, field: 'db__mongodb__port', type: 'int', required: true, options:{autoFormat:false}},
       { html:{caption:'Database host'}, field: 'db__mongodb__host',  type: 'text', required: true},
       
       { html:{caption:'Database user name'}, field: 'db__mongodb__user',  type: 'text', required: false},
       { html:{caption:'Database password'}, field: 'db__mongodb__password',  type: 'text', required: false},
       
       { html:{caption:'Database name'}, field: 'db__mongodb__dbName',  type: 'text', required: true},
       
       { html:{caption:'Logger type'}, field: 'logger__logtype',  type: 'list', required: true, options:{items:['info', 'debug', 'warn', 'error']}},
       { html:{caption:'Log directory'}, field: 'logger__root',  type: 'text', required: true},
       { html:{caption:'Show in console'}, field: 'logger__console',  type: 'checkbox'}
   ]
};

ServerConfigEditor.prototype.checkDBConfig = function(latestconfiguration, callback){
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

ServerConfigEditor.prototype.route=function(uri, server){
	var instance = this;
	
	if(typeof uri == 'function'){
		server = uri;
		uri=null;
	}
	
	uri = uri||instance.options.uri||'/configuration/';
	
	if(server){
		if(instance.options.cdnfolder)
			server.use('/cdn', connect.static(cdnfolder));
		
		JSONEditor.prototype.route.call(instance, uri, server);
		
		console.log('ServerConfigEditor : route : Server router for starting the parent server  -' + uri + 'reloadserver');
		server.use(uri + 'reloadserver', function(request, response, next){
			if(request.method == 'POST'){
				instance.emit('server.reload');
				
				instance.activate(false);
				
				response.json({"status": "error", "message":"Please reload the server url to see the changes"});
			} else if(request.method == 'POST' && instance.parentServer){
				instance.parentServer.enable('mode-configuration', false);
				
				instance.parentServer.emit('server.init');
				
				if(!fs.existsSync(simpleportal.configuration.extention_file))
					fs.writeFileSync(simpleportal.configuration.extention_file, "{}");
				
				instance.parentServer.on('start', function(error){
					response.redirect(instance.parentServer.getServerUrl(), 302, request);
				});
			}else
				response.json({"status": "error", "message":"Not able to reload the server, contact administrator!!"});
		});
		
		console.log('ServerConfigEditor : route : Server router for check db configuration  -' + uri + 'checkdbconnection');
		server.use(uri + 'checkdbconnection', function(request, response, next){
			if(request.method == 'POST' ){
				instance.update(request.body, function(error, updatedobject){
					var updatedobject = simpleportal.util.unFlattenJSON(instance.getJSONObject(), '__');
					
					instance.checkDBConfig(updatedobject, function(error){
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

module.exports={
	JSONEditor:JSONEditor,
	ServerConfigEditor:ServerConfigEditor,
};