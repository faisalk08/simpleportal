"use strict";

/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012-2017 Faisal(admin@simpleportaljs.com)
 *	
 * MIT Licensed
 */
var path = require('path'),
	fs = require('fs'),
	util = require('./../util'),
	simpleportal = require('./../simpleportal'),
	FileListener = require('./../service/filelistener'),
	Resourceinstaller = require('./../util/resourceinstaller'),
	Routerclass = require("./router");
	
var PluginLoaderMain = module.exports = function(options, serverInstance){
	var instance = this;
	/*
	 * Registering service loader with the nodejs event emitter 
	 */
	options = simpleportal.util.extendJSON({
		routerid:"pluginloader"
	}, options);
	
	if(serverInstance){
		var serveroptions = {
			systempublicappdir:serverInstance.getServerCorePath("resources/public"),
			systemplugindir:serverInstance.getServerCorePath("resources/plugins"),
			systemuiplugindir:serverInstance.getServerCorePath("resources/uiplugin"),
			templatedir:serverInstance.getServerCorePath("resources/templates/plugin"),
			layoutdir:serverInstance.getServerCorePath("resources/templates/plugin/layout/templates"),
			themedir:serverInstance.getServerCorePath("resources/public/theme")
		}
		options = simpleportal.util.extendJSON(serveroptions, options);
	}
	
	Routerclass.call(this, options, serverInstance);
	
	instance.services = {};
	instance.services.service = {};

	instance.plugindirs = [];
	instance.changedplugins = [];

	instance.systemplugindir = options.systemplugindir || simpleportal.rootdir + "/server/resources/plugins";
	instance.systemuiplugindir = options.systemuiplugindir || simpleportal.rootdir + '/server/resources/uiplugin';

	/*
	 * Configuration for loading various plugins
	 * uiplugin, util webapp,theme
	 */
	instance.publicappdir = options.publicappdir||"resources/public";
	instance.plugindir = options.plugindir || 'resources/plugin';
	instance.uiplugindir = options.uiplugindir ||'resources/uiplugin';
	instance.templatedir = options.templatedir || simpleportal.rootdir + '/server/resources/templates/plugin';
	instance.layoutdir = options.layoutdir || simpleportal.rootdir + '/server/resources/templates/plugin/layout/templates';
	
	instance.defaultthemedir = options.themedir || '/../../resources/theme';
	
	instance.plugindirs = [];
	/**
	 * Include all possible directories in to the plugin dirs were plugins will be searched for
	 */
	if(options.plugindir)
		instance.plugindirs.push(instance.plugindir);
	
	instance.pluginUrl=options.pluginUrl||'/plugin';

	instance.tempdir = options.tempdir||__dirname + '/../../resources/._temp';
	//if(serverInstance && serverInstance.getConfiguration())
	
	instance.systempublicappdir = options.systempublicappdir || simpleportal.rootdir + "/server/resources/public";
	
	instance.themeIndex={};
	
	/*
	 * Loading plugins 
	 */
	instance.plugins = {
		util:[],
		webapp:[], 
		theme:[], 
		layout:[],
		uiplugin:[],resource:[]
	};
	
	// plugin dependency
	// pluginid@version as the key and the integration object 
	instance.integration={};
	
	instance._pluginerrors={};
	instance._dynplugins={};
	
	instance.integration['sessiontimeoutapp'] = {latest:{javascript:["/session-locked/app.js"]}};
	
	instance.webappuris =[];
	//	events.EventEmitter.call(this);
	
	// let us add a specific sub view load using listener
	instance.on("load", function(options){
		//Updating plugin configuration - real time configuration changes for display and UI purpose
		if(options && options.pluginsetting && options.pluginsetting.installeddir)
			instance.updatePluginConfiguration(options.pluginsetting, options.pluginsetting.installeddir); 
		
		loadDependencies(instance, options);
	});
	
	instance.on("installed", function(options){
		if(options.plugindir)
			instance.loadPluginFromDirectory(options.plugindir, instance.getConfiguration(), function(perror, pdata){
				// check for updated plugin
//				getWebappuriregxp(instance); // generate the reg exp for wek apps
				
				var pluginsetting = instance.getPluginDetails(options.id, options.plugintype);
				if(pluginsetting)validateAndActivatePlugin(instance, pluginsetting, function(){})
			});
	});
	
	/**
	 * do listen to load.router
	 * {
	 * 	plugin:pluginsetting.id, 
	 *	servicedir:pluginsetting.installeddir + '/' + pluginsetting.servicedir, 
	 *	services:services_, 
	 *	serviceprefix:pluginsetting.serviceprefix
	 * }
	 */
	instance.on("load.router", function(options){
		if(options && options.plugindir){
			instance.loadPluginFromDirectory(options.plugindir, instance.getConfiguration(), function(perror, pdata){
				// check for updated plugins
				getWebappuriregxp(instance); // generate the reg exp for wek apps
			});
		}
	});
	
	instance.on("router.loaded", function(){
		/**
		 * We need to work after minification
		 */
		if(instance.getServiceloader().getService("plugin"))
			instance.getServiceloader().getService("plugin").on("afterupdate", function(servicedata){
				var hasTranslation = false,
					pluginsetting = instance.getPluginDetails(servicedata.servicemodel.id, servicedata.servicemodel.plugintype);
				
				// after update for 
				if(servicedata.servicemodel && servicedata.servicemodel.preference){
					// let us check the preference where minified files are really available
	//				pluginsetting.preference = simpleportal.util.extendJSON(pluginsetting.preference, servicedata.servicemodel.preference);
					instance.setPreference(pluginsetting, servicedata.servicemodel.preference);
	
					// let us check the preference where minified files are really available
					if(pluginsetting.preference && pluginsetting.preference.minified && !fs.existsSync(instance.getTempPath(pluginsetting)))
						pluginsetting.preference.minified = false;
					
					updateIntegration(pluginsetting, instance);
					
					instance.pluginChanged(servicedata.servicemodel.id);
				} else if(servicedata.servicemodel && servicedata.servicemodel.integration){
					var pluginsetting = instance.getPluginDetails(servicedata.servicemodel.id, servicedata.servicemodel.plugintype);
					
					updateIntegration(pluginsetting, instance);
					
					instance.pluginChanged(servicedata.servicemodel.id);
				} else if(hasTranslation){
					updateIntegration(pluginsetting, instance);
					
					instance.pluginChanged(servicedata.servicemodel.id);
				}
				
				var settingsfield = pluginsetting.plugintype + 'setting';
				if(pluginsetting[settingsfield].dependencies){
					// let us inject dependencies
					injectDependencies(instance, pluginsetting);
				}	
			});
		
		watchPluginChange(instance);
		
		instance.on("update.integration", function(pluginsetting){
			updateIntegration(pluginsetting, instance);
		});
		
		instance.getServerInstance().on("preference.change", function(preference){
			if(preference && preference.plugin){
				var prefplugins = Object.keys(preference.plugin);
				
				for(var pi in prefplugins){
					var prefplugin = prefplugins[pi];
					
					instance.setPreference({id:prefplugin}, preference.plugin[prefplugin]);
				}
			}
		});
	});
	
	return instance;
};
require("util").inherits(PluginLoaderMain, Routerclass);

var watchPluginChange = function(instance){
	instance.pluginconfiglistener = new FileListener();
	
	for(var i in instance.plugindirs){
		instance.pluginconfiglistener.listen(instance.plugindirs[i], function(data){
			
			// if it is plugin json change
			if(data && data.filename && data.filename.indexOf("plugin.json") != -1) {
				var pluginfile = data.listenDir + "/" + data.filename;
				try{
					simpleportal.util.readJSONFile(pluginfile, function(error, pluginjson){
						if(pluginjson && pluginjson.id){
							var existingplugin = instance.getPluginDetails(pluginjson.id, pluginjson.plugintype);
							
							if(existingplugin){
								var difference = simpleportal.util.jsonDifference(pluginjson, existingplugin);
								simpleportal.util.copyJSON(existingplugin, ['title', "description", "version"], difference);
								
								if(difference && difference.integration) {
									existingplugin.integration = difference.integration;
									
									instance.emit("update.integration", existingplugin);
								} else
									instance.emit("plugin.clear.cache", existingplugin);
							}
						}
					});
				} catch(error){
					console.error(error);
				}
			} else if( data.filename.indexOf("/templates/") != -1){
				var pluginid = data.filename.substring(0, data.filename.indexOf("/"));
				var pluginsetting = instance.getPluginDetails(pluginid, "all");
				
				console.log("<-- Templated changed -->")
				console.log(pluginsetting);
				console.log("<-- Templated changed -->")
			}
		});
	}
}

PluginLoaderMain.prototype.initRouter = function(router, callback){
	var instance = this;

	// register the public uri
	instance.getServerInstance().useStaticRouter('/', instance.systempublicappdir);
	
	// let us check we can execute start All of various plugins
	var webapps = instance.getPlugins("webapp"),
		themes = instance.getPlugins("theme");
	
	if(themes && themes.length > 0)
		themes.forEach(function(themesetting) {
			loadPluginURI(instance.getServerInstance(), instance, themesetting);
		});
	else
		instance.getServerInstance().useStaticRouter('/theme', instance.defaultthemedir);

	webapps.forEach(function(webappsetting){
		loadPluginURI(instance.getServerInstance(), instance, webappsetting);
	});

	if(callback)callback();
}

/**
 * to validate plugin
 * 
 * @param instance pluginloader instance
 * @param plugindetails plugin object
 * @param callback
 */
function validateAndActivatePlugin(instance, plugindetails, callback){
	instance.checkDependencies(plugindetails, function(){
		// let us check plugin is still valid
		
		if(isPluginActive(plugindetails))
			instance.emit("load", {pluginsetting:plugindetails});
		
		callback(null, plugindetails);
	});
}

/**
 * to validate all plugins
 */
function validatePluginlist(instance, pluginlist, callback){
	var cbc = pluginlist ? pluginlist.length : 0;
	if(pluginlist && pluginlist.length > 0){
		for(var pindex in pluginlist){
			validateAndActivatePlugin(instance, pluginlist[pindex], function(){
				if(cbc-- == 1)
					callback();
			});
		}
	} else
		callback();
}

/**
 * to validate all plugins
 */
function valdateAll(instance, callback){
	var plugins = instance.getPlugins(),
		cbc = Object.keys(plugins).length ;
	
	if(cbc > 0)
		for(var type_ in plugins){
			validatePluginlist(instance, instance.plugins[type_], function(){
				if(cbc-- == 1)
					callback();
			});
		}
	else
		callback();
}

/**
 * Load from all directories
 * @method loadFromAll
 * 
 * @param instance plugin loader instance
 * @param plugindirs array of plugin directories
 * @param callback {function} callback function
 * 
 * @provate
 */
function loadFromAll(instance, plugindirs, callback){
	var pluginlookdir = plugindirs.splice(0, 1);
	
	instance.loadPluginFromDirectory(pluginlookdir[0], instance.getConfiguration(), function(perror, pdata){
		if(!plugindirs || plugindirs.length == 0){
			valdateAll(instance, callback);
		}else
			loadFromAll(instance, plugindirs, callback);
	});
}

/**
 * To load the router from the pluginloader
 * 
 * @method loadRouter
 * 
 * @param configuration configuration for the router
 * @param callback {function} callback function
 */
PluginLoaderMain.prototype.loadRouter = function(configuration, callback){
	var instance = this;
	
//	var tmpdir = util.getServerPath("../../dev-plugins");
	
	var customplugindirs = instance.getServerInstance().getConfiguration("resources", {}).plugindir; 
		
	var plugindirs = [];
	plugindirs.push('resources/public'); // server public directory

	plugindirs.push(instance.systemuiplugindir); // ui plugins from sp
	plugindirs.push(instance.uiplugindir);
	
	plugindirs.push(instance.systemplugindir); // include system dir
	plugindirs.push(instance.plugindir);
	
	if(customplugindirs && typeof customplugindirs.length == 'number'){
		for(var i in customplugindirs){
			var customplugindir = customplugindirs[i];
			
			if(customplugindir)
				plugindirs.push(util.getServerPath(customplugindir)); //@TODO remove it from production	
		}
	}
		
	loadFromAll(instance, plugindirs, function(){
		// now check inside download dir
		if(instance.getServerInstance().getConfiguration("resources", {}).autoinstall)
			instance.autoInstall(function(error, installedplugins){
				if( installedplugins && installedplugins.length > 0 ){
					instance.loadPluginFromDirectory(instance.plugindir, instance.getConfiguration(), function(perror, pdata){
						// check for updated plugins
						getWebappuriregxp(instance); // generate the reg exp for wek apps
						
						instance.emit("router.loaded");
						
						if(callback)
							callback();	
					});
				}else {
					// check for updated plugins
					getWebappuriregxp(instance); // generate the reg exp for wek apps
					
					instance.emit("router.loaded");
					
					if(callback)
						callback();	
				}
			});
		else {
			// check for updated plugins
			getWebappuriregxp(instance); // generate the reg exp for wek apps
			
			instance.emit("router.loaded");
			
			if(callback)
				callback();	
		}
	});
}

/**
 * To get the details of a plugin
 * 
 * @method getPluginDetails
 * 
 * @param {string} pluginid id of the plugin 
 * 
 * @return {object} plugindetails object of the plugin setting
 */
PluginLoaderMain.prototype.getPluginDetails = function(pluginid, type){
	var instance = this,	
		plugindetails,
		idfield = "id";
	
	if(pluginid && pluginid.indexOf("/") == 0 && type && type == "webapp")
		idfield = 'webappuri';
	else if(pluginid && pluginid.indexOf("/") == 0 && type && type == "theme")
		idfield = 'themeuri';
	
	if(type && instance.plugins[type]) {
		plugindetails = util.getJSONObject(instance.plugins[type], idfield, pluginid);
		
		if(!plugindetails)
			plugindetails = util.getJSONObject(instance.plugins[type], idfield, pluginid + type);
		
		if(!plugindetails)
			plugindetails = util.getJSONObject(instance.plugins[type], 'pluginid', pluginid + type);
		
	} else if (type && type == 'all'){
		for(var type_ in instance.plugins){
			plugindetails = instance.getPluginDetails(pluginid, type_)
			
			if(plugindetails)
				return plugindetails;
		}
	}
	
	if(plugindetails && plugindetails.disabled)
		return null;
	else
		return plugindetails;
}

PluginLoaderMain.prototype.isPluginActive=function(webapp){
	return isPluginActive(webapp);
};

/**
 * @method getRouter
 * 
 * @param pluginid {string} plugin id
 * @param type {string} plugin type
 * @return router details
 */
PluginLoaderMain.prototype.getRouter = function(pluginid, type){
	var instance = this;

	var routerdetails;
	
	if(type && instance.plugins[type])
		routerdetails = util.getJSONObject(instance.plugins[type], 'id', pluginid);
	else if (type && type == 'all'){
		for(var type_ in instance.plugins){
			routerdetails = instance.getRouter(pluginid, type_)
			
			if(routerdetails)
				return routerdetails;
		}
	}
	
	return routerdetails;
}

