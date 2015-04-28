
/**
 * Plugin loader middleware for `simpleportal.Server`
 *
 * @property pluginloader
 * @for simpleportal
 * @type {pluginloader}
 * @static
 */

/**
 * Plugin loader middleware for `simpleportal.Server`
 * 
 * @class pluginloader
 * @module middleware
 * @static
 */
var PluginLoader = module.exports = {};

var path = require('path');
var fs = require('fs');
var util = require('./util');

var simpleportal = require('./simpleportal');

var logger = require("./logger");
var router = require('./router');

PluginLoader.services={};
PluginLoader.services.service={};

PluginLoader.plugindirs = [];

PluginLoader.plugindir = 'resources/plugin';
PluginLoader.pluginUrl='/plugin';

/**
 * To get the details of a plugin
 * 
 * @method getPluginDetails
 * 
 * @param {string} pluginid id of the plugin 
 * 
 * @return {object} plugindetails object of the plugin setting
 */
PluginLoader.getPluginDetails = function(pluginid){
	var plugindetails;
	
	return plugindetails;
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
__loadPlugin = function(pluginsetting, configuration, dbInstance, callback){
	logger.getInstance().info('Simple Portal : pluginloader', '__loadPlugin  -- ' + pluginsetting.id);
	
	if(pluginsetting.plugintype == 'webapp'){
		if(!pluginsetting['public'] || pluginsetting['public']+'' != 'true'){
			if(PluginLoader.configuration.webapps)
				PluginLoader.configuration.webapps.push(pluginsetting.id);
			else
				PluginLoader.configuration.webapps = [pluginsetting.id];
			
			if(PluginLoader.configuration.webappuris)
				PluginLoader.configuration.webappuris.push(pluginsetting.webappuri||'/'+pluginsetting.id);
			else
				PluginLoader.configuration.webappuris = [pluginsetting.webappuri||'/'+pluginsetting.id];
		}
		
		if(!pluginsetting.disabled&&pluginsetting.installed && fs.existsSync(pluginsetting.installeddir + '/startup'))
			simpleportal.startuploader.loadStartups({configuration:pluginsetting, startupdir:pluginsetting.installeddir + '/startup'}, function(){
				console.log('Loading startups for plugin - '+ pluginsetting.id)
			});
	}else {
		logger.getInstance().info('Simple Portal : pluginloader', '__loadPlugin  -- ' + pluginsetting.id  +' -- is -- ' + pluginsetting.plugintype);
	}
	
	if(!pluginsetting.disabled&&pluginsetting.installed)
		if(PluginLoader.plugins[pluginsetting.plugintype])
			PluginLoader.plugins[pluginsetting.plugintype].push(pluginsetting);
		
	if(!pluginsetting.disabled&&pluginsetting.installed && pluginsetting.servicedir){
		if(fs.existsSync(pluginsetting.installeddir + '/' + pluginsetting.servicedir)){
			var services_ = {};
			if(pluginsetting.configuration&&pluginsetting.configuration.services)
				services_ =pluginsetting.configuration.services;
			
			simpleportal.serviceloader.loadServices({servicedir:pluginsetting.installeddir + '/' + pluginsetting.servicedir, services:services_}, callback);
		}else
			callback();
	} else if(!pluginsetting.disabled){
		logger.getInstance().info('Simple Portal : pluginloader', '__loadPlugin  -- ' + pluginsetting.id  +' -- is -- ' + pluginsetting.installeddir + ' -- '+ pluginsetting.installed);
		callback();
	} else
		callback();
}

/**
 * To register a plugin within a directory
 * 
 * @method registerPlugin
 * @param {} file plugin directory path
 * @param {} configuration 
 * @param {} dbInstance OPtional db instance if not mentioned will use the default instance
 * @param {callback} callback The callback to excecute when complete
 * @private
 * @deprecated 
 */
PluginLoader.registerPlugin = function(file, configuration, dbInstance, callback){
	logger.getInstance().info('Simple Portal : pluginloader', 'registerPlugin  -- ' + file);
	
	if( fs.existsSync(file) && !/\.$/.test(file)){
		var path = fs.realpathSync(file);
		var startindex=0;
		if(file.lastIndexOf('/') >= 0)
			startindex=file.lastIndexOf('/')+1;
		var plugin = file.substring(startindex);
		var pluginsetting = {id:plugin};
		
		PluginLoader.readPluginSetting(pluginsetting);
		
		if(pluginsetting.plugintype == 'webapp'){
			if( !pluginsetting['public'] || pluginsetting['public']+'' != 'true' ){
				if(PluginLoader.configuration.webapps)
					PluginLoader.configuration.webapps.push(pluginsetting.id);
				else
					PluginLoader.configuration.webapps = [pluginsetting.id];
				
				if(PluginLoader.configuration.webappuris)
					PluginLoader.configuration.webappuris.push(pluginsetting.webappuri||'/'+pluginsetting.id);
				else
					PluginLoader.configuration.webappuris = [pluginsetting.webappuri||'/'+pluginsetting.id];
			}	
		}else {
			logger.getInstance().info('Simple Portal : pluginloader', 'registerPlugin  -- ' + pluginsetting.id  +' -- is -- ' + pluginsetting.plugintype);
		}
		
		if(!pluginsetting.disabled&&pluginsetting.installed && pluginsetting.servicedir){
			if(PluginLoader.plugins[pluginsetting.plugintype])
				PluginLoader.plugins[pluginsetting.plugintype].push(pluginsetting);
			
			if(fs.existsSync(pluginsetting.installeddir + '/' + pluginsetting.servicedir)){
				simpleportal.serviceloader.registerServices(pluginsetting.installeddir + '/' + pluginsetting.servicedir, pluginsetting.configuration, function(error){
					callback(error);	
				});
			}else
				callback();
		} else if(!pluginsetting.disabled){
			logger.getInstance().info('Simple Portal : pluginloader', 'registerPlugin  -- ' + pluginsetting.id  +' -- is -- ' + pluginsetting.installeddir);
			callback();
		}else
			callback();
	}else
		callback('No such plugin  found - ' + file);
}

/**
 * To get all the plugins registered 
 * 
 * @method getPlugins
 * @param {string} type plugin type if not mentioned complete plugins will be send 
 * 
 * @return object or array accoring to the plugin type
 */
PluginLoader.getPlugins = function(type){
	if(type && PluginLoader.plugins[type])
		return PluginLoader.plugins[type];
	else
		return PluginLoader.plugins;
}

/**
 * To load plugin froma list
 * 
 * @method loadPluginFromList
 * 
 * @param {} pluginsettinglist
 * @param {} configuration
 * @param {callback} callback The callback to excecute when complete
 * 
 * @private
 */
loadPluginFromList=function(pluginsettinglist, configuration, callback){
	var __registerPlugins_count = pluginsettinglist.length,
		__registerPlugins_count_fincount=0,
		errors;
	
	for(var i in pluginsettinglist){
		var pluginsetting = pluginsettinglist[i];
		
		__loadPlugin(pluginsetting, configuration, PluginLoader.dbInstance, function(error){
			if(error){
				errors=errors||[];
				errors.push(error);
			}	
			
			if(__registerPlugins_count_fincount++ == __registerPlugins_count-1)
				callback(errors);
		});
	}	
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
PluginLoader.unLoadPluginFromDirectory=function(plugindir, configuration, callback){
	logger.getInstance().info('Simple Portal : PluginLoader : unLoadPluginFromDirectory', plugindir);
	
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
			
			pluginsetting = PluginLoader.readPluginSetting(pluginsetting, plugindir);
			
			if(pluginsetting&&!pluginsetting.disabled&&pluginsetting.installed)
				pluginsettinglist.push(pluginsetting);
		}
		
		loadPluginFromList(pluginsettinglist, configuration, callback);
	}
};

/**
 * To get all the plugins in the folder, depp search
 * @method getPluginFolders
 * @param plugindir Directry where plugins will be searched for
 * @return array of plugin folders
 */
PluginLoader.getPluginFolders=function(plugindir, deepindex, cndeepindex){
	var pluginlist = [],
		cndeepindex=cndeepindex||0;
	
	var subfolders = fs.readdirSync(plugindir).filter(function(v){
    	return !/^\./.test(v) && fs.statSync(path.join(plugindir, v)).isDirectory();
    });
    
    subfolders.forEach(function(filename) {
        var file = plugindir + '/' + filename;
        if (fs.existsSync(file + '/plugin.json')){
        	pluginlist.push({installeddir:file, id:filename})
        	//pluginlist.push(file);
        } else if (!simpleportal.util.jsonarraycontains(pluginlist, 'installeddir', file) && deepindex > cndeepindex){
        	//pluginlist = pluginlist.concat(PluginLoader.getPluginFolders(file, 1));
        	pluginlist= pluginlist.concat(PluginLoader.getPluginFolders(file, cndeepindex++));
        }
    });
    
    return pluginlist;
};

/**
 * To load plugin from a directory
 * 
 * @method loadPluginFromDirectory
 * @param {} plugindir Plugin directory
 * @param {} configuration
 * @param {callback} callback The callback to excecute when complete
 * @return 
 */
