"use strict";
var simpleportal = require("./../simpleportal"),	
	exec = require('child_process').exec,
	path = require('path'),
	fs = require('fs'),
	util =require("./../util"),
	zlib = require('zlib');

/**
 * @class PluginUtil
 * @module util
 * 
 * @constructor
 * @param {} options Options for the plugin util
 * 
 * @return instance Instance of the pluginutil
 */
var pluginUtil = function(options) {
	var instance = this;
	
	this.configuration = simpleportal.util.clone(PluginUtil.defaults);
	
	if(options)
		for(var keys = Object.keys(options), l = keys.length; l; --l) {
			this.configuration[ keys[l-1] ] = options[ keys[l-1] ];
		}
	
	this.builderconfig=util.clone(PluginUtil.builderconfig);
	
	return instance;
}

/**
 * @property defaults
 * @private
 */
PluginUtil.defaults = {};

/**
 * @property builderconfig
 * @private
 */
PluginUtil.builderconfig = {
	webapp:{
		excludes:['js/views/*', 'js/models/*', 'app.js', 'main.js', 'mvc.js', 'models.js', 'views.js', 'app.css']
	},
	util:{
		excludes:['*/downloads/*', '*/models/*', '*/views/*', '*/backboot/source/*', '*/bootstrap/2.3.2/*', '*/bootstrap/2.1.0/*']
	}
}

/**
 * To scan directory for plugins
 * 
 * @method scanDirectory
 * @param {} plugindir
 * @param {callback} callback The callback to excecute when complete
 * @return 
 */
PluginUtil.prototype.scanDirectory = function(plugindir, callback){
	var instance = this;
	
	var plugins = [];
	if(fs.existsSync(plugindir)){
		fs.readdirSync(plugindir).forEach(function(filename){
		    var autoplugin = {id:filename};
		    
		    simpleportal.pluginloader.readPluginSetting(autoplugin, plugindir);
		    
		    plugins.push(autoplugin);
		});
	}
	callback(null, plugins);
}

/**
 * To ddownload file from a remote server
 * 
 * @method getFile
 * 
 * @param {} url url for the remote server
 * @param {} path uri path for the file
 * @param {callback} cb The callback to excecute when complete
 */
PluginUtil.prototype.getFile =  function(url, path, cb) {
	var instance = this;
	
	var http_or_https = require('http');
    if (/^https:\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/.test(url)) {
        http_or_https = require('https');
    }
    
    http_or_https.get(url, function(response) {
        var headers = JSON.stringify(response.headers);
        switch(response.statusCode) {
            case 200:
                var file = fs.createWriteStream(path);
                response.on('data', function(chunk){
                    file.write(chunk);
                }).on('end', function(){
                    file.end();
                    cb(null);
                });
                break;
            case 301:
            case 302:
            case 303:
            case 307:
            	instance.getFile(response.headers.location, path, cb);
                break;
            default:
                cb(new Error('Server responded with status code ' + response.statusCode));
        }
    })
    .on('error', function(err) {
        cb(err);
    });
};

/**
 * To check dependencies for a plugin
 * 
 * @method checkDependencies
 * 
 * @param {} pluginsettings
 * @param {callback} callback The callback to excecute when complete
 */
PluginUtil.prototype.checkDependencies = function (pluginsettings, callback){
	var instance = this;
	
	if(pluginsettings.missingdependencies && pluginsettings.missingdependencies.length > 0)
		callback('Please Install the dependant plugin before installing the plugin - '+ pluginsettings.id);
	else
		callback(null)
}

/**
 * To update a plugin 
 * 
 * @method updatePlugin
 * 
 * @param {} pluginsettings plugin configuration
 * @param {callback} callback The callback to excecute when complete
 */