/**
 * To get the details of a plugin
 * 
 * @method getPluginDetails
 * @param {string} pluginid id of the plugin 
 * @return {object} plugindetails object of the plugin setting
 */
PluginLoaderMain.prototype.updateServiceConfiguration = function(pluginid, type, configuration){
	var instance = this;
	var pluginsetting = instance.getPluginDetails(pluginid, type);
	
	if(pluginsetting){
		pluginsetting.configuration = util.extendJSON(pluginsetting.configuration, configuration);
	}
}

/**
 * To add a service name to the service confguration
 * @method addPluginService
 * 
 * @param {string} pluginid id of the plugin 
 * @param {object} service details
 */
PluginLoaderMain.prototype.addPluginService = function(pluginid, service){
	var instance = this;

	if(typeof service != "object"){
		
	}else{
		var pluginsetting = instance.getPluginDetails(pluginid, 'webapp'); //@TODO service only available for webapp
		
		if(pluginsetting){
			if(!pluginsetting.configuration)
				pluginsetting.configuration = {services:{}};
			
			// check if service has a serviceprefix
			if(service.serviceprefix)
				pluginsetting.configuration.services[service.serviceprefix + service.name]=service.configuration||{};
			else
				pluginsetting.configuration.services[service.name] = service.configuration||{};
				
			if(pluginsetting.webappsetting && pluginsetting.webappsetting.layout){
				if(!pluginsetting.webappsetting.layout.sidepanel)
					pluginsetting.webappsetting.layout.sidepanel={};
				
				var cursidepanel = pluginsetting.webappsetting.layout.sidepanel||[];
				if(typeof cursidepanel == "object" && typeof cursidepanel.length != "number"){
					cursidepanel=pluginsetting.webappsetting.layout.sidepanel=[];
				}
				
				if(!(util.jsonarraycontains(cursidepanel, 'urlRoot', service.getApiUrl()) || util.jsonarraycontains(cursidepanel, 'uri', '#'+service.getConfiguration("uri"))))
					cursidepanel.push({uri:'#'+service.getConfiguration("uri"), display:service.name, icon:"fa fa-database", urlRoot:service.getApiUrl()});
			}
			
			instance.pluginChanged(pluginid);
		} else {
			pluginsetting = instance.getPluginDetails(pluginid, 'util');
			
			if(pluginsetting) // @TODO change this if admin plugin id is changed
				instance.addPluginService("sp-admin", service);	
		}	
	}
}

/**
 * To get plugin errors
 * 
 * @method getPluginErrors
 * @param type 
 * 
 * @return return the plugins errors
 */
PluginLoaderMain.prototype.getPluginErrors = function(type){
	return this._pluginerrors;
}

/**
 * To get all the plugins registered 
 * 
 * @method getPlugins
 * @param {string} type plugin type if not mentioned complete plugins will be send 
 * 
 * @return object or array accoring to the plugin type
 */
PluginLoaderMain.prototype.getPlugins = function(type){
	var instance = this;
	
	if(type && instance.plugins[type])
		return instance.plugins[type];
	else
		return instance.plugins;
}

/**
 * To load plugin from a directory
 * 
 * @method loadPluginFromDirectory
 * @param {} plugindir Plugin directory
 * @param {} configuration
 * @param {callback} callback The callback to excecute when complete
 * @return 
 */
PluginLoaderMain.prototype.loadPluginFromDirectory=function(plugindir, configuration, callback){
	var instance = this;
	
	fs.stat(plugindir, function(error, dirstat){
		if(error){
			instance.getLogger().warn('PluginLoader:loadPluginFromDirectory', plugindir + ". folder not found.");
			callback();
		}else {
			instance.getLogger().info('PluginLoader:loadPluginFromDirectory', "loading from << " + plugindir);
			
			var pluginlist = instance.getPluginFolders(plugindir, 4),
				pluginsettinglist = []; 
			
			for(var i in pluginlist){
				var pluginsetting = pluginlist[i];
				
				pluginsetting = instance.readPluginSetting(pluginsetting, plugindir);
				
				if(!pluginsetting.installeddir)
					pluginsetting.installeddir = plugindir + '/' + pluginsetting.id;
				
				if(isPluginActive(pluginsetting))
					pluginsettinglist.push(pluginsetting);
			}
			
			pluginsettinglist = pluginsettinglist.sort(function(a, b){
				return (a.priority||0) > (b.priority||0);
			});
			
			if(pluginsettinglist && pluginsettinglist.length > 0 ){
				if(!util.arraycontains(instance.plugindirs, plugindir) && plugindir != instance.plugindir){
					instance.plugindirs.push(plugindir);
				}	
				
				loadPluginFromList(instance, pluginsettinglist, configuration, callback);
			}else
				callback();
		}	
	});
};

PluginLoaderMain.prototype.updatePluginConfiguration = function(pluginsetting, plugindir){
	var instance = this;

	if(fs.existsSync(plugindir + '/configuration.json')){
		var pluginconfiguration = util.readJSONFile(plugindir + '/configuration.json');
		
		if(pluginconfiguration){
			pluginsetting.configuration = util.extendJSON(pluginsetting.configuration||{}, pluginconfiguration);
			
			// check if configuration contains plugin settings
			if(pluginconfiguration && pluginconfiguration[ pluginsetting.plugintype + 'setting' ]){
				pluginsetting[pluginsetting.plugintype + 'setting'] = util.extendJSON({}, pluginsetting[pluginsetting.plugintype + 'setting']||{}, pluginconfiguration[pluginsetting.plugintype + 'setting']);
			}
		}
	}
}

/**
 * To read plugin settings from the plugin.json file
 * 
 * @method readPluginSetting
 * 
 * @param {} pluginsetting plugin details
 * @param {} plugindir Directry where plugin will be searched for
 * 
 * @return {object} pluginsetting parsed json data from the plugin.json file 
 */
PluginLoaderMain.prototype.readPluginSetting = function(pluginsetting, plugindir, skipalt){
	var instance = this;
	
	var deployedroot = util.getServerPath(plugindir||instance.plugindir);
	
	if(pluginsetting['public'] && instance.publicappdir)
		deployedroot = util.getServerPath(instance.publicappdir);
	
	if(pluginsetting['public'] && pluginsetting.plugintype == 'theme')
		deployedroot = deployedroot + '/themes';
	
	if(pluginsetting['public'] && pluginsetting.plugintype=='layout')
		deployedroot = deployedroot + '/layout';
	
	var deployedpath = deployedroot + '/' + pluginsetting.id;
	
	if(!fs.existsSync(deployedpath) 
			&& pluginsetting.installeddir 
			&& pluginsetting.installeddir.indexOf(plugindir) != -1) {
		deployedpath = util.getServerPath(pluginsetting.installeddir);
	}
	
	instance.getLogger().debug('PluginLoader:readPluginSetting', 'Reading ->> ' + deployedpath);

	if(fs.existsSync(deployedpath + '/plugin.json')){
		pluginsetting.installeddir = deployedpath;
		
		if(fs.existsSync(deployedpath + '/plugin.json')){
			var exisitingpluginsetting = util.readJSONFile(deployedpath + '/plugin.json');
			
			if(exisitingpluginsetting && exisitingpluginsetting.version)
				pluginsetting.curversion = exisitingpluginsetting.version;

			pluginsetting.installed = true;
			
			pluginsetting = util.extendJSON(pluginsetting, exisitingpluginsetting);
			
			if(!pluginsetting.hasOwnProperty("disabled"))
				pluginsetting.disabled = false;
			
			if(fs.existsSync(deployedpath + '/icons/plugin.png'))
				pluginsetting.icon = "/icons/plugin.png";
			
			// now we need the updated time stamp
			var stats = fs.lstatSync(deployedpath + '/plugin.json');
        	pluginsetting.mtime = stats.mtime;
		}

		if(/*!pluginsetting.pluginsubtype &&*/ pluginsetting[pluginsetting.plugintype + "setting"] && pluginsetting[pluginsetting.plugintype + "setting"][pluginsetting.plugintype +'type'])
			pluginsetting.pluginsubtype = pluginsetting[pluginsetting.plugintype + "setting"][pluginsetting.plugintype +'type'];
		
		if(pluginsetting[pluginsetting.plugintype + "setting"] && pluginsetting[pluginsetting.plugintype + "setting"][pluginsetting.plugintype +'uri'])
			pluginsetting[pluginsetting.plugintype +'uri'] = pluginsetting[pluginsetting.plugintype + "setting"][pluginsetting.plugintype +'uri'];
		
		else if(pluginsetting[pluginsetting.plugintype + "setting"] && pluginsetting[pluginsetting.plugintype +'uri'] && !pluginsetting[pluginsetting.plugintype + "setting"][pluginsetting.plugintype +'uri'])
			pluginsetting[pluginsetting.plugintype + "setting"][pluginsetting.plugintype +'uri'] = pluginsetting[pluginsetting.plugintype +'uri'];
		
		var plugintemplatedir;
		if(pluginsetting.plugintype)
			plugintemplatedir = instance.templatedir + "/" + pluginsetting.plugintype;
		
		if(plugintemplatedir && fs.existsSync(plugintemplatedir + '/plugin.json')){
			var defaultpluginsettings = util.readJSONFile(plugintemplatedir + '/plugin.json');

			pluginsetting = util.extendJSON(defaultpluginsettings, pluginsetting);
		}
		
		if(pluginsetting.pluginsubtype && plugintemplatedir){
			plugintemplatedir = plugintemplatedir + "/" + pluginsetting.pluginsubtype;
			
			if(plugintemplatedir && fs.existsSync(plugintemplatedir + '/plugin.json')){
				var defaultpluginsettings = util.readJSONFile(plugintemplatedir + '/plugin.json');
				
				pluginsetting = util.extendJSON(defaultpluginsettings, pluginsetting);
			}
		}
	}else{
		pluginsetting.installed=false;
		
		delete pluginsetting.installeddir;
		delete pluginsetting.missingdependencies;
	}
	
	updatePluginTypesetting(pluginsetting);
	
	return pluginsetting;
}

/**
 * To load a plugin based on the pluginsetting provided
 * 
 * @method loadPlugin
 * 
 * @param {} pluginsetting plugin settings
 * @param {callback} callback The callback to excecute when complete
 */
PluginLoaderMain.prototype.loadPlugin = function(pluginsetting, callback){
	var instance = this;
	
	instance.getLogger().debug('PluginLoader:loadPlugin', pluginsetting.installeddir);
	
	instance.readPluginSetting(pluginsetting);
	
	__loadPlugin(instance, pluginsetting, pluginsetting.configuration, instance.dbInstance, callback);
}

/**
 * To unload a plugin from the `simpleportal.Server`
 * 
 * @method unLoadPlugins
 * @param {} configuration plugin configuration
 * @param {callback} callback The callback to excecute when complete
 */
PluginLoaderMain.prototype.unLoadPlugins = function(configuration, callback){
	var instance = this;

	var plugindir = configuration&&configuration.plugindir ?  configuration.plugindir : instance.plugindir;
	
	instance.getLogger().info('Pluginloader:unLoadPlugins', plugindir);
	
	var errors = [];
	if(!fs.existsSync(plugindir))
		callback();
	else{
		var stats = fs.lstatSync(plugindir);
		
		if (stats.isDirectory()) {
			instance.__unLoadPlugins(plugindir, {}, function(error){
				if(error)
					errors.push(error);
				
				if(callback)
					callback(errors);
			});
		}else if(callback)
			callback();
	}
}

PluginLoaderMain.prototype.hasPluginChanged = function(pluginid){
	var instance = this;

	return (instance.changedplugins[pluginid]);
}

PluginLoaderMain.prototype.removePluginChanged = function(pluginid){
	var instance = this;

	delete instance.changedplugins[pluginid];// do nothing
}

PluginLoaderMain.prototype.pluginChanged = function(pluginid, silent){
	var instance = this;
	if(instance.changedplugins[pluginid]){}// do nothing
	else{
		if(!silent)
			instance.emit("change", pluginid);
		
		// check if plugin preference is changed then temp files need to be removed.
		var plugindetails = instance.getPluginDetails(pluginid, 'all');
		
		if(plugindetails && plugindetails.preference){
//			if(fs.existsSync(instance.getTempPath(plugindetails, "js/appconfig.js")))
//				fs.unlinkSync(instance.getTempPath(plugindetails, "js/appconfig.js"));
//			
//			if(fs.existsSync(instance.getTempPath(plugindetails, "js/app.js")))
//				fs.unlinkSync(instance.getTempPath(plugindetails, "js/app.js"));
//			
//			// let us clean up app.css file also
//			var themepath; 
//			if(plugindetails && plugindetails.webappsetting && plugindetails.webappsetting.theme)
//				themepath = instance.getTempPath(plugindetails, plugindetails.webappsetting.theme);
//			
//			if(themepath && fs.existsSync(themepath + "/app.css")){
//				fs.unlinkSync(themepath + "/app.css");
//			}
			clearControlFiles(instance, plugindetails);
		}
		
		instance.changedplugins[pluginid]=true;
	}	
}

PluginLoaderMain.prototype.autoInstall = function(callback){
	var instance = this;
	
	var resourcedownloaddir = instance.getServerInstance().getDataDirectory(instance.getServerInstance().getConfiguration("resources").downloaddir || 'downloads');
	
	fs.stat(resourcedownloaddir, function(error, stats){
		if(error)
			callback(error);
		else{
			util.getResources(
				[resourcedownloaddir + '/plugin/'],
				{
					root:(resourcedownloaddir + '/plugin/'),
					extensoin:'tar.gz',
					excludeDir:true
				}, 
				function(error, plugindownloads){
					if(plugindownloads && plugindownloads.length > 0 )
						instance.install(plugindownloads, function(error, installinfo){
							callback(error, installinfo);
						});
					else
						callback();
				},[]
			);
		}
	});
}

/**
 * To upload the plugin
 */
PluginLoaderMain.prototype.upload = function(props, callback){
	var instance = this;

	_uploadPlugin(instance, props, callback);
}

/**
 * To install the plugin uploaded using tar gz file.
 */