PluginLoader.loadPluginFromDirectory=function(plugindir, configuration, callback){
	if(!PluginLoader.plugins)
		PluginLoader.plugins={util:[], webapp:[], theme:[]};
	
	if(!fs.existsSync(plugindir))
		callback();
	else{
		logger.getInstance().info('Simple Portal : PluginLoader : loadPluginFromDirectory', plugindir);
		
		var pluginlist = PluginLoader.getPluginFolders(plugindir, 3),
			pluginsettinglist = []; 
		
		for(var i in pluginlist){
			var pluginsetting = pluginlist[i];
			
			pluginsetting = PluginLoader.readPluginSetting(pluginsetting, plugindir);
			
			if(!pluginsetting.installeddir)
				pluginsetting.installeddir = plugindir + '/' + pluginsetting.id;
			
			if(pluginsetting&&!pluginsetting.disabled&&pluginsetting.installed)
				pluginsettinglist.push(pluginsetting);
		}
		
		pluginsettinglist = pluginsettinglist.sort(function(a, b){
			return (a.priority||0) > (b.priority||0);
		});
		
		if(pluginsettinglist&&pluginsettinglist.length >0){
			if(!simpleportal.util.arraycontains(PluginLoader.plugindirs, plugindir) && plugindir != PluginLoader.plugindir){
				PluginLoader.plugindirs.push(plugindir);
			}	
			
			loadPluginFromList(pluginsettinglist, configuration, callback);
		}else
			callback();
	}
};

/**
 * To update the configuration of the `simpleportal.pluginloader`
 * 
 * @method updateConfiguration
 * @param {} configuration Configuration you want to update
 */
PluginLoader.updateConfiguration=function(configuration){
	PluginLoader.configuration=configuration;
}

/**
 * To read plugin settings from the plugin.json file
 * 
 * @method readPluginSetting
 * 
 * @param {} pluginsettings plugin details
 * @param {} plugindir Directry where plugin will be searched for
 * 
 * @return {object} pluginsettings parsed json data from the plugin.json file 
 */
PluginLoader.readPluginSetting = function(pluginsettings, plugindir){
	var deployedroot = simpleportal.util.getServerPath(plugindir||PluginLoader.plugindir);
	
	if(pluginsettings['public']&&pluginsettings.publicappdir)
		deployedroot = simpleportal.util.getServerPath(pluginsettings.publicappdir);
	
	if(pluginsettings['public']&&pluginsettings.plugintype=='theme')
		deployedroot = deployedroot + '/themes';
	
	var deployedpath = deployedroot + '/' + pluginsettings.id;
	
	if(!fs.existsSync(deployedpath) &&pluginsettings.installeddir && pluginsettings.installeddir.indexOf(plugindir) != -1) {
		deployedpath = simpleportal.util.getServerPath(pluginsettings.installeddir);
	}
	
	logger.getInstance().info('Simple Portal : PluginLoader : readPluginSetting', 'reading plugin settings -' + deployedpath);
	
	if(fs.existsSync(deployedpath)){
		pluginsettings.installeddir=deployedpath;
		
		if(fs.existsSync(deployedpath + '/plugin.json')){
			var exisitingpluginsetting = simpleportal.util.readJSONFile(deployedpath + '/plugin.json');
			
			if(exisitingpluginsetting&&exisitingpluginsetting.version)
				pluginsettings.curversion=exisitingpluginsetting.version;

			pluginsettings.installed=true;
			pluginsettings = simpleportal.util.extendJSON(pluginsettings, exisitingpluginsetting);
		}
		
		if(pluginsettings.dependencies&&pluginsettings.dependencies.length > 0){
			pluginsettings.missingdependencies=[];
			
			for(var index in pluginsettings.dependencies){
				if(pluginsettings.dependencies[index] != pluginsettings.id){ // infinite loop in case self dependancy
					var dependappid = pluginsettings.dependencies[index],
						missing = true;
					
					var setting_ = PluginLoader.readPluginSetting({id:dependappid}); // check this dependency is missing!!
					missing = !setting_.installed;
					
					if(missing){
						for(var i in PluginLoader.plugindirs){
							if(missing){
								var plugindir_ = PluginLoader.plugindirs[i];
								var setting_ = PluginLoader.readPluginSetting({id:dependappid}, plugindir_); // check this dependency in alternate directories
								
								missing = !setting_.installed;
							}
						}
					} 
					
					if(missing)
						pluginsettings.missingdependencies.push(setting_.id);
				}
			}
		}
	}else{
		pluginsettings.installed=false;
		
		delete pluginsettings.installeddir;
		delete pluginsettings.missingdependencies;
	}
	
	return pluginsettings;
}

