/**
 * Startup loader middleware for `simpleportal.Server`
 *
 * @property startuploader
 * @for simpleportal
 * @type {startuploader}
 * @static
 */

/**
 * Startup loader middleware for `simpleportal.Server`
 * 
 * @class startuploader
 * @module middleware
 * @static
 */
var StartupLoader = module.exports = {};

var fs = require('fs');

var simpleportal = require('./simpleportal');

var logger = require("./logger");

StartupLoader.startupdir = 'startup';

/**
 * Description
 * @method loadStartups
 * @param {} configuration
 * @param {} callback
 * @return 
 */
StartupLoader.loadStartups = function(configuration, callback){
	var startupdir_ = configuration&&configuration.startupdir ?  configuration.startupdir : StartupLoader.startupdir;
	logger.getInstance().info('Simple Portal : startuploader', 'loadStartups  -- ' + startupdir_);
	
	if(fs.existsSync(startupdir_)){
		var stats = fs.lstatSync(startupdir_);
		if (stats.isDirectory()) {
			loadStartups(startupdir_, false, callback);
		}else if(callback)
			callback();	
	}else if(callback)
		callback();
}

/**
 * Description
 * @method loadStartupByProps
 * @param {} startupprops
 * @return 
 */
function loadStartupByProps(startupprops){
	logger.getInstance().info('Simple Portal - startuploader', 'loadStartups  -- ' + startupprops.name);
	
	if(!StartupLoader[startupprops.name]){
		StartupLoader.__defineGetter__(startupprops.name, function(){
            return require(startupprops.path);
        });
	}
}

/**
 * Description
 * @method loadStartups
 * @param {} dir
 * @param {} includeindex
 * @param {} callback
 * @return 
 */
function loadStartups(dir, includeindex, callback){
	var startupsfound = getStartups(dir, includeindex);
	
	var totcount = startupsfound.length;
	var fincount =0;
	if(startupsfound)
		for(var i in startupsfound){
			var startupprops =startupsfound[i];
			loadStartupByProps(startupprops);
			
			if(totcount-1 == fincount++)
				if(callback)
					callback();
		}
	else if(callback)
		callback();
}


/**
 * Description
 * @method getStartups
 * @param {} dir
 * @param {} includeindex
 * @return startups
 */
function getStartups(dir, includeindex){
	includeindex = includeindex||false;
	var startups = [];
	
	fs.readdirSync(dir).forEach(function(filename){
	    if (/\.js$/.test(filename)) {
            if((includeindex && filename == 'index.js') || filename != 'index.js'){
                var name = filename.substr(0, filename.lastIndexOf('.'));
                var startup = name;
                if(name == 'index'){
                	startup = dir.substring(dir.lastIndexOf('/') +1, dir.length)
                }
                var path = fs.realpathSync(dir + '/' + name + '.js');
                
                startups.push({path:path, name:startup});
            }
	    }else{
	    	stats = fs.lstatSync(dir + '/' + filename);

		    // Is it a directory?
		    if (stats.isDirectory()) {
		    	var substartups = getStartups(dir + '/' + filename, true);
		    	if(substartups.length > 0)
		    		for(var i in substartups)
		    			startups.push(substartups[i]);
		    }
	    }
	});
	
	return startups;
}