PluginLoaderMain.prototype.install = function(props, callback){
	var instance = this;

	var downloaddir = instance.getServerInstance().getDataDirectory(instance.getServerInstance().getConfiguration("resources").downloaddir||'._downloads', 'plugin');
	
	if(downloaddir) {
		util.checkDirSync(downloaddir);
		
		var installinfo = [];
		if(typeof props == "object" && typeof props.length == "number"){
			var cbcount = 0;
			for(var i in props){
				instance.install(props[i], function(error, installdata){
					if(installdata)
						installinfo.push(installdata);
					
					if(cbcount ++ == props.length -1)
						if(callback)callback(null, installinfo);
				});
			}
		} else if(props.file && (/\.gz/).test(props.file)){
			var filename = props.name||props.file; 
			
			var proposedpluginname = filename.replace(".tar.gz", "").replace(".gz", "");
			
			Resourceinstaller.unzipFile(downloaddir, props.file, proposedpluginname, function(error, result){
				if(result && result.destfile){
					if(fs.existsSync(result.destfile + "/plugin.json")) {
						_installPlugin(instance, result, function(error, installdata){
							if(!error){
								util.deleteFolderRecursiveSync(result.destfile);
								
								// also delete the zip file
								if(fs.existsSync(props.file))
									fs.unlinkSync(props.file);
								
								if(installdata && installdata.resourcebundle)
									if(fs.existsSync(installdata.resourcebundle))
										fs.unlinkSync(installdata.resourcebundle);
								
								 // installed plugin
								instance.emit("installed", installdata);
							}
							
							if(callback)callback(error, installdata);
						})
					}else{
						util.getResources(
								[result.destfile],
								{
//									root:(result.destfile),
									filename:'(webapp|theme).tar.gz',
									excludeDir:true
								}, function(error, webapps){
									if(webapps && webapps.length > 0){
										var webapp = webapps[0];
										var filename = webapp.file.replace("/", "");
										
										Resourceinstaller.unzipFile(result.destfile, filename, proposedpluginname, function(webapperror, webappresult){
											if(webappresult)
												try{
													_installPlugin(instance, webappresult, function(error, installdata){
														if(!error){
															util.deleteFolderRecursiveSync(result.destfile);
															
															// also delete the zip file
															if(fs.existsSync(props.file))
																fs.unlinkSync(props.file);
															
															 // installed plugin
															instance.emit("installed", installdata);
														}
														
														if(callback)callback(error, installdata);
													})
												}catch(error){
													instance.getLogger().error(instance.routerid + ":install", error);
													
													if(callback)callback(error);
												}
											else
												if(callback)callback(webapperror);
										});
									}else if(callback)callback("No valid sub directory with plugin configuration found while installing.");
								},[]	
							);	
					}
				}else
					callback(error, result)
			});
		}else 
			callback("Invalid archive configuration for installing to the db.")
	} else
		callback("No download directory configured for the server to uplaod the plugin.");
}

/**
 * To uninstall the plugin 
 */
PluginLoaderMain.prototype.uninstall = function(props, callback){
	var instance = this;
	
	_uninstallPlugin(instance, props, function(error, data){
		if(!error){
			var plugindata = instance.getPluginDetails(props.id, "webapp");
			
			if(plugindata)
				plugindata.installed = false;
		}	
		callback(error, data)
	});
}

PluginLoaderMain.prototype.getTemplateConfig = function(key){
	var instance = this;
	
	var templateconfig = {
		templatedir:instance.templatedir,
		layoutdir:instance.layoutdir,
		templateextension:'.ejs',
		layoutextension:".html.ejs"
	};
	
	if(!key)
		return templateconfig;
	else if(key && instance[key])
		return instance[key];
	else if(key && templateconfig[key])
		return templateconfig[key];
	else
		return null;
}

var _uploadPlugin = function (instance, pluginconfig, callback){
//	var uploaddir = instance.getServerInstance().getConfiguration("resources").uploaddir;
	var uploaddir = instance.getServerInstance().getDataDirectory(instance.getServerInstance().getConfiguration("resources").uploaddir||'uploads');
	if(uploaddir){
		util.checkDirSync(uploaddir);
		
		fs.link(pluginconfig.file, util.appendFilePath(uploaddir, pluginconfig.name), function(error, info){
			if(!error){
				pluginconfig.file = util.appendFilePath(uploaddir, pluginconfig.name);
				
				instance.install(pluginconfig, callback);
			}else
				callback(error);
		});
	}else
		callback("No uploaddir configured for the server to uplaod the plugin.");
}

var _uninstallPlugin = function(instance, pluginresult, callback){
	// Only allow installed plugin no system plugin should be allowd to uninstall
	if(pluginresult.installeddir.indexOf(util.getServerPath("resources/plugin")) == -1)
		callback("Only user installed plugin is allowed to uninstall.")
	else if(pluginresult.installed) {
		util.deleteFolderRecursive(pluginresult.installeddir, callback);
	}else{
		callback('Plugin not found to uninstall!! - '+ pluginsettings.id);
	}
}

/**
 * To install a plugin
 * 
 * @method _installPlugin
 * @param instance  plugin loader instance
 * @param pluginresult Plugin folder where plugin.json is defined
 * 
 * @param {callback} callback The callback to excecute when complete
 */
var _installPlugin = function(instance, pluginresult, callback){
	var pluginsetting = require(pluginresult.destfile + "/plugin.json");
	
	var savedplugin = instance.getPluginDetails(pluginsetting.id, pluginsetting.plugintype);
	
	if(savedplugin && savedplugin.installed) {
		var curversion = Number(savedplugin.version);
		var newversion = Number(pluginsetting.version);
		
		if(newversion == curversion){
			instance.getLogger().warn(instance.routerid + ":_installPlugin", savedplugin.id + ' is already installed with the version - ' +  savedplugin.version);
			
			callback('Plugin is already installed with the version - ' +  savedplugin.version, null);
		} else if(newversion > curversion){
			instance.checkDependencies(pluginsetting, function(error){
				if(error)
					callback(error, null);
				else{
					_movePlugin(instance, pluginresult, callback);
				}
			});
		} else
			callback('You are trying to install an older version !! - ' + pluginsetting.version + ' >> ' + savedplugin.version, null);
	}else {
		_movePlugin(instance, pluginresult, callback);
	}
}

/**
 * To update a plugin 
 * 
 *@method _installPlugin
 * @param instance  plugin loader instance
 * @param pluginresult Plugin folder where plugin.json is defined
 */
var _movePlugin = function (instance, pluginresult, callback){
	var pluginsetting = require(pluginresult.destfile + "/plugin.json");
	
	// let us check it is public or not
	var deploydir = util.getServerPath(instance.plugindir);
	if(pluginsetting.plugintype == "uiplugin"){
		deploydir = util.getServerPath(instance.uiplugindir);
	} else if(pluginsetting.hasOwnProperty("public") && pluginsetting["public"]){
		deploydir = util.getServerPath(instance.publicappdir);
		
		if(pluginsetting["plugintype"] == "theme")
			deploydir = util.appendFilePath(deploydir, "themes");
	}
		
	var deploydestdir = util.appendFilePath(deploydir, pluginsetting.id);
	
	instance.getLogger().info(instance.routerid + ":_movePlugin", pluginresult.destfile + " >> " + deploydestdir);
	_copyRecursiveSync(pluginresult.destfile, deploydestdir, function(error, copyinfo){
		if(!error){
			util.deleteFolderRecursiveSync(pluginresult.destfile);
			
			var installinfo = {
				id:pluginsetting.id,
				installeddir:deploydestdir, 
				plugindir:deploydestdir
			};
			
			//instance.emit("load.router", installinfo);
					
			callback(null, installinfo);
		}else
			callback(error, copyinfo);
	});
};


/**
 * To copy files recursively
 * 
 * @method _copyRecursiveSync
 * 
 * @param {} src Source directory
 * @param {} dest Destination directory
 */
var _copyRecursiveSync = function(src, dest, callback) {
	var stats = fs.statSync(src);

	var isDirectory = stats.isDirectory();
	
	if (isDirectory) {
		util.checkDirSync(dest);
		
		fs.readdirSync(src).forEach(
			function(childItemName) {
				_copyRecursiveSync(path.join(src, childItemName), 
					path.join(dest, childItemName));
			}
		);
	} else {
		if(fs.existsSync(dest))
			fs.unlinkSync(dest);
		
		fs.linkSync(src, dest);
	}
	
	if(callback)
		callback(null);
};

var collectDependencies = function(id, object, dependencies){
	dependencies = dependencies||[];
	
	if(object && object.dependencies && object.dependencies.length > 0)
		object.dependencies.forEach(function(typedep){
			var depid = typedep;
			if(typedep.indexOf("@") != -1)
				depid = typedep.substring(0, typedep.indexOf("@"));
			
			if(depid && depid != id && dependencies.indexOf(depid) == -1)
				dependencies.push(depid)
		});
	
	return dependencies
}
/**
 * To check dependencies for a plugin
 * 
 * @method checkDependencies
 * 
 * @param {} pluginsettings
 * @param {callback} callback The callback to excecute when complete
 */
PluginLoaderMain.prototype.checkDependencies = function (pluginsetting, callback){
	if(!pluginsetting)
		callback();
	else {
		var instance = this, 
			missingdependencies = false, 
			missingresources = false,
			dependencies = [];

		// now check the type setting
		if(pluginsetting[pluginsetting.plugintype +"setting"] && pluginsetting[pluginsetting.plugintype +"setting"].dependencies)
			collectDependencies(pluginsetting.id, pluginsetting[pluginsetting.plugintype +"setting"], dependencies);
		
		// now check the type setting
		if(pluginsetting[pluginsetting.plugintype +"setting"] 
			&& pluginsetting[pluginsetting.plugintype +"setting"].mobilesetting)
			collectDependencies(pluginsetting.id, pluginsetting[pluginsetting.plugintype +"setting"].mobilesetting, dependencies);
		
		// check for dependencies
		collectDependencies(pluginsetting.id, pluginsetting, dependencies);
		
		if(dependencies && dependencies.length > 0){
			for(var index in dependencies){
				var dependappid = dependencies[index],
					missing = true;
	
				var setting_ = instance.getPluginDetails(dependappid, 'all');
				
				if(setting_ && setting_.installed && !setting_.disabled)
					missing = false;
				
				if(missing){
					pluginsetting.missingdependencies = pluginsetting.missingdependencies||[];
					
					missingdependencies = true;
					pluginsetting.missingdependencies.push(dependappid);
				}
			}
		}else
			pluginsetting.missingdependencies = [];
			
		if(pluginsetting.missingdependencies && pluginsetting.missingdependencies.length > 0){
			if(!missingdependencies)
				pluginsetting.missingdependencies = [];
			else
				instance.getLogger().error(instance.routerid + ":checkDependencies", pluginsetting.id + " require "+ JSON.stringify(pluginsetting.missingdependencies) +" modules to be installed.");
			
			if(!instance._pluginerrors[pluginsetting.id])
				instance._pluginerrors[pluginsetting.id] = {};
			
			instance._pluginerrors[pluginsetting.id]["missingdependencies"] = pluginsetting.missingdependencies;
		} else if(!missingdependencies)
			pluginsetting.missingdependencies = [];
		
		// check for npm dependencies
		/**
		 * Please confirm all dependant nom modules are installed!!
		 */
		if(pluginsetting && !pluginsetting.disabled && pluginsetting.npmdependencies && Object.keys(pluginsetting.npmdependencies).length > 0){
			// check you have 
			var missingnpmdependencies = false;
			for(var npmmindex in pluginsetting.npmdependencies){
				var npmmodule = pluginsetting.npmdependencies[npmmindex]||npmmindex;
				
				if(!util.checkNodeModule(npmmodule)){
					pluginsetting.missingnpmdependencies = pluginsetting.missingnpmdependencies||[];
					
					pluginsetting.missingnpmdependencies.push(npmmodule);
					missingnpmdependencies = true;
				}
			}
			
			if(pluginsetting.missingnpmdependencies && pluginsetting.missingnpmdependencies.length > 0){
				if(!instance._pluginerrors[pluginsetting.id])
					instance._pluginerrors[pluginsetting.id] = {};
				
				instance._pluginerrors[pluginsetting.id]["missingnpmdependencies"] = pluginsetting.missingnpmdependencies;
				
				instance.getLogger().error(instance.routerid + ":readPluginSetting", pluginsetting.installeddir  +"::"+ pluginsetting.id + " require "+ JSON.stringify(pluginsetting.missingnpmdependencies) +" modules to be installed.");
			} else if(!missingnpmdependencies)
				pluginsetting.missingnpmdependencies = [];
		}
		
		// now check whether you have all resources meniotned installed in the folders
		/**
		 * Please confirm all dependant npm modules are installed!!
		 */
		if(pluginsetting && pluginsetting.plugintype == "webapp" 
			&& !pluginsetting.disabled 
			&& pluginsetting.resources && Object.keys(pluginsetting.resources).length > 0){
			// check you have
			for(var rindex in pluginsetting.resources) {
				var webresource = pluginsetting.resources[rindex];
				
				var resourcepath = getDependantResourcePath(instance, pluginsetting, webresource);
				if(!fs.existsSync(resourcepath)){
					missingresources = true;
					if(!pluginsetting.missingresources) pluginsetting.missingresources= [];
					
					pluginsetting.missingresources.push(webresource.resourcename);
				} else
					webresource.mtime = fs.statSync(resourcepath).mtime;
			}
			
			if(pluginsetting.missingresources && pluginsetting.missingresources.length > 0){
				if(!instance._pluginerrors[pluginsetting.id])
					instance._pluginerrors[pluginsetting.id] = {};
				
				instance._pluginerrors[pluginsetting.id]["missingresources"] = pluginsetting.missingresources;
	
				instance.getLogger().error(instance.routerid + ":readPluginSetting", pluginsetting.installeddir  +"::"+ pluginsetting.id + " require "+ JSON.stringify(pluginsetting.missingresources) +" resources to be installed.");
			}else if(!missingresources)
				pluginsetting.missingresources = [];
		}
		
		callback(null, pluginsetting)	
	}
}

function getDependantResourcePath(instance, pluginsetting, webresource){
	if(pluginsetting.plugintype == 'uiplugin')
		return util.appendFilePath(pluginsetting.installeddir, webresource.resourcefolder, webresource.resourcename);
	else { // dependencies must be installed in data directory of the server.
		return instance.getDataDirectory(pluginsetting, webresource.resourcefolder, webresource.resourcename);
	}
	
	return webresource.resourcefolder;
}

/**
 * To get the temporary path for a plugin
 * @method getTempPath
 * 
 * @param pluginsetting plugin for which the temporary path is requesting
 * @param file a file inside the temporary path
 * 
 */
PluginLoaderMain.prototype.getTempPath = function(pluginsetting, file, file1){
	var instance = this,
		tmp_path = instance.getServerInstance().getConfiguration("resources").tempdir || "._tmp";

//	var uploaddir = instance.getServerInstance().getDataDirectory(instance.getServerInstance().getConfiguration("resources").uploaddir||'uploads');
//	tmp_path = util.getServerPath(tmp_path);
	if(pluginsetting && pluginsetting.plugintype == "theme") {
		if(pluginsetting.themeuri && pluginsetting.themeuri.indexOf("/mobile") > 0)
			tmp_path = util.appendFilePath(tmp_path, "theme", pluginsetting.id + "/mobile", file, file1);
		else
			tmp_path = util.appendFilePath(tmp_path, "theme", pluginsetting.id, file, file1);
	} else if(pluginsetting && pluginsetting.id)
		tmp_path = util.appendFilePath(tmp_path, pluginsetting.id, file, file1);
	else
		tmp_path = util.appendFilePath(tmp_path, file, file1);
	
	return util.getServerPath(tmp_path);
}

