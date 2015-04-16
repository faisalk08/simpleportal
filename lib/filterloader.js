/**
 * Filter loader middleware for `simpleportal.Server`
 *
 * @property filterloader
 * @for simpleportal
 * @type {filterloader}
 * @static
 */

/**
 * Filter loader middleware for `simpleportal.Server`
 * 
 * @class filterloader
 * @module middleware
 */
var FilterLoader = module.exports = {};

var fs = require('fs');

var simpleportal = require('./simpleportal');

var logger = require("./logger");

/**
 * Default directory where filter js files are stored
 * 
 * @property simpleportal.filterloader.filterdir
 * @type string
 */
FilterLoader.filterdir = 'filter';

/**
 * To load the filters based on the configuration
 * 
 * @method loadFilters
 * @param {} configuration Path configuration for the filter 
 * @param {callback} callback The callback to excecute when complete
 */
FilterLoader.loadFilters = function(configuration, callback){
	var filterdir_ = configuration&&configuration.filterdir ?  configuration.filterdir : FilterLoader.filterdir;
	logger.getInstance().info('Simple Portal : filterloader', 'loadFilters  -- ' + filterdir_);
	
	if(!fs.existsSync(filterdir_)){
		logger.getInstance().warn('Simple Portal - filterloader', 'loadFilters  -- No diractory found ' + filterdir_);
		
		if(callback)
			callback();
	} else{
		var stats = fs.lstatSync(filterdir_);
		
		if (stats.isDirectory()) {
			loadFilters(filterdir_, false, callback);
		}else if(callback)
			callback();	
	}	
}

/**
 * To register|start the filters loaded before 
 * @method register 
 * 
 * @param {callback} callback The callback to excecute when complete
 */
FilterLoader.register = function(callback) {
	var count = FilterLoader.filters.length;
	var cbcount = 0;
	
	if(FilterLoader.filters.length != 0)
		for(var i = 0; i < FilterLoader.filters.length;i++){
			var filtername =FilterLoader.filters[i];
			
			FilterLoader[filtername]();
		}
	else
		callback('No router to register!!');
};

FilterLoader.filters=[];

/**
 * To load the filters by property in to the filters array
 * 
 * @method loadFilterByProps
 * @param {} filterprops 
 * @private 
 */
function loadFilterByProps(filterprops){
	logger.getInstance().info('Simple Portal - filterloader', 'loadFilters  -- ' + filterprops.name);
	
	if(!FilterLoader[filterprops.name]){
		FilterLoader.filters.push(filterprops.name);
	}
}

/**
 * To load the filters from a directory
 * 
 * @method loadFilters
 * @param {string} dir Directory where the filters are stored
 * 
 * @param {boolean} includeindex whether to include the indes.js file and use parent folder name as the filter name
 * @param {callback} callback The callback to excecute when complete
 */
function loadFilters(dir, includeindex, callback){
	var filtersfound = getFilters(dir, includeindex);
	
	var totcount = filtersfound.length;
	var fincount =0;
	if(filtersfound)
		for(var i in filtersfound){
			var filterprops =filtersfound[i];
			
			loadFilterByProps(filterprops);
			
			if(totcount-1 == fincount++)
				if(callback)
					callback();
		}
	else if(callback)
		callback();
}


/**
 * To get the filters available inside a directory
 * 
 * @method getFilters
 * 
 * @param {} dir Folder path where filetr js files are stored
 * @param {} includeindex whether to include the indes.js file and use parent folder name as the filter name
 * @return filters array of filter properties
 */
function getFilters(dir, includeindex){
	includeindex = includeindex||false;
	var filters = [];
	
	if(!fs.existsSync(dir)){
		logger.getInstance().warn('Simple Portal - filterloader', 'getFilters  -- No diractory found ' + dir);
	} else
		fs.readdirSync(dir).forEach(function(filename){
			if(/filter\.js$/.test(filename)){
				var name = filename.substr(0, filename.lastIndexOf('.'));
	            var filter = name;
	            
	            var path = fs.realpathSync(dir + '/' + name + '.js');
	            
	            filters.push({path:path, name:filter});
		    }else{
		    	stats = fs.lstatSync(dir + '/' + filename);
	
			    // Is it a directory?
			    if (stats.isDirectory()) {
			    	var subfilters = getFilters(dir + '/' + filename, true);
			    	
			    	if(subfilters.length > 0)
			    		for(var i in subfilters)
			    			filters.push(subfilters[i]);
			    }
		    }
		});
	
	return filters;
}