PluginUtil.prototype.updatePlugin = function (pluginsettings, callback){
	var instance = this;
	
	if(pluginsettings.curversion){
		util.deleteFolderRecursiveSync(pluginsettings.installeddir);
		
		var downloaddir = util.getServerPath(instance.configuration.downloaddir); 
		var deployedroot = util.getServerPath(instance.configuration.webappdir||'resources/private');
		
		instance.copyRecursiveSync(downloaddir  + '/' + pluginsettings.id, pluginsettings.installeddir);
		
		util.deleteFolderRecursiveSync(downloaddir  + '/' + pluginsettings.id);
		
		callback(null, 'Successfully updated plugin - ' + pluginsettings.id  + ' from ' + pluginsettings.curversion + ' >> ' + pluginsettings.version, null);

		simpleportal.pluginloader.loadPlugin(pluginsettings, function(error, newpluginsettings){
			callback(error, pluginsettings);
		});
	} else if(!pluginsettings.installed){
		var downloaddir = util.getServerPath(instance.configuration.downloaddir);
		var deployedroot = util.getServerPath(instance.configuration.webappdir||'resources/private');
		
		instance.copyRecursiveSync(downloaddir  + '/' + pluginsettings.id, deployedroot + '/' + pluginsettings.id)
		util.deleteFolderRecursiveSync(downloaddir  + '/' + pluginsettings.id);
		
		simpleportal.pluginloader.loadPlugin(pluginsettings, function(error, newpluginsettings){
			callback(error, pluginsettings);
		});
	}else
		callback('We will update the plugin to the new version !! - ' + pluginsettings.curversion + ' >> ' + pluginsettings.version, null);
}

/**
 * To copy files recursively
 * 
 * @method copyRecursiveSync
 * 
 * @param {} src Source directory
 * @param {} dest Destination directory
 */
PluginUtil.prototype.copyRecursiveSync = function(src, dest) {
	var instance = this;
	
	var exists = fs.existsSync(src);
	var stats = exists && fs.statSync(src);
	var isDirectory = exists && stats.isDirectory();
	
	if (exists && isDirectory) {
		fs.mkdirSync(dest);
		
		fs.readdirSync(src).forEach(
			function(childItemName) {
				instance.copyRecursiveSync(path.join(src, childItemName), path.join(
						dest, childItemName));
			}
		);
	} else {
		fs.linkSync(src, dest);
	}
};

/**
 * To un install a plugin
 * 
 * @method uninstallPlugin
 * @param {} pluginsettings plugin configuration
 * @param {callback} callback The callback to excecute when complete
 */
PluginUtil.prototype.uninstallPlugin = function(pluginsettings, callback){
	var instance = this;
	simpleportal.pluginloader.readPluginSetting(pluginsettings);
	
	if(pluginsettings.installed){
		if(!fs.existsSync(pluginsettings.installeddir + '-' + pluginsettings.version)){
			fs.renameSync(pluginsettings.installeddir , pluginsettings.installeddir + '-' + pluginsettings.version);
			
			if(fs.existsSync(pluginsettings.installeddir + '-' + pluginsettings.version + '/plugin.json'))
				util.deleteFolderRecursiveSync(pluginsettings.installeddir + '-' + pluginsettings.version + '/plugin.json');
			
			callback(null);	
		}else{
			fs.renameSync(pluginsettings.installeddir , pluginsettings.installeddir + '-' + pluginsettings.version);
			
			if(fs.existsSync(pluginsettings.installeddir + '-' + pluginsettings.version + '/plugin.json'))
				util.deleteFolderRecursiveSync(pluginsettings.installeddir + '-' + pluginsettings.version + '/plugin.json');
			
			callback(null);
		}	
	}else{
		callback('Plugin not found to uninstall!! - '+ pluginsettings.id);
	}
}

/**
 * To install a plugin
 * @method installPlugin
 * @param {} pluginsettings plugin configuration
 * @param {callback} callback The callback to excecute when complete
 */