/**
 * To write a file in to the temporary directory of a plugin
 * @method writeTempFileSync
 * 
 * @param pluginsetting plugin for which the temporary path is requesting
 * @param file to be written in to the temporary path, a relative path inculdung the subdirectory
 * @param filecontent a file inside the temporary path
 * 
 */
PluginLoaderMain.prototype.writeTempFileSync = function(pluginsetting, file, filecontent){
	var instance = this;
	
//	var tmp_path = instance.getServerInstance().getConfiguration("resources").tempdir || "._tmp";
//	tmp_path = util.getServerPath(tmp_path);
	var tmp_path = instance.getServerInstance().getDataDirectory(instance.getServerInstance().getConfiguration("resources").tempdir||'._tmp');
	var plugin_tmp_path = util.appendFilePath(tmp_path, pluginsetting.id);
	
	if(file && filecontent){
		// let us get the sub folder and create the directory
		var resourcepath = util.appendFilePath(plugin_tmp_path, file);
		var resourcedir = resourcepath.substring(0, resourcepath.lastIndexOf("/"));
		
		util.checkDirSync(resourcedir);
		
		fs.writeFileSync(resourcepath, filecontent);
	}else
		throw new Error("Missing required parameter to save file in to plugin temporary folder.");
}

PluginLoaderMain.prototype.backup = function(props, callback){
	var instance = this;

	if(props.pluginid){
		var pluginsetting = instance.getPluginDetails(props.id||props.pluginid, "all");
		
		instance.getLogger().info("taking backup of pluginid - " + props.pluginid);
		
		if(pluginsetting){
			var backupath = props.backupath||util.getServerPath('./dump/plugin');
			
			util.checkDirSync(backupath);
			
			var pluginbackupath = backupath + '/' +pluginsetting.id;
			
			var servicesbackedup=0;
			
			if(props.hasOwnProperty("staticfiles") || (pluginsetting.plugintype != "webapp")){
				util.checkDirSync(pluginbackupath);
				
				util.archiveFolder({rootdir:pluginsetting.installeddir, archive:pluginbackupath + '/'+ pluginsetting.plugintype + '.tar.gz'}, function(error, data, data1){
					if(!error)
						util.archiveFolder({deleteFolder:true, rootdir:pluginbackupath, archive:pluginbackupath+ "-"+pluginsetting.plugintype+"-" + pluginsetting.version + '.tar.gz'}, function(error, data, data1){
							// let us fire plugin backup event
							if(!props.disableNotification)
								instance.emit('plugin.backup', {plugin:props.pluginid, error:error, pluginmodel:{zip_archive:{file:pluginsetting.id+ "-" + pluginsetting.version + '.tar.gz', fullpath:pluginbackupath+ "-" + pluginsetting.version + '.tar.gz'}}});
							
							callback(error, data);
						});
					else{
						instance.getLogger().error(instance.routerid + ":backup", error);
						callback(error);
					}
				});
			}else
				archiveDependentantPlugins(instance, pluginsetting.dependencies, pluginbackupath, function(){
					archiveServices(instance, pluginsetting, pluginbackupath, function(error, data){
						
						util.archiveFolder({rootdir:pluginsetting.installeddir, archive:pluginbackupath + '/'+pluginsetting.plugintype+ '/.tar.gz'}, function(error, data, data1){
							util.archiveFolder({deleteFolder:true, rootdir:pluginbackupath, archive:pluginbackupath+ "-" + pluginsetting.version + '.tar.gz'}, function(error, data, data1){
								// let us fire plugin backup event
								if(!props.disableNotification)
									instance.emit('plugin.backup', {plugin:props.pluginid, error:error, pluginmodel:{zip_archive:{file:pluginsetting.id+ "-" + pluginsetting.version + '.tar.gz', fullpath:pluginbackupath+ "-" + pluginsetting.version + '.tar.gz'}}});
								
								callback(error, data);
							});
						});
					});
				});
		}else
			callback("Not able to fond the " + props.pluginid +" installed.")
	}else
		callback("No plugin provided!");
}
/**
 * To unload plugins from a directory
 * 
 * @method unLoadPluginFromDirectory
 * 
 * @param {} plugindir
 * @param {} configuration
 * @param {callback} callback The callback to excecute when complete
 */
PluginLoaderMain.prototype.unLoadPluginFromDirectory=function(plugindir, configuration, callback){
	var instance = this;

	instance.getLogger().debug('PluginLoader : unLoadPluginFromDirectory', plugindir);
	
	if(!fs.existsSync(plugindir))
		callback();
	else{
		var pluginlist = [];
		var pluginsettinglist = []; 
		
		fs.readdirSync(plugindir).forEach(function(filename){
			if(!/\.$/.test(filename)){
				pluginlist.push({installeddir:plugindir+ '/' + filename, id:filename});
			}
		});
		
		for(var i in pluginlist){
			var pluginsetting = pluginlist[i];
			
			pluginsetting = instance.readPluginSetting(pluginsetting, plugindir);
			
			if(isPluginActive(pluginsetting))
				pluginsettinglist.push(pluginsetting);
		}
		
		loadPluginFromList(instance, pluginsettinglist, configuration, callback);
	}
};

/**
 * To get all the plugins in the folder, deep search
 * 
 * @method getPluginFolders
 * @param plugindir Directory where plugins will be searched for
 * 
 * @return array of plugin folders
 */
PluginLoaderMain.prototype.getPluginFolders=function(plugindir, deepindex, cndeepindex){
	var instance = this;

	var pluginlist = [],
		cndeepindex=cndeepindex||0;
	
	if(fs.existsSync(plugindir+ '/plugin.json')){
		var filename = plugindir.substring(plugindir.lastIndexOf("/")); 
		
		pluginlist.push({installeddir:plugindir, id:filename})
	}else if (fs.existsSync(plugindir)){
		var subfolders = fs.readdirSync(plugindir).filter(function(v){
	    	return !/^\./.test(v) && fs.statSync(path.join(plugindir, v)).isDirectory();
	    });
	    
	    subfolders.forEach(function(filename) {
	        var file = plugindir + '/' + filename;
	        
	        if (fs.existsSync(file + '/plugin.json')){
	        	pluginlist.push({installeddir:file, id:filename})
	        	//pluginlist.push(file);
	        } else if (!util.jsonarraycontains(pluginlist, 'installeddir', file) && deepindex > cndeepindex){
	        	//pluginlist = pluginlist.concat(PluginLoader.getPluginFolders(file, 1));
	        	pluginlist= pluginlist.concat(instance.getPluginFolders(file, cndeepindex++));
	        }
	    });
	}
    
    return pluginlist;
};

/**
 * To get the ui plugin path 
 * @param subpath {string} sub path noramlly the plugin id
 * @return  {string} absolute file path.
 */
PluginLoaderMain.prototype.getUIPluginPath=function(subpath){
	var instance = this;
	
	if(subpath)
		return util.appendFilePath(util.getServerPath(instance.uiplugindir), subpath);
	
	else return util.getServerPath(instance.uiplugindir);
		
}

PluginLoaderMain.prototype.getHtmlDirectory = function(uri, pluginsetting){
	var instance = this;
	var resourceabspath = null;
	
	var pluginuri;
	
	if(pluginsetting && pluginsetting.plugintype == 'theme' && uri.indexOf('/theme' + pluginsetting.themeuri) == 0){
		resourceabspath = uri.replace('/theme' + pluginsetting.themeuri, pluginsetting.installeddir);

		if(!fs.existsSync(resourceabspath))
			resourceabspath = instance.getTempPath(pluginsetting, resourcepath);
	}else{
		if(uri && uri.indexOf("/") == 0)
			pluginuri = uri.substring(1, uri.substring(1).indexOf("/")+1);
//		else if(uri && uri.indexOf("/") != -1)
//			pluginuri = uri.substring(0, uri.substring(1).indexOf("/"));
		
		var plugindetailes;
		if(pluginuri) {
			var resourcepath = uri.substring(uri.substring(1).indexOf(pluginuri) + pluginuri.length+1);
			
			if(pluginuri == 'uiplugin'){
				return instance.uiplugindir + resourcepath;
			}else{
				plugindetailes = instance.getPluginDetails(pluginuri, 'all');
			}
		}
		
		if(!plugindetailes && pluginsetting){
			resourcepath = uri;
			plugindetailes = pluginsetting;
		}
		
		if(plugindetailes){
			if(plugindetailes.plugintype == "webapp")
				resourceabspath = util.appendFilePath(plugindetailes.installeddir, 'html5', resourcepath);
			else
				resourceabspath = util.appendFilePath(plugindetailes.installeddir, resourcepath);
			
			if(!fs.existsSync(resourceabspath))
				resourceabspath = instance.getTempPath(plugindetailes, resourcepath);
			
			if(!fs.existsSync(resourceabspath) && plugindetailes["public"])
				resourceabspath = util.appendFilePath(instance.publicappdir, plugindetailes.id, resourcepath);
			
			if(!fs.existsSync(resourceabspath) && plugindetailes["public"])
				resourceabspath = util.appendFilePath(instance.systempublicappdir, plugindetailes.id, resourcepath);
		}
	}
	
	return resourceabspath;
}

/**
 * To get the data directry for a plugin
 * 
 * @method  getDataDirectory
 * 
 * @param pluginsetting {object} plugin setting with minimum of id
 * @param subpath sub directories
 * 
 */
PluginLoaderMain.prototype.getDataDirectory=function(pluginsetting, subpath1, subpath2, subpath3, subpath4){
	var instance = this;
	
	return instance.getServerInstance().getDataDirectory(pluginsetting.plugintype||'', pluginsetting.id, subpath1, subpath2, subpath3, subpath4);
}


/**
 * To get the plugin specific preference details
 * @method setPreference
 * @param pluginsetting {object} plugin setting with minimum of id
 */
PluginLoaderMain.prototype.setPreference = function(pluginsetting, newpreference){
	var instance = this;
	
	if(pluginsetting && pluginsetting.id){
		// collect all api service preference and send it back.
		var plugindetails = instance.getPluginDetails(pluginsetting.id, pluginsetting.plugintype||'all'),
			preference = simpleportal.util.extendJSON({}, PluginLoaderMain.DEFAULT_PROPS);
		
		if(plugindetails && plugindetails.preferencesetting){
			preference = simpleportal.util.extendJSON(preference, plugindetails.preferencesetting);
		}
		
		if(plugindetails && plugindetails.preference){
			preference = simpleportal.util.extendJSON(preference, plugindetails.preference);
		}
		
		if(newpreference && typeof newpreference == "object")
			preference = simpleportal.util.extendJSON(preference, newpreference);
		
		// let us set the service prefernce from the server instance
		var serverPreference = instance.getServerInstance().getConfiguration("preference");
		if(serverPreference && serverPreference["plugin"])
			serverPreference = serverPreference["plugin"];
		
		if(serverPreference && serverPreference[pluginsetting.id]){
			// set in to the preference.
			preference = simpleportal.util.extendJSON(preference, serverPreference[pluginsetting.id]);
			
			// should remove unwanted array object from the preference usin prefernce setting
			if(plugindetails && plugindetails.preferencesetting)
				for(var i in plugindetails.preferencesetting){
					if(typeof plugindetails.preferencesetting[i] == 'object' && typeof plugindetails.preferencesetting[i].length == 'number'){
						if(preference[i] && preference[i].length > plugindetails.preferencesetting[i].length){
							preference[i].splice(0, plugindetails.preferencesetting[i].length);
						}
					}
				}
		}
		
		if(plugindetails && plugindetails.configuration && plugindetails.configuration.services)
			for(var i in plugindetails.configuration.services){
				var serviceInstance = instance.getServiceloader().getService(i, {plugin:pluginsetting.id});
				
				if(serviceInstance && serviceInstance.getPreference) {
					var servicePreference = serviceInstance.getPreference();
					
					if(servicePreference && Object.keys(servicePreference).length > 0)
						preference[serviceInstance.name] = servicePreference;
				}
			}
		
		if(plugindetails && plugindetails.configuration && plugindetails.configuration.startups)
			for(var i in plugindetails.configuration.startups){
				var startupInstance = instance.getStartuploader().getRouter(i, {plugin:plugindetails.id});
				
				if(startupInstance && startupInstance.getPreference) {
					var startupPreference = startupInstance.getPreference();
					
					if(startupPreference && Object.keys(startupPreference).length > 0)
						preference[startupInstance.name] = startupPreference;
				}
			}
		
		// do cleanup
		if(plugindetails && newpreference && newpreference.minified)
			clearControlFiles(instance, plugindetails);
			
		if(plugindetails)
			plugindetails.preference = preference;
	}
}

/**
 * To get the plugin specific preference details
 * @method getPreference
 * @param pluginsetting {object} plugin setting with minimum of id
 */
PluginLoaderMain.prototype.getPreferenceSetting = function(pluginsetting, preferencekey, defaultvalue){
	var instance = this;
	
	var preferencesetting = {};
	
	if(pluginsetting && pluginsetting.id){
		// collect all api service preference and send it back.
		var plugindetails = instance.getPluginDetails(pluginsetting.id, pluginsetting.plugintype||'all');
		
		if(plugindetails && plugindetails.plugintype != "uiplugin" ) 
			preferencesetting = simpleportal.util.extendJSON({}, PluginLoaderMain.DEFAULT_PROPS);

		if(plugindetails && plugindetails.preferencesetting){
			preferencesetting = simpleportal.util.extendJSON(preferencesetting, plugindetails.preferencesetting);
		}

		var preference = instance.getPreference(pluginsetting);
		if(preference)
			for(var i in preferencesetting) {
				if(preference.hasOwnProperty(i))
					if(typeof preference[i] == "object" && typeof preference[i].length !== "number")
						preferencesetting[i] = simpleportal.util.extendJSON(preferencesetting[i], preference[i]);
					else
						preferencesetting[i] = preference[i];
			}
		
		if(plugindetails && plugindetails.configuration && plugindetails.configuration.services)
			for(var i in plugindetails.configuration.services){
				var serviceInstance = instance.getServiceloader().getService(i, {plugin:plugindetails.id});
				
				if(serviceInstance){
					var servicePreference = serviceInstance.getPreferenceSetting();
					
					if(servicePreference && Object.keys(servicePreference).length > 0)
						preferencesetting[serviceInstance.name] = servicePreference;
				}
			}
		
		if(plugindetails && plugindetails.configuration && plugindetails.configuration.startups)
			for(var i in plugindetails.configuration.startups){
				var startupInstance = instance.getStartuploader().getRouter(i, {plugin:plugindetails.id});
				
				if(startupInstance){
					var startupPreference = startupInstance.getPreferenceSetting();
					
					if(startupPreference && Object.keys(startupPreference).length > 0)
						preferencesetting[startupInstance.name] = startupPreference;
				}
			}
	}
	
	if(preferencekey)
		return preferencesetting[preferencekey]||defaultvalue;
	
	return preferencesetting;
}

/**
 * To get the plugin specific preference details
 * @method getPreference
 * @param pluginsetting {object} plugin setting with minimum of id
 */
PluginLoaderMain.prototype.getPreference = function(pluginsetting, preferencekey, defaultvalue){
	var instance = this;
	
	var preference = {};
	
	if(pluginsetting && pluginsetting.id){
		// collect all api service preference and send it back.
		var plugindetailes = instance.getPluginDetails(pluginsetting.id, pluginsetting.plugintype);
		
		if(plugindetailes)
			preference = plugindetailes.preference;
		
		if(plugindetailes && plugindetailes.configuration && plugindetailes.configuration.services)
			for(var i in plugindetailes.configuration.services){
				var serviceInstance = instance.getServiceloader().getService(i, {plugin:pluginsetting.id});
				
				if(serviceInstance) {
					var servicePreference = serviceInstance.getPreference();
					
					if(servicePreference && Object.keys(servicePreference).length > 0)
						preference[serviceInstance.name] = servicePreference;
				}
			}
		
		if(plugindetailes && plugindetailes.configuration && plugindetailes.configuration.startups)
			for(var i in plugindetailes.configuration.startups){
				var startupInstance = instance.getStartuploader().getRouter(i, {plugin:plugindetailes.id});
				
				if(startupInstance){
					var startupPreference = startupInstance.getPreference();
					
					if(startupPreference && Object.keys(startupPreference).length > 0)
						preference[startupInstance.name] = startupPreference;
				}
			}
	}
	
	if(preferencekey)
		return preference[preferencekey]||defaultvalue;
	
	return preference;
}

PluginLoaderMain.DEFAULT_PROPS={
	disabled:false,
	priority:100
};


/**
 * To get the webapp regular expression for webapp filer
 * 
 */
var getWebappuriregxp = function (instance){
	if(instance.webappuriregxp)
		return instance.webappuriregxp;
	else{
		var webappuris = instance.webappuris;
		var pattern = '';
		
		if(webappuris){
			for(var i in webappuris){
				if(pattern.length != 0)
					pattern += '|';
				
				if(webappuris[i].indexOf('/') == 0)
					pattern += webappuris[i];
				else
					pattern += '/' + webappuris[i];
			}
		} else{
			webapps = instance.getPlugins("webapp");
			
			for(var i in webapps){
				var webapp = webapps[i];
				if(pattern.length != 0)
					pattern += '|';
				
				pattern += webapp.webappuri;
			}
		}
		
		instance.webappuriregxp = new RegExp("^(" + pattern + ")");
	}
	
	return instance.webappuriregxp;
};
/*
 * Private methods
 */


/**
 * Update the plugin type settings
 */
function updatePluginTypesetting(pluginsetting){
	if(pluginsetting && !pluginsetting[pluginsetting.plugintype + "setting"])
		pluginsetting[pluginsetting.plugintype + "setting"]={};
	
	if(pluginsetting && pluginsetting[pluginsetting.plugintype + "setting"]){
		var subsetting = pluginsetting[pluginsetting.plugintype + "setting"];
		
		if(pluginsetting.pluginsubtype && !subsetting[pluginsetting.plugintype + "type"])
			pluginsetting[pluginsetting.plugintype + "type"] = pluginsetting.pluginsubtype;
		
		if(subsetting[pluginsetting.plugintype + "type"])
			pluginsetting.pluginsubtype = subsetting[pluginsetting.plugintype + "type"];
	}
}


/**
 * To load plugin from a specific plugin settings
 * 
 * @method __loadPlugin
 * 
 * @param {} pluginsetting
 * @param {} configuration
 * @param {} dbInstance
 * @param {callback} callback The callback to excecute when complete
 * @private
 */
var __loadPlugin = function(instance, pluginsetting, configuration, dbInstance, callback){
	instance.getLogger().debug('Pluginloader:__loadPlugin', pluginsetting.id + '/' + pluginsetting.plugintype);

	if(isPluginActive(pluginsetting)){
		if(!instance.getPluginDetails(pluginsetting.id, pluginsetting.plugintype)){
	//		if(!pluginsetting.disabled)
	//			instance.emit("load", {pluginsetting:pluginsetting});
			
			if(pluginsetting.plugintype == 'webapp'){
				if(!pluginsetting.hasOwnProperty('public') || pluginsetting['public'] + '' != 'true'){
					if(instance.configuration.webapps)
						instance.configuration.webapps.push(pluginsetting.id);
					else
						instance.configuration.webapps = [pluginsetting.id];
					
					if(instance.webappuris)
						instance.webappuris.push(pluginsetting.webappuri || '/' + pluginsetting.id);
					else
						instance.webappuris = [pluginsetting.webappuri || '/' + pluginsetting.id];
				}
			} else {
				if(pluginsetting.plugintype != 'theme' && pluginsetting.plugintype != 'filter' && pluginsetting.plugintype != 'layout' && pluginsetting.plugintype != 'uiplugin')
					instance.getLogger().warn('Pluginloader:__loadPlugin', '@TODO unknown pluginntype -' + pluginsetting.id  +' -- is -- ' + pluginsetting.plugintype);
			}
			
			instance.plugins[pluginsetting.plugintype].push(pluginsetting);
		}
	}
	
	callback();
}


/**
 * To load plugin from a list
 * 
 * @method loadPluginFromList
 * 
 * @param {} pluginsettinglist
 * @param {} configuration
 * @param {callback} callback The callback to excecute when complete
 * 
 * @private
 */
var loadPluginFromList = function(instance, pluginsettinglist, configuration, callback){
	var __registerPlugins_count = pluginsettinglist.length,
		__registerPlugins_count_fincount=0,
		errors;
	
	if(__registerPlugins_count == 0)
		callback();
	else
		for(var i in pluginsettinglist){
			var pluginsetting = pluginsettinglist[i];
			
			__loadPlugin(instance, pluginsetting, configuration, instance.dbInstance, function(error){
				if(error) {
					errors=errors||[];
					errors.push(error);
				}
				
				if(__registerPlugins_count_fincount++ == __registerPlugins_count-1)
					callback(errors);
			});
		}	
}

function archiveServices(instance, pluginsetting, pluginbackupath, callback){
	var servicename = pluginsetting.id;
	
	var pluginservices = 0;
	if(pluginsetting.configuration.services){
		for(var servicename in pluginsetting.configuration.services){
			if(instance.getServiceloader().getService(servicename, pluginsetting))
				pluginservices++;
		}
	}
	
	if(pluginservices > 0){
		util.checkDirSync(pluginbackupath + '/database');
		
		var servicesbackedup = 0;
		
		for(var servicename in pluginsetting.configuration.services){
			instance.getLogger().info('Pluginloader:archiveServices', "Taking backup of  :::> " + servicename);
			
			// display the service and take the abckup
			if(instance.getServiceloader().getService(servicename, pluginsetting))
				instance.getServiceloader().getService(servicename, pluginsetting).backup({
					disableNotification	: true, 
					excludeService 		: true, 
					excludeTimeStamp 	: true, 
					dumpfile : servicename,
					dumptool : '/usr/local/server/mongodb/bin/mongodump', //@TODO replace with dynamic path injection
					dumpdir  : pluginbackupath + '/database'
				}, function(error, backupinfo) {
					if( servicesbackedup++ == pluginservices-1 ){
						// ignoring service backup errors
						util.archiveFolder({
							deleteFolder : true, 
							rootdir : pluginbackupath + '/database', 
							archive : pluginbackupath + '/database.tar.gz'
						}, callback);
					}
				});
		}
	}else{
		callback("No service to take a backup!");
	}
}

function archiveDependentantPlugins(instance, dependencies, pluginbackupath, callback){
	util.checkDirSync(pluginbackupath + '/dependencies');
	
	if(dependencies && dependencies.length > 0){
		var depcount = 0;
		// get the dependencies as well
		for(var pdindex in dependencies){
			archiveDependentantPlugin(instance, dependencies[pdindex], pluginbackupath + '/dependencies', function(error, depebackup){
				if(depcount++ == dependencies.length-1){
					util.archiveFolder({
						deleteFolder : true, 
						rootdir : pluginbackupath + '/dependencies', 
						archive : pluginbackupath + '/dependencies.tar.gz'
					}, callback);
				}
			});
		}
	}else
		callback();
}

function archiveDependentantPlugin(instance, deppluginid, backuppath, callback){
	var depps = instance.getPluginDetails(deppluginid, "all");
	
	instance.getLogger().debug("Getting dependant plugins --- "  + deppluginid);
	
	if(!depps){
		var uipluginpath = util.appendFilePath(instance.uiplugindir, util.generateId(deppluginid));
		
		if(fs.existsSync(uipluginpath)){
			util.archiveFolder({
				rootdir:uipluginpath, 
				archive:backuppath + '/'+ deppluginid +'.tar.gz'
			}, callback);
		}else
			callback();
	}else {
		if(fs.existsSync(depps.installeddir)){
			util.archiveFolder({
				rootdir:depps.installeddir, 
				archive:backuppath + '/'+ deppluginid +'.tar.gz'
			}, callback);
		}else
			callback();
	}
//		callback();
}

var correctDynamicPath  = function(dynamicconfig, options, uri, fields){
//	options = {uri:uri, fields:fields};
	// fields to be corrected javascript, css
	// paths for require config
//	var fields = fields||["javascript", "css", "paths"];
	if(typeof dynamicconfig == "string"){
		// let us check if there is require config mentioned
		if(options.requireconfig && dynamicconfig.length > 0 && dynamicconfig.indexOf('/') != 0 && dynamicconfig.indexOf('http') != 0 && /(\.js|\.css)/ig.test(dynamicconfig))
			dynamicconfig = options.requireconfig + "/" + dynamicconfig;
		else if(dynamicconfig.length > 0 && dynamicconfig.indexOf('/') != 0 && dynamicconfig.indexOf('http') != 0)
			dynamicconfig = options.uri + "/" + dynamicconfig;
	} else if(typeof dynamicconfig == 'object' && dynamicconfig.length == "number"){
		for(var subid in dynamicconfig){
			var keyobject = dynamicconfig[subid];
			if(typeof keyobject == "string"){
				dynamicconfig[subid] = correctDynamicPath(keyobject, {uri:options.uri});
			}else if( keyobject == "object") {
				dynamicconfig[subid] = correctDynamicPath(keyobject, {uri:options.uri}); 
			}
		}
	} else if(typeof dynamicconfig == 'object'){
		var fields = options.fields;
		if(!options.fields) 
			fields = Object.keys(dynamicconfig);
		
		for(var keyindex in fields){
			var keyfield = fields[keyindex];
			var keyobject = dynamicconfig[keyfield];
			
			if(keyobject){
				dynamicconfig[keyfield] = correctDynamicPath(keyobject, {uri:options.uri});
			}
		}
	}
	
	return dynamicconfig;
	
//	for(var keyindex in fields){
//		var keyfield = fields[keyindex];
//		var keyobject = dynamicconfig[keyfield];
//		if(typeof keyobject == "string"){
//			if(keyobject.length > 0 && keyobject.indexOf('/') != 0 && keyobject.indexOf('http') != 0)
//				dynamicconfig[keyfield] = uri + "/" + keyobject;
//		}else if(typeof keyobject == 'object' && typeof keyobject.length == "number"){
//			for(var subid in keyobject){
//				var subkeyobject = keyobject[subid];
//				if(typeof subkeyobject == "string"){
//					if(subkeyobject.length > 0 && subkeyobject.indexOf('/') != 0 && subkeyobject.indexOf('http') != 0)
//						keyobject[subid] = uri + "/" + subkeyobject;
//				} else if(typeof keyobject == 'object' && typeof keyobject.length == "number"){
//					
//				} else if( subkeyobject == "object"){
//					
//				}
//				if(subjsfilepath.length > 0 && subjsfilepath.indexOf('/') != 0 && subjsfilepath.indexOf('http') != 0)
//					jsfilepath[subid] = uri + "/" + subjsfilepath;
//			}
//			
//			for(var index in keyobject ){
//				var jsfilepath = dynamicconfig[keyfield][subkey][index]; 
//				
//				if(typeof jsfilepath == 'object' && typeof jsfilepath.length == "number") {
//					for(var subid in jsfilepath){
//						var subjsfilepath = jsfilepath[subid];
//						
//						if(subjsfilepath.length > 0 && subjsfilepath.indexOf('/') != 0 && subjsfilepath.indexOf('http') != 0)
//							jsfilepath[subid] = uri + "/" + subjsfilepath;
//					}
//				} else if(typeof jsfilepath == 'object') {
//					correctDynamicPath(jsfilepath, uri);
////					for(var subid in jsfilepath){
////						var subjsfilepath = jsfilepath[subid];
////						
////						if(subjsfilepath.length > 0 && subjsfilepath.indexOf('/') != 0 && subjsfilepath.indexOf('http') != 0)
////							jsfilepath[subid] = uri + "/" + subjsfilepath;
////					}
//				} else if(typeof jsfilepath == 'string') {
//					if(jsfilepath.length > 0 && jsfilepath.indexOf('/') != 0 && jsfilepath.indexOf('http') != 0)
//						dynamicconfig[keyfield][subkey][index] = uri + "/" + jsfilepath;
//				}
//			}
//		}else if(keyobject == "object"){
//			correctDynamicPath(keyobject, uri);
//		}
//			for (var subkey in dynamicconfig[keyfield] ){
//				var subobject = dynamicconfig[keyfield][subkey];
//				
//				if(typeof dynamicconfig[keyfield][subkey] == 'string') {
//					var subpath = dynamicconfig[keyfield][subkey];
//					if(subpath.length > 0 && subpath.indexOf('/') != 0 && subpath.indexOf('http') != 0)
//						dynamicconfig[keyfield][subkey] = uri + "/" + subpath;
//				}else {
//					for(var index in dynamicconfig[keyfield][subkey] ){
//						var jsfilepath = dynamicconfig[keyfield][subkey][index]; 
//						
//						if(typeof jsfilepath == 'object' && typeof jsfilepath.length == "number") {
//							for(var subid in jsfilepath){
//								var subjsfilepath = jsfilepath[subid];
//								
//								if(subjsfilepath.length > 0 && subjsfilepath.indexOf('/') != 0 && subjsfilepath.indexOf('http') != 0)
//									jsfilepath[subid] = uri + "/" + subjsfilepath;
//							}
//						} else if(typeof jsfilepath == 'object') {
//							correctDynamicPath(jsfilepath, uri);
////							for(var subid in jsfilepath){
////								var subjsfilepath = jsfilepath[subid];
////								
////								if(subjsfilepath.length > 0 && subjsfilepath.indexOf('/') != 0 && subjsfilepath.indexOf('http') != 0)
////									jsfilepath[subid] = uri + "/" + subjsfilepath;
////							}
//						} else if(typeof jsfilepath == 'string') {
//							if(jsfilepath.length > 0 && jsfilepath.indexOf('/') != 0 && jsfilepath.indexOf('http') != 0)
//								dynamicconfig[keyfield][subkey][index] = uri + "/" + jsfilepath;
//						}
//					}
//				}
//			}
//	}
}

/**
 * To install the plugin from the plugin source.
 */
PluginLoaderMain.prototype.installMissingDependencies = function(pluginsource, options, callback){
	var instance = this,
		error;
		
	if(pluginsource && pluginsource.missingdependencies && pluginsource.missingdependencies.length > 0){
		var cbc = pluginsource.missingdependencies.length;
		for(var i in pluginsource.missingdependencies){
			var missingdepid = pluginsource.missingdependencies[i];
			
			instance.getServiceloader().getService("pluginsource").installPlugin({$or:[{title:missingdepid}, {id:missingdepid}]}, options, function(_error, updateddata){
				if(_error){
					if(!error)
						error=[];
					
					error.push(_error);
				}
				
				if(cbc-- == 1)
					callback(error);
			});
		}
	}else
		callback()
}

PluginLoaderMain.prototype.installDependencies = function(pluginsetting, callback, webresource){
	var instance = this,
		cbcount = 0, cberror=[];
	
	if(pluginsetting && webresource) {
		if(pluginsetting.plugintype == 'uiplugin')
			webresource.resourcefolder = util.appendFilePath(pluginsetting.installeddir, webresource.resourcefolder);
		else { // dependencies must be installed in data directory of the server.
			webresource.resourcefolder = instance.getDataDirectory(pluginsetting, webresource.resourcefolder);
		
			// check whether the folder is available inside data folder
			simpleportal.util.checkDirSync(instance.getDataDirectory({id:pluginsetting.plugintype}));
		}
		
		var sr  = new Resourceinstaller(webresource);
		sr.install(function(error, data){
			if(data && data.file){
				webresource.mtime = fs.statSync(webresource.resourcefolder);
			}
			
			if(callback)
				callback(error, data)
		});
	} else if(pluginsetting){
		// let us also check there is any dependencies
		if(pluginsetting.resources && pluginsetting.resources.length > 0){
			if(typeof pluginsetting.resources == "object" && typeof pluginsetting.resources.length != "number")
				pluginsetting.resources = [pluginsetting.resources];
				
				for(var i in pluginsetting.resources) {
					var webresource = simpleportal.util.extendJSON({}, pluginsetting.resources[i]);
					
					if(pluginsetting.plugintype == 'uiplugin')
						webresource.resourcefolder = util.appendFilePath(pluginsetting.installeddir, webresource.resourcefolder);
					else { // dependencies must be installed in data diractory of the server.
						webresource.resourcefolder = instance.getDataDirectory(pluginsetting, webresource.resourcefolder);
					
						// check whether the folder is available inside data folder
						simpleportal.util.checkDirSync(instance.getDataDirectory({id:pluginsetting.plugintype}));
					}
					instance.getLogger().debug(instance.routerid + ":loadDependencies", "Installing resource -" + webresource.resourcefolder +'<<' + webresource.downloadlink);
					var sr  = new Resourceinstaller(webresource);
					
					sr.install(function(error){
						if(error) cberror.push(error);
						
						if(cbcount ++ == pluginsetting.resources.length -1){
							if(cberror.length <= 0)
								cberror = null;
							
							if(callback)callback(cberror);
						}
					});
				}
			}else if(callback)
				callback();
	} else if(callback)
		callback();
		
}

var loadDependencies = function(instance, options){
	var pluginsetting = options.pluginsetting;

	pluginsetting.configuration = pluginsetting.configuration || {};
	
	var configkey;
	if(pluginsetting && pluginsetting.requireconfig && pluginsetting.requireconfig.configkey)
		configkey = pluginsetting.requireconfig.configkey
	
	/*
	 * Dependency check must be done here
	 */
	if(isPluginActive(pluginsetting) && pluginsetting.plugintype == 'theme' && pluginsetting.themesetting){
		correctDynamicPath(pluginsetting.themesetting, {
			uri:"/theme" + pluginsetting.themeuri, 
			fields:["javascript", "css"], configkey:configkey
		});
		
		if(pluginsetting.themesetting && pluginsetting.themesetting.mobilesetting)
			correctDynamicPath(pluginsetting.themesetting.mobilesetting, {
				uri:"/theme" + pluginsetting.themeuri, 
				fields:["javascript", "css"], configkey:configkey
			});
	}
	
	/*
	 * Plugin resource installer!
	 */
	var autoinstall = instance.getServerInstance().getConfiguration("resources", {autoinstall:false}).autoinstall;
	if(autoinstall && pluginsetting && (
		(pluginsetting.resources && pluginsetting.resources.length > 0) || pluginsetting.dependencies
	)){
		// call this only when the plugin configuration allows us to do it.
		instance.installDependencies(pluginsetting, function(error){
			instance.getLogger().debug(instance.routerid + ":loadDependencies", "After installing the plugin dependencies -" + pluginsetting.id);
		});
	}
	
	if(isPluginActive(pluginsetting) && fs.existsSync(pluginsetting.installeddir + '/' + pluginsetting.layoutdir)){
		pluginsetting.layouts = pluginsetting.layouts || [];
		
		fs.readdirSync(pluginsetting.installeddir + '/' + pluginsetting.layoutdir).filter(function(f){return /\.html.ejs/.test(f);}).forEach(function(layoutfile){
			pluginsetting.layouts.push({
				title:layoutfile.replace(".html.ejs", ""), 
				path:pluginsetting.layoutdir, 
				id:layoutfile, 
				layouttype:"page"
			});
		});
		
		if(fs.existsSync(pluginsetting.installeddir + '/' + pluginsetting.layoutdir + "/content"))
			fs.readdirSync(pluginsetting.installeddir + '/' + pluginsetting.layoutdir + "/content").filter(function(f){return /\.html.ejs/.test(f);}).forEach(function(layoutfile){
				pluginsetting.layouts.push({
					title:layoutfile.replace(".html.ejs", ""), 
					path:pluginsetting.layoutdir + "/content", 
					layouttype:"content", id:layoutfile
				});
			});
	}
	
	/*
	 * Load plugin
	 */
	if(pluginsetting.templatedir && fs.existsSync(pluginsetting.installeddir + '/' + pluginsetting.templatedir)){
		pluginsetting.templates = pluginsetting.templates||[];
		fs.readdirSync(pluginsetting.installeddir + '/' + pluginsetting.templatedir).filter(function(f){return /\.ejs/.test(f);}).forEach(function(templatefile){
			var template_ = {title:templatefile.substring(0, templatefile.indexOf(".")), path:pluginsetting.templatedir, id:templatefile, templatetype:"service", filetype:templatefile.substring(templatefile.indexOf(".")+1, templatefile.indexOf(".ejs"))};
			if(/list.html.ejs$/.test(templatefile))
				template_.type="list";
			else if(/form.html.ejs$/.test(templatefile))
				template_.type="form";
			else if(/service.html.ejs$/.test(templatefile))
				template_.type="details";
			
			pluginsetting.templates.push(template_)
		});
		
		if(fs.existsSync(pluginsetting.installeddir + '/' + pluginsetting.templatedir + "/system"))
			fs.readdirSync(pluginsetting.installeddir + '/' + pluginsetting.templatedir + "/system").filter(function(f){return /\.html.ejs/.test(f);}).forEach(function(templatefile){
				var template_ = {title:templatefile.substring(0, templatefile.indexOf(".")), path:pluginsetting.templatedir + "/system", templatetype:"system", id:templatefile, filetype:templatefile.substring(templatefile.indexOf(".")+1, templatefile.indexOf(".ejs"))};
				
				if(/list.html.ejs$/.test(templatefile))
					template_.type="list";
				else if(/form.html.ejs$/.test(templatefile))
					template_.type="form";
				else if(/service.html.ejs$/.test(templatefile))
					template_.type="details";
				
				pluginsetting.templates.push(template_)
			});
	}
	
	if(isPluginActive(pluginsetting) && fs.existsSync(pluginsetting.installeddir + '/startup')){
		instance.getStartuploader().on("router.loaded.startuploader." + pluginsetting.id, function(startups){
			if(startups && startups.length > 0){
				for (var i in startups){
					var startupprops = startups[i];
					
					if(startupprops.error){
						pluginsetting.startuperrors = pluginsetting.startuperrors||[];
						pluginsetting.startuperrors.push(startupprops.error);
						
						pluginsetting.disabled = true;
					}
					
					if(!pluginsetting.configuration.startups)
						pluginsetting.configuration.startups = {};
					
					if ( !pluginsetting.configuration.startups[startupprops.name] )
						pluginsetting.configuration.startups[startupprops.name] = {};
				}	
			}
		});
		
		// load Startup 
		// @TODO Dynamic loading from the plugin loader class iteself
		// use event api emit load.startup -- options must have configuration and startupdir
		instance.getStartuploader().emit("load.router", {plugin : pluginsetting.id, configuration:pluginsetting, startupdir:pluginsetting.installeddir + '/startup'});
	}
	
	if(isPluginActive(pluginsetting) && fs.existsSync(pluginsetting.installeddir + '/filter')){
		// load Filters 
		// @TODO Dynamic loading from the plugin loader class iteself
		instance.getFilterloader().emit("load.router", {plugin : pluginsetting.id, configuration:pluginsetting, filterdir:pluginsetting.installeddir + '/filter'});
	}
	
	if(isPluginActive(pluginsetting) && fs.existsSync(pluginsetting.installeddir + '/' + pluginsetting.servicedir)) {
		var callback_ = (function(pluginsetting){
			return function(services) {
				for (var i in services){
					var serviceprops = services[i];
					
					if(serviceprops.error){
						pluginsetting.serviceerrors = pluginsetting.serviceerrors||[];
						pluginsetting.serviceerrors.push(serviceprops.error);
						
						pluginsetting.disabled = true;
					}
					
					if ( !pluginsetting.configuration.services[serviceprops.name] )
						pluginsetting.configuration.services[serviceprops.name] = {};
				}
			}
		})(pluginsetting);
		
		instance.getServiceloader().on("router.loaded." + pluginsetting.id, callback_);
		
		pluginsetting.configuration = pluginsetting.configuration || {};
		
		var services_ = pluginsetting.configuration.services = pluginsetting.configuration.services||{};
		
		instance.getServiceloader().emit("load.router", {
			plugin : pluginsetting.id, 
			servicedir : pluginsetting.installeddir + '/' + pluginsetting.servicedir, 
			services : services_, 
			serviceprefix : pluginsetting.serviceprefix
		});
	}
	
	if(isPluginActive(pluginsetting) && pluginsetting.configuration && pluginsetting.configuration.services && pluginsetting.configuration.services.userrole){
		instance.getServerInstance().setConfiguration(pluginsetting.configuration);
	}
	
	if(isPluginActive(pluginsetting) 
		&& pluginsetting.configuration 
		&& pluginsetting.configuration.services 
		&& pluginsetting.configuration.services.user
		&& pluginsetting.configuration.services.user.custommodel
	){
		util.extendJSON(instance.getServiceloader().getService("user").model, pluginsetting.configuration.services.user.custommodel);
		
		// check you have cusotm modelsettings
		if(pluginsetting.configuration.services.user.custommodelsettings)
			instance.getServiceloader().getService("user").setConfiguration({modelsettings:pluginsetting.configuration.services.user.custommodelsettings});
	}
	
	if(isPluginActive(pluginsetting) 
		&& pluginsetting.configuration 
		&& pluginsetting.configuration.services 
		&& pluginsetting.configuration.services.userprofile
		&& pluginsetting.configuration.services.userprofile.custommodel
	){
		util.extendJSON(instance.getServiceloader().getService("userprofile").model, pluginsetting.configuration.services.userprofile.custommodel);
	}
	
	if(isPluginActive(pluginsetting) && pluginsetting.viewdir){
		if(fs.existsSync(pluginsetting.installeddir + '/' + pluginsetting.viewdir)){
			var viewconfig_ = {};
			if(pluginsetting.configuration && pluginsetting.configuration.views)
				viewconfig_ = pluginsetting.configuration.views;
			
			instance.getViewloader().loadViews({viewdir:pluginsetting.installeddir + '/' + pluginsetting.viewdir, views:viewconfig_}, function(error, data){
				if(error)
					instance.getLogger().error(instance.routerid + ":loadDependencies", error);
			});
		}
	}
	
	if(isPluginActive(pluginsetting))
		instance.setPreference(pluginsetting);
	
	if(isPluginActive(pluginsetting) && pluginsetting.plugintype == "theme"){
		if(!pluginsetting.themesetting.dependencies)
			pluginsetting.themesetting.dependencies = [];
		
		var sessionTimeoutPreference = instance.getPreference({id:"bootstrap-session-timeoutuiplugin"});
		if(sessionTimeoutPreference && !sessionTimeoutPreference.disabled) {
			pluginsetting.themesetting.dependencies.push("bootstrap-session-timeoutuiplugin");
//			pluginsetting.themesetting.dependencies.push("sessiontimeoutapp");
		}
	}
	
	if(isPluginActive(pluginsetting) && pluginsetting.plugintype == "webapp" 
		&& pluginsetting.preference && pluginsetting.preference["mediagallery"]){
		if(!pluginsetting.webappsetting.dependencies)
			pluginsetting.webappsetting.dependencies = [];
		
		pluginsetting.webappsetting.dependencies.push("mediagallery");
	}

	// theme dependency injection
	if(pluginsetting.webappsetting && pluginsetting.webappsetting.theme){
		if(!pluginsetting.webappsetting.dependencies)
			pluginsetting.webappsetting.dependencies = [];
		
		pluginsetting.webappsetting.dependencies.push(pluginsetting.webappsetting.theme);
	}
	
	if(isPluginActive(pluginsetting)){
		// let us also update the integration file with the active webappuri
		updateIntegration(pluginsetting, instance);
	}

	// get the static web pages
	if(isPluginActive(pluginsetting) && pluginsetting.plugintype == "webapp") {
		var webappuri = pluginsetting.webappuri;
		
		simpleportal.util.getResources(pluginsetting.installeddir + "/resources/templates/pages", {resourcekey:pluginsetting.id, includeroot:false, extension:".html.ejs"}, function(error, webpages){
			if(webpages && webpages.length > 0){
				if(!pluginsetting.webappsetting.websiteconfig)
					pluginsetting.webappsetting.websiteconfig = {webpages:[]};
				
				if(!pluginsetting.webappsetting.websiteconfig.webpages)
					pluginsetting.webappsetting.websiteconfig.webpages = [];
				
				for(var i in webpages){
					delete webpages[i].path;
					webpages[i].uri = '/pages' + webpages[i].id.replace(".ejs", "");
					webpages[i].id = webpages[i].id.replace(".html.ejs", "").replace("/", "");
					
					if(!webpages[i].status)
						webpages[i].status="active";
					
					var curwebpage = simpleportal.util.getJSONObject(pluginsetting.webappsetting.websiteconfig.webpages, 'id', webpages[i].id);
					
					if(!curwebpage){
						webpages[i].hidden=true;
						webpages[i].display = webpages[i].display.replace(".html.ejs", "");
						
						pluginsetting.webappsetting.websiteconfig.webpages.push(webpages[i]);
					} else {
						if(curwebpage.display)
							webpages[i].display = curwebpage.display;
						else 
							webpages[i].display = webpages[i].display.replace(".html.ejs", "");
						
						simpleportal.util.extendJSON(curwebpage, webpages[i]);
					}
					
					if(curwebpage && !curwebpage.layout)
						curwebpage.layout = "staticpage";
					
				};
			}
		}, []);
	}	
	
	var settingsfield = pluginsetting.plugintype + 'setting';
	
	if(isPluginActive(pluginsetting) && pluginsetting.installeddir.indexOf(instance.systemplugindir) == 0)
		pluginsetting.pluginsourcetype='system';
	else if(isPluginActive(pluginsetting) && pluginsetting.installeddir.indexOf(instance.plugindir) == 0)
		pluginsetting.pluginsourcetype='installed';
}

function injectDependency(instance, plugindetails, dependentConfig, mobile){
	var dependantPlugin;
	
	if(dependentConfig && dependentConfig.id == plugindetails.id)
		dependantPlugin = plugindetails;
	
	if(!dependantPlugin)
		dependantPlugin	= instance.getPluginDetails(dependentConfig.id, 'webapp');
	
	var settingsfield = plugindetails.plugintype + 'setting';
	var settingsobject = plugindetails[settingsfield];
	
	if(mobile){
		//@TODO let us only think theme can only have mobile setting for now.
		if(!settingsobject["mobilesetting"])
			plugindetails[settingsfield]["mobilesetting"]={css:{}, javascript:{}};
		
		settingsobject = plugindetails[settingsfield]["mobilesetting"];
		
//		if(!settingsobject.javascript)
//			settingsobject.javascript = {};
	}
	
	if(!settingsobject.javascript)
		settingsobject.javascript = {dependencies:{}};
	
	if(!settingsobject.javascript.dependencies)
		settingsobject.javascript.dependencies = {};

	// file to copy = 
	var defaultjdep = {modelfiles:[], viewfiles:[], routerfiles:[]},
		cdep, jdep ;
	
	if(dependantPlugin && dependantPlugin.plugintype == "webapp" && dependantPlugin.webappsetting.integration){
		if(dependantPlugin.preference 
			&& dependantPlugin.preference.minified 
			&& dependantPlugin.webappsetting 
			&& dependantPlugin.webappsetting.integration_minified) {
			jdep = dependantPlugin.webappsetting.integration_minified;
			
			// let us insert the dependent integration properties
			settingsobject._dependencies[dependantPlugin.id] = jdep;
		}else if(dependantPlugin.webappsetting && dependantPlugin.webappsetting.integration){
			// check out if the integration directly mentions javascript
			if(dependantPlugin.webappsetting.integration.javascript)
				jdep = dependantPlugin.webappsetting.integration.javascript;
			else
				jdep = dependantPlugin.webappsetting.integration;
			
			if(dependantPlugin.webappsetting.integration.css 
				&& typeof dependantPlugin.webappsetting.integration.css.length == 'number'){
				cdep = dependantPlugin.webappsetting.integration.css;
			}
		}
		// now let us check if it is available
		if(cdep){
			if(!settingsobject.css) plugindetails[settingsfield].css={};
			if(typeof settingsobject.css.length == "number")
				settingsobject.css = settingsobject.css.concat(cdep);
			else {
				if(!settingsobject.css.dependencies)settingsobject.css.dependencies=[];
				settingsobject.css.dependencies = settingsobject.css.dependencies.concat(cdep);
			}
		}
		
		if(jdep){
			settingsobject._dependencies[dependantPlugin.id] = jdep;
			
			settingsobject.javascript.dependencies = util.extendJSON(settingsobject.javascript.dependencies, {
				modelfiles:[], viewfiles:[], routerfiles:[]
			}, jdep);
		}		
	} else if(dependantPlugin && dependantPlugin.plugintype == "webapp" && dependantPlugin.webappsetting.integration) {
		if(!settingsobject.javascript)
			settingsobject.javascript = {};
		
		if(!settingsobject.javascript.dependencies)
			settingsobject.javascript.dependencies={modelfiles:[], viewfiles:[], routerfiles:[]};

		if(dependantPlugin.preference 
				&& dependantPlugin.preference.minified 
				&& dependantPlugin.webappsetting 
				&& dependantPlugin.webappsetting.integration_minified){
			
			settingsobject.javascript.dependencies = util.extendJSON(settingsobject.javascript.dependencies, {
				modelfiles:[], viewfiles:[], routerfiles:[]
			}, dependantPlugin.webappsetting.integration_minified);
			
			// let us insert the dependent integration properties
			settingsobject._dependencies[dependantPlugin.id] = dependantPlugin.webappsetting.integration_minified;
		} else if(dependantPlugin.webappsetting && dependantPlugin.webappsetting.integration){
			// check out if the integration directly mentions javascript
			if(dependantPlugin.webappsetting.integration.javascript)
				settingsobject.javascript.dependencies = util.extendJSON(settingsobject.javascript.dependencies, {
					modelfiles:[], viewfiles:[], routerfiles:[]
				}, dependantPlugin.webappsetting.integration.javascript);
			else
				settingsobject.javascript.dependencies = util.extendJSON(settingsobject.javascript.dependencies, {
					modelfiles:[], viewfiles:[], routerfiles:[]
				}, dependantPlugin.webappsetting.integration);
			
			if(dependantPlugin.webappsetting.integration.css 
					&& typeof dependantPlugin.webappsetting.integration.css.length == 'number'){
				
				if(!settingsobject.css)plugindetails[settingsfield].css={};
				if(typeof settingsobject.css.length == "number")
					settingsobject.css = settingsobject.css.concat(dependantPlugin.webappsetting.integration.css);
				else{
					if(!settingsobject.css.dependencies)settingsobject.css.dependencies=[];
					
					settingsobject.css.dependencies = settingsobject.css.dependencies.concat(dependantPlugin.webappsetting.integration.css);
				}
			}
			
			// let us insert the dependent integration properties
			settingsobject._dependencies[dependantPlugin.id] = dependantPlugin.webappsetting.integration;
		} else
			// let us insert the dependent integration properties
			settingsobject._dependencies[dependantPlugin.id] = {};
	} else {
		if(!dependantPlugin)
			dependantPlugin = instance.getPluginDetails(dependentConfig.id, 'uiplugin');
		
		if(!dependantPlugin && instance.integration[dependentConfig.id]){
			dependantPlugin = {id:dependentConfig.id, integration:instance.integration[dependentConfig.id]};
		}
		
		if(dependantPlugin && dependantPlugin.integration) {
			var versiontoload,
				defversiontoload = 'latest';
			
			if(Object.keys(dependantPlugin.integration).length == 1)
				defversiontoload = Object.keys(dependantPlugin.integration)[0];
			
			if(dependentConfig.version)
				versiontoload = dependentConfig.version;
			else
				versiontoload = defversiontoload;
			
			var depConfigKey;
			if(dependantPlugin && dependantPlugin.requireconfig && dependantPlugin.requireconfig.configkey)
				depConfigKey = dependantPlugin.requireconfig.configkey;
			
			if(dependentConfig.versions && dependentConfig.versions.length  > 0){
				// we need theme dependency injection also
				for(var i in dependentConfig.versions){
					versiontoload = dependentConfig.versions[i]||defversiontoload;
					if(dependentConfig.versions[i] == '')
						versiontoload = defversiontoload;
					
					if(versiontoload){
						if(dependantPlugin.integration[versiontoload] && dependantPlugin.integration[versiontoload].javascript) {
							if(!settingsobject.javascript.dynamic)
								settingsobject.javascript.dynamic=[];
							
							// let us also check if it is array or not if it is array then use it as concat
							// else try to copy the files to a different group.
							var jdep = dependantPlugin.integration[versiontoload].javascript;
							if(typeof jdep == 'object' && typeof jdep.length == 'number'){
								if(versiontoload == 'latest' && jdep.length == 1 && depConfigKey)
									settingsobject.javascript.dynamic = settingsobject.javascript.dynamic.concat([depConfigKey]);
								else
									settingsobject.javascript.dynamic = settingsobject.javascript.dynamic.concat(jdep);
							}else{
								settingsobject.javascript.dependencies = util.extendJSON(settingsobject.javascript.dependencies, {
									modelfiles:[], viewfiles:[], routerfiles:[]
								}, jdep);
							}
						}
						
						if(dependantPlugin.integration[versiontoload] && dependantPlugin.integration[versiontoload].css) {
							if(!settingsobject.css)
								settingsobject.css=[];
							
							var jcss = dependantPlugin.integration[versiontoload].css;
							if(typeof settingsobject.css == "object" && typeof settingsobject.css.length == "number")
								settingsobject.css = settingsobject.css.concat(jcss);
							else{
								if(!settingsobject.css.dynamic)
									settingsobject.css.dynamic = [];
								
								settingsobject.css.dynamic = settingsobject.css.dynamic.concat(jcss);
							}	
						}

						// let us insert the dependent integration properties
						if(defversiontoload != versiontoload||dependentConfig.versions[i]){
							if(dependentConfig.id == plugindetails.id)
								settingsobject._dependencies['@' + versiontoload] = dependantPlugin.integration[versiontoload];
							else
								settingsobject._dependencies[dependantPlugin.id + '@' + versiontoload] = dependantPlugin.integration[versiontoload];
						} else
							settingsobject._dependencies[dependantPlugin.id] = dependantPlugin.integration[versiontoload];
					}
				}
			} else  if(versiontoload) {
				if(dependantPlugin.integration[versiontoload] && dependantPlugin.integration[versiontoload].javascript) {
					if(!settingsobject.javascript)
						settingsobject.javascript = {};
					
					if(!settingsobject.javascript.dynamic)
						settingsobject.javascript.dynamic=[];
					
//					settingsobject.javascript.dynamic = settingsobject.javascript.dynamic.concat(dependantPlugin.integration[versiontoload].javascript);
					var jdep = dependantPlugin.integration[versiontoload].javascript;
					if(typeof jdep == 'object' && typeof jdep.length == 'number'){
						settingsobject.javascript.dynamic = settingsobject.javascript.dynamic.concat(dependantPlugin.integration[versiontoload].javascript);
					}else{
						settingsobject.javascript.dependencies = util.extendJSON(settingsobject.javascript.dependencies, {}, jdep);
					}
				}
				
				if(dependantPlugin.integration[versiontoload] && dependantPlugin.integration[versiontoload].css) {
					if(!settingsobject.css)
						settingsobject.css = [];
					
					if(typeof settingsobject.css == "object" && typeof settingsobject.css.length == "number")
						settingsobject.css = settingsobject.css.concat(dependantPlugin.integration[versiontoload].css);
					else {
						if(!settingsobject.css.dynamic)
							settingsobject.css.dynamic = [];
						
						settingsobject.css.dynamic = settingsobject.css.dynamic.concat(dependantPlugin.integration[versiontoload].css);
					}
				}
				
				// let us insert the dependent integration properties
				if(defversiontoload != versiontoload||dependentConfig.version){
					if(dependentConfig.id == plugindetails.id)
						settingsobject._dependencies['@' + versiontoload] = dependantPlugin.integration[versiontoload];
					else
						settingsobject._dependencies[dependantPlugin.id + '@' + versiontoload] = dependantPlugin.integration[versiontoload];
				} else
					settingsobject._dependencies[dependantPlugin.id] = dependantPlugin.integration[versiontoload];
			} else
				// let us insert the dependent integration properties
				settingsobject._dependencies[dependantPlugin.id] = {};
		}
		
		// now check dependant plugin has require config 
		if(dependantPlugin && dependantPlugin.requireconfig){
			// let us extend the require config using dynamic require config variable
			if(!settingsobject._requireconfig)
				settingsobject._requireconfig = {};
			
			if(!settingsobject._requireconfig[dependantPlugin.id]){
				var configobject = dependantPlugin.requireconfig;
//				settingsobject.requireconfig = simpleportal.util.extendJSON(settingsobject.requireconfig||{}, dependantPlugin.requireconfig);
				if(configobject.paths){
					// check if the first key and has no more keys then use that to identify it as path
					if(!configobject.paths[dependantPlugin.id]){
						var key = Object.keys(configobject.paths)[0];
						
						configobject.paths[dependantPlugin.id] = configobject.paths[key];	
					}				
				}
				settingsobject.requireconfig = simpleportal.util.extendJSON(settingsobject.requireconfig||{}, configobject);
				
				settingsobject._requireconfig[dependantPlugin.id] = configobject;
			}
		}
	}
}

function injectDependencies(instance, plugindetails){
	var settingsfield = plugindetails.plugintype + 'setting',
		dependIds = [], 
		mobiledependIds = [];
	
	// let me check for mobilesetting
	if(plugindetails[settingsfield] && plugindetails[settingsfield]["mobilesetting"] ){
		if(!plugindetails[settingsfield]["mobilesetting"]._dependencies){
			plugindetails[settingsfield]["mobilesetting"]._dependencies={};
		}
		
		if(plugindetails[settingsfield]["mobilesetting"].dependencies)
			plugindetails[settingsfield]["mobilesetting"].dependencies.forEach(function(depid){
				var depobject = {id:depid};
				
				if(depid.indexOf("@") == 0)
					depobject = {version:depid.substring(depid.indexOf("@")+1), id:plugindetails.id};
				else if(depid.indexOf("@") != -1)
					depobject = {version:depid.substring(depid.indexOf("@")+1), id:depid.substring(0, depid.indexOf("@"))};
				
				var duplicates = util.getJSONObject(mobiledependIds, 'id', depobject.id);
				if(duplicates) {
					if(!duplicates.versions){
						if(duplicates.version)
							duplicates.versions = [duplicates.version];
						else
							duplicates.versions = [''];
					}
					
					if(depobject.version)
						duplicates.versions.push(depobject.version);
					else
						duplicates.versions.push('');
				}else
					mobiledependIds.push(depobject);
			});
	}
	
	if(plugindetails[settingsfield].dependencies) {
		if(!plugindetails[settingsfield]._dependencies){
			plugindetails[settingsfield]._dependencies={};
		}
		
		// let us check if there is theme defined and want to include
		if(plugindetails[settingsfield].theme){
			// let us also inject the theme property in to the dependencies
			plugindetails[settingsfield].dependencies.push(plugindetails[settingsfield].theme);
		}
		
		plugindetails[settingsfield].dependencies.forEach(function(depid){
			var depobject = {id:depid};
			
			if(depid.indexOf("@") == 0)
				depobject = {version:depid.substring(depid.indexOf("@")+1), id:plugindetails.id};
			else if(depid.indexOf("@") != -1)
				depobject = {version:depid.substring(depid.indexOf("@")+1), id:depid.substring(0, depid.indexOf("@"))};
			
			var duplicates = util.getJSONObject(dependIds, 'id', depobject.id);
			if(duplicates) {
				if(!duplicates.versions){
					if(duplicates.version)
						duplicates.versions = [duplicates.version];
					else
						duplicates.versions = [''];
				}
				
				if(depobject.version)
					duplicates.versions.push(depobject.version);
				else
					duplicates.versions.push('');
			}else
				dependIds.push(depobject);
		});
	}
	
	if(dependIds && dependIds.length > 0){
		for(var i in dependIds){
			injectDependency(instance, plugindetails, dependIds[i]);
		}
	}
	
	if(mobiledependIds && mobiledependIds.length > 0){
		for(var i in mobiledependIds) {
			injectDependency(instance, plugindetails, mobiledependIds[i], true);
		}
	}
	
	if( (dependIds && dependIds.length > 0) && (mobiledependIds && mobiledependIds.length > 0) ) {
		if( (Object.keys(plugindetails[settingsfield]["mobilesetting"]._dependencies).length == plugindetails[settingsfield]["mobilesetting"].dependencies.length) 
			&& (Object.keys(plugindetails[settingsfield]._dependencies).length == plugindetails[settingsfield].dependencies.length) ){
			instance.pluginChanged(plugindetails.id);
		}
	}else if( (dependIds && dependIds.length > 0) 
		&& (Object.keys(plugindetails[settingsfield]._dependencies).length == plugindetails[settingsfield].dependencies.length))
		instance.pluginChanged(plugindetails.id);
}

/**
 * To update the integration details of the plugin setting
 * 
 * @method updateIntegration
 * @param pluginsetting
 * @private
 */
function updateIntegration(pluginsetting, instance){
	var pluginuri;
		
	if(pluginsetting) {
		var configkey;
		if(pluginsetting.requireconfig && pluginsetting.requireconfig.configkey)
			configkey = pluginsetting.requireconfig.configkey
		
		if(pluginsetting.plugintype == "webapp" && pluginsetting.webappsetting) {
			if(!pluginuri && pluginsetting.webappuri)
				pluginuri = pluginsetting.webappuri;
			
			if(pluginsetting.webappsetting.logo 
					&& pluginsetting.webappsetting.logo.indexOf("/") != 0 
					&& pluginsetting.webappsetting.logo.indexOf("http") != 0){
				pluginsetting.webappsetting.logo = pluginuri + '/' + pluginsetting.webappsetting.logo;
			}
			
			if(pluginsetting.webappsetting.javascript) {
				// update dynamic path
				pluginsetting.webappsetting.javascript = correctDynamicPath(pluginsetting.webappsetting.javascript, {
					uri:pluginuri, configkey:configkey
				});
			}
		}
		
		if(pluginsetting.plugintype == "theme")
			pluginuri = '/theme' + pluginsetting.themeuri;

		if(!pluginuri && pluginsetting.plugintype == "uiplugin"){
			pluginuri = "/uiplugin" + pluginsetting.installeddir.substring(pluginsetting.installeddir.lastIndexOf("/"));
		}
		
		if(!pluginuri && pluginsetting.webappuri)
			pluginuri = pluginsetting.webappuri;
		else if(!pluginuri && pluginsetting.webappsetting && pluginsetting.webappsetting.webappuri)
			pluginuri = pluginsetting.webappsetting.webappuri;
		
		if(pluginsetting.requireconfig) {
			correctDynamicPath(pluginsetting.requireconfig, {
				uri:pluginuri, fields:['paths']
			});
		}
		
		if(pluginsetting.integration){
			// @ui plugin integration update dynamic path
			correctDynamicPath(pluginsetting.integration, {uri:pluginuri, configkey:configkey});
			
			for(var version in pluginsetting.integration) {
				if(pluginsetting.preference && pluginsetting.preference.minified){
					if(!pluginsetting.integration_minified)
						pluginsetting.integration_minified = {javascript:[]};
					
					pluginsetting.integration_minified["javascript"][version] = [pluginuri + '/js/integration.' + version + '.min.js'];
				}
			}
		} else if(pluginsetting.webappsetting && pluginsetting.webappsetting.integration) {
			for(var key in pluginsetting.webappsetting.integration) {
				var filevalues = pluginsetting.webappsetting.integration[key];
				if(typeof filevalues == "object") { // update dynamic path
					correctDynamicPath(filevalues, {uri:pluginuri, configkey:configkey});
				}
				
				if(typeof filevalues == "object" && typeof filevalues.length == "number") {
					if(pluginsetting.preference && pluginsetting.preference.minified){
						if(!pluginsetting.webappsetting.integration_minified)
							pluginsetting.webappsetting.integration_minified = {};
						
						pluginsetting.webappsetting.integration_minified[key] = [pluginuri + '/js/integration.' + key + '.min.js'];
					}
				} else if(typeof filevalues == "object") {
					for(var keyIndex in filevalues) {
						if(typeof filevalues[keyIndex] == "object" && typeof filevalues[keyIndex].length == "number" ){
							if(pluginsetting.preference && pluginsetting.preference.minified){
								if(!pluginsetting.webappsetting.integration_minified)
									pluginsetting.webappsetting.integration_minified = {};
								
								pluginsetting.webappsetting.integration_minified[keyIndex] = [pluginuri + '/js/integration.' + keyIndex + '.min.js'];
							}
						}
					}
				}
			}
		}
		
		instance.integration[pluginsetting.id] = pluginsetting.integration;
		instance.emit("integration.ready", pluginsetting.id);
	}
//	else if(pluginsetting && pluginsetting.webappsetting && pluginsetting.webappsetting.integration) {
//		// webapp integration specifying only the javascript
//		// @TODO need to implement integration of css files from plugin as well.
//
//		if(!pluginuri && pluginsetting.webappuri)
//			pluginuri = pluginsetting.webappuri;
//		else if(!pluginuri && pluginsetting.pluginsetting && pluginsetting.webappsetting.webappuri)
//			pluginuri = pluginsetting.webappsetting.webappuri;
//		
//		for(var key in pluginsetting.webappsetting.integration) {
//			var filevalues = pluginsetting.webappsetting.integration[key];
//			if(typeof filevalues == "object") { // update dynamic path
//				correctDynamicPath(filevalues, {uri:pluginuri});
//			}
//			
//			if(typeof filevalues == "object" && typeof filevalues.length == "number") {
//				if(pluginsetting.preference && pluginsetting.preference.minified){
//					if(!pluginsetting.webappsetting.integration_minified)
//						pluginsetting.webappsetting.integration_minified = {};
//					
//					pluginsetting.webappsetting.integration_minified[key] = [pluginuri + '/js/integration.' + key + '.min.js'];
//				}
//			} else if(typeof filevalues == "object") {
//				for(var keyIndex in filevalues) {
//					if(typeof filevalues[keyIndex] == "object" && typeof filevalues[keyIndex].length == "number" ){
//						if(pluginsetting.preference && pluginsetting.preference.minified){
//							if(!pluginsetting.webappsetting.integration_minified)
//								pluginsetting.webappsetting.integration_minified = {};
//							
//							pluginsetting.webappsetting.integration_minified[keyIndex] = [pluginuri + '/js/integration.' + keyIndex + '.min.js'];
//						}
//					}
//				}
//			}
//		}
//		
//		instance.integration[pluginsetting.id] = pluginsetting.webappsetting.integration;
//		
//		instance.emit("integration.ready", pluginsetting.id);
//	}
}

var isPluginActive = function(pluginsetting){
	if(!pluginsetting)
		return false;
	
	return !(!pluginsetting.installed 
		|| pluginsetting.disabled 
		|| (pluginsetting.missingnpmdependencies && pluginsetting.missingnpmdependencies.length > 0)
		|| (pluginsetting.missingdependencies && pluginsetting.missingdependencies.length > 0)
		|| (pluginsetting.missingresources && pluginsetting.missingresources.length > 0)
		|| (pluginsetting.serviceerrors && pluginsetting.serviceerrors.length > 0)
	);
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
var loadPluginURI = function(instance, pluginloader, pluginsetting, callback){
	if(pluginsetting.plugintype == 'webapp') {
		var webappuri = pluginsetting.webappuri || pluginsetting.id;
		
		var tmp_path = pluginloader.getTempPath(pluginsetting);//tmp_path + "/" + pluginsetting.id;
		
		if(pluginsetting.installeddir && pluginsetting.installed) {
			instance.getLogger().debug('Pluginloader:loadPluginURI' , webappuri + ' << -- ' + pluginsetting.installeddir);
	
			pluginloader.getServerInstance().useStaticRouter(webappuri, (pluginsetting.installeddir + '/html5'));
			pluginloader.getServerInstance().useStaticRouter(webappuri+ "/html5", (pluginsetting.installeddir + '/html5'));
			
			// use theme specific folder before  
			if(pluginsetting && pluginsetting.webappsetting && pluginsetting.webappsetting.theme)
				pluginloader.getServerInstance().useStaticRouter(webappuri, (tmp_path + "/" + pluginsetting.webappsetting.theme));
			
			pluginloader.getServerInstance().useStaticRouter(webappuri, (tmp_path));
			
			pluginloader.getServerInstance().useStaticRouter(webappuri + "/service", (tmp_path));//@TODO too many connect static
			pluginloader.getServerInstance().useStaticRouter(webappuri + "/view", (tmp_path + "/templates"));//@TODO too many connect static
			
			if(pluginsetting.theme)
				pluginloader.themeIndex[webappuri]=pluginsetting.theme;
			
			if(pluginsetting.webappsetting.dynamicwebapp)
				loadDynamicPlugin(instance, pluginloader, webappuri, pluginsetting);
		}else {
			instance.getLogger().warn('Pluginloader:loadPluginURI', pluginsetting.id + ' is not installed or disabled ');
		}
	} else if (pluginsetting.plugintype == 'theme') {
		var tmp_path = pluginloader.getTempPath(pluginsetting);
		
		pluginloader.getServerInstance().useStaticRouter('/theme' + pluginsetting.themeuri, (tmp_path));
		
		if(pluginsetting.installeddir && pluginsetting.installed && fs.existsSync(pluginsetting.installeddir)){
			pluginloader.getServerInstance().useStaticRouter('/theme' + pluginsetting.themeuri, (pluginsetting.installeddir));
		}
		
		loadDynamicPlugin(instance, pluginloader, '/theme' + pluginsetting.themeuri, pluginsetting);
	}
	
	if(callback)
		callback();
}

var loadDynamicPlugin = function(instance, pluginloader, pluginuri, pluginsetting){
	var dynplugin = new simpleportal.Dynamicplugin({}, pluginsetting, pluginloader);
	
	// how about setting this
	pluginloader.getServerInstance().getServer().use(pluginuri + '/pages', function(){
		dynplugin.setWebpageDynamicLayout.apply(dynplugin, arguments);
	});
	
	pluginloader.getServerInstance().getServer().use(pluginuri, dynplugin.routerhandle);
	
	pluginloader._dynplugins[pluginsetting.id] = dynplugin;
	
	// check whether it is mobile friendly
	var typesettingfield =  pluginsetting.plugintype + 'setting';
	if(pluginsetting.plugintype == 'webapp' 
		&& pluginsetting[typesettingfield] 
		&& pluginsetting[typesettingfield].mobile 
		&& pluginsetting[typesettingfield].webapptype != "backbonemobile" ){
		var mobilepluginsetting = util.extendJSON(
			{dynamicwebapp:false}, pluginsetting,
			{
				webappsetting:{
					webapptype:"backbonemobile"
				}
			}, 
			{webappsetting:pluginsetting[typesettingfield].mobilesetting}
		);
 
		mobilepluginsetting.htmldir = mobilepluginsetting.htmldir + "/mobile";
		mobilepluginsetting.pluginsubtype = mobilepluginsetting[typesettingfield].webapptype;
//		mobilepluginsetting[typesettingfield].css=[];
		mobilepluginsetting.webappuri = pluginuri + "/mobile";
		
		delete mobilepluginsetting[typesettingfield].mobile;
		var mobileplugin =  new simpleportal.Dynamicplugin({}, mobilepluginsetting, pluginloader);
		
		pluginloader.getServerInstance().getServer().use(pluginuri + "/mobile", mobileplugin.routerhandle);
		pluginloader.getServerInstance().getServer().use(pluginuri + "/mobile/icons/", function(request, response, next){
			if(request.url && request.url.indexOf(".png") != -1){
				var iconurl = request.url.replace(".png", "") + "/icons/plugin.png";
				
				response.redirect(iconurl, 302, request);
			} else
				next();
		});
	} else if(pluginsetting[typesettingfield]
		&& pluginsetting[typesettingfield].mobile){
		var mobilepluginsetting = util.extendJSON(
			{}, pluginsetting, {themesetting:{}}
		);
		
		mobilepluginsetting.themesetting ={};
		mobilepluginsetting = util.extendJSON(
			mobilepluginsetting, 
			{themesetting:pluginsetting[typesettingfield].mobilesetting}
		);
 
		mobilepluginsetting.htmldir = mobilepluginsetting.htmldir + "/mobile";
		mobilepluginsetting.themeuri = pluginuri + "/mobile";
		
		delete mobilepluginsetting[typesettingfield].mobile;
		var mobileplugin =  new simpleportal.Dynamicplugin({}, mobilepluginsetting, pluginloader);
		pluginloader.getServerInstance().getServer().use(pluginuri + "/mobile", mobileplugin.routerhandle);
	}
}

/**
 * To remove the control files, when app is build again, or configuration is change, or minfied 
 * clearControlFiles
 * @param plugindetails plugin details
 */
function clearControlFiles(instance, plugindetails){
	if(plugindetails && plugindetails.id){
		var controlpath = ""
			
		var controlfiles = [
		    instance.getTempPath(plugindetails, "js/appconfig.js"),
		    instance.getTempPath(plugindetails, "js/app.js"),
		    instance.getTempPath(plugindetails, "css/app.css")
	    ];
		
		if(plugindetails && plugindetails.webappsetting && plugindetails.webappsetting.theme){
			controlfiles.push(instance.getTempPath(plugindetails, plugindetails.webappsetting.theme) + "/js/appconfig.js");
			controlfiles.push(instance.getTempPath(plugindetails, plugindetails.webappsetting.theme) + "/js/app.js");
			controlfiles.push(instance.getTempPath(plugindetails, plugindetails.webappsetting.theme) + "/app.css");
		}
		simpleportal.util.removeIfExists(controlfiles, function(error){});
	}
}