/**
 * To load a plugin based on the pluginsettings provided
 * 
 * @method loadPlugin
 * 
 * @param {} pluginsetting plugin settings
 * @param {callback} callback The callback to excecute when complete
 */
PluginLoader.loadPlugin = function(pluginsetting, callback){
	var instance = this;
	
	logger.getInstance().debug('Simple Portal : loadPlugin', 'Loading plugins --' + pluginsetting.installeddir);
	
	simpleportal.pluginloader.readPluginSetting(pluginsetting);
	
	__loadPlugin(pluginsetting, pluginsetting.configuration, PluginLoader.dbInstance, callback);
}

PluginLoader.services.service['GET /:id'] = function(request, response, callback){
	if(request.user.role&&request.user.role=='superadmin')
		callback(null, getServiceDetails(request.pathGroup))
	else
		callback('Permission denied');
}

PluginLoader.services.service['GET /'] = function(request, response, callback){
	if(request.user.role&&request.user.role=='superadmin'){
		var result =[];
		for(var subModule in PluginLoader){
			var details = PluginLoader.getPluginDetails(subModule);
			if(details)
				result.push(details);
		}
		callback(null, result);
	} else
		callback('Permission denied');
};

/**
 * To unload a plugin from the `simpleportal.Server`
 * 
 * @method unLoadPlugins
 * @param {} configuration plugin configuration
 * @param {callback} callback The callback to excecute when complete
 */
PluginLoader.unLoadPlugins = function(configuration, callback){
	var plugindir = configuration&&configuration.plugindir ?  configuration.plugindir : PluginLoader.plugindir;
	logger.getInstance().info('Simple Portal : pluginloader', 'unLoadPlugins  -- ' + plugindir);
	
	var errors = [];
	if(!fs.existsSync(plugindir))
		callback();
	else{
		var stats = fs.lstatSync(plugindir);
		
		if (stats.isDirectory()) {
			PluginLoader.__unLoadPlugins(plugindir, {}, function(error){
				if(error)
					errors.push(error);
				
				if(callback)
					callback(errors);
			});
		}else if(callback)
			callback();
	}
}

/**
 * To load plugins based ona plugin directory confoguration
 * 
 * @method loadPlugins
 * 
 * @param {} configuration Configuration for the plugin directory
 * @param {callback} callback The callback to excecute when complete
 */
PluginLoader.loadPlugins = function(configuration, callback){
	var plugindir = configuration&&configuration.plugindir ?  configuration.plugindir : PluginLoader.plugindir;
	
	logger.getInstance().info('Simple Portal : pluginloader', 'loadPlugins  -- ' + plugindir);
	
	if(!PluginLoader.plugins)
		PluginLoader.plugins={util:[], webapp:[], theme:[]};
	
	var errors;
	if(!fs.existsSync(plugindir))
		callback();
	else{
		var stats = fs.lstatSync(plugindir);
		
		if (stats.isDirectory()) {
			PluginLoader.loadPluginFromDirectory(plugindir, {}, function(error){
				if(error){
					errors=errors||[];
					errors.push(error);	
				}	
				
				if(callback)
					callback(errors);
			});
		}else if(callback)
			callback();
	}
};

/**
 * To initialize the router required for the `simpleportal.Server`
 * 
 * @method initRouter
 * @param {} router router object where the oauth handlers will be registered
 * @param {callback} callback The callback to excecute when complete
 */
PluginLoader.initRouter = function(router, callback){
	logger.getInstance().info('Simple Portal - PluginLoader : initRouter', 'Initializing plugin routers');
	
	router.dispatch.addServiceHandlers(PluginLoader, PluginLoader.pluginUrl, simpleportal.serviceloader.call);
	router.dispatch.addServiceGlobalHandlers(PluginLoader, PluginLoader.pluginUrl, simpleportal.serviceloader.call);
	
	if(callback)
		callback();
}

new simpleportal.CRUDService({name:'pluginloader', service:PluginLoader, modify:true, collection:'pluginloader', userrole:'superadmin'});