PluginUtil.prototype.installPlugin = function(pluginsettings, callback){
	var instance = this;
	
	simpleportal.pluginloader.readPluginSetting(pluginsettings);
	
	var downloaddir = util.getServerPath(instance.configuration.downloaddir||rootdir + '/downloads');
	var newpluginsettings = simpleportal.pluginloader.readPluginSetting({id:pluginsettings.id}, downloaddir);
	
	if(pluginsettings.installed) {
		var curversion = Number(pluginsettings.curversion);
		var newversion = Number(newpluginsettings.version);
		
		if(newversion == curversion)
			callback('Plugin is already installed with the version - ' +  pluginsettings.curversion, null);
		else if(newversion > curversion){
			instance.checkDependencies(newpluginsettings, function(error){
				if(error)
					callback(error, null);
				else{
					instance.updatePlugin(pluginsettings, callback);	
				}
			});
		} else
			callback('You are trying to install an older version !! - ' + pluginsettings.curversion + ' >> ' + pluginsettings.version, null);
	}else{
		instance.updatePlugin(pluginsettings, callback);
	}
}

/**
 * To upload a plugin
 * 
 * @method uploadPlugin
 * 
 * @param {} pluginsettings plugin configuration
 * @param {callback} callback The callback to excecute when complete
 */
PluginUtil.prototype.uploadPlugin = function (pluginsettings, callback){
	var instance = this;
	
	var downloaddir = util.getServerPath(instance.configuration.downloaddir || rootdir + '/downloads');
	util.checkDirSync(downloaddir);
	
	if(fs.existsSync(pluginsettings.file)){
		var escaped_downloaddir = downloaddir.replace(/ /g, '\\ ');
		
		var cmd_bckup = 'cd ' + escaped_downloaddir + ' && tar -xzvf ' + pluginsettings.file;//' -C '+ path.normalize(pluginsettings.name.replace('.gz', ''));
		
		exec(cmd_bckup, function (error, stderr, stdout) {
			if(stderr||error){
				callback(error, pluginsettings);
			}else{
				fs.readdirSync(downloaddir).forEach(function(filename){
					if(fs.lstatSync(downloaddir + '/' + filename).isDirectory()){
					   if(fs.existsSync(downloaddir + '/' + filename +'/plugin.json')){
						   	var downloadpluginsetting = util.readJSONFile(downloaddir + '/' + filename +'/plugin.json');
						   	
							instance.installPlugin(downloadpluginsetting, callback);
					   }else{
						   util.deleteFolderRecursiveSync(downloaddir + '/' + filename);
						   
						   callback('Not a valid plugin!!');
					   }
				   }
				});
			}
		});
	}
}

/**
 * To download a plugin
 * 
 * @method downloadPlugin
 * @param {} pluginsettings plugin configuration
 * @param {callback} callback The callback to excecute when complete
 */
PluginUtil.prototype.downloadPlugin = function (pluginsettings, callback){
	var instance = this;
	
	var pluginurl = 'http://localhost:9333/api/plugin';//default url with default port and host
	
	if(instance.configuration.server.host)
		pluginurl = pluginurl.replace('localhost', instance.configuration.server.host);
	
	if(instance.configuration.server.port)
		pluginurl = pluginurl.replace('9333', instance.configuration.server.port);
	
	if(instance.configuration.server.secure)
		pluginurl = pluginurl.replace('http://', 'https://');
	
	var downloadurl = pluginurl + '/'+ pluginsettings.id +'/download';
	
	pluginsettings.file = util.getServerPath(instance.configuration.downloaddir + '/' + pluginsettings.id+ '/' + pluginsettings.id + '.gz');
	
	instance.getFile(downloadurl, pluginsettings.file, function(error, data){
		callback(error, pluginsettings);
	});
}

/*
 * Exporting the PluginUtil service.
 */
module.exports = {
	getInstance: function(configuration) {
		return new PluginUtil(configuration);
	}
}