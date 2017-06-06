"use strict";
var simpleportal = require("simpleportal"),
	SVNSpawn = require('svn-spawn');

var SubversionClient = module.exports =  function(options){
	var instance = this;
	
	this.options = simpleportal.util.extendJSON({sourcetype:'subversion'}, SubversionClient.DEFAULTS, options);
	
	this.sourceroot = this.options.sourcedir;
	this.sourcedir = simpleportal.util.appendFilePath(this.options.sourcedir, instance.options.name); 
}

SubversionClient.DEFAULTS = {};

/**
 * To get the sourcecode info from the checkeddout folder..
 * 
 * @method checkout
 * @param options options with user credentials.
 * @param callback 
 */
SubversionClient.prototype.getInfo = function(callback){
	var instance = this;
	
	var client = new SVNSpawn({
	    cwd: instance.sourcedir
	});

	client.getInfo(null, callback);
}

/**
 * To checkout source code from the remote server.
 * 
 * @method checkout
 * @param options options with user credentials.
 * @param callback 
 */
SubversionClient.prototype.checkout = function(options, callback){
	var instance = this;
	
	simpleportal.util.checkDirSync(instance.sourcedir);

	var svnclient;
	if(options && options.username && options.password)
		svnclient = new SVNSpawn({
		    cwd: instance.sourceroot,
		    username:options.username, password:options.password
		});
	else
		svnclient = new SVNSpawn({
		    cwd: instance.sourceroot
		});
	
	svnclient.checkout([instance.options.sourceurl, instance.options.name], callback);
}

/**
 * To update the checked out source code from the remote server.
 * 
 * @method update 
 * @param callback 
 */
SubversionClient.prototype.update = function(options, callback){
	var instance = this;
	
	var svnclient;
	if(options && options.username && options.password)
		svnclient = new SVNSpawn({
		    cwd: instance.sourcedir,
		    username:options.username, password:options.password
		});
	else
		svnclient = new SVNSpawn({
		    cwd: instance.sourcedir
		});
	
	svnclient.update(callback);
}