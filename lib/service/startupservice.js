"use strict";
/**
 * A class for handling the view service
 */
var util = require("util"),
	BaseService = require("./baseservice");
	
var StartupService = module.exports = function(options){
	if(options && options.routerid)
		this.routerid = options.routerid;
	
	var _ = BaseService.call(this, options);
	
	var instance = this;
	instance.preferencekey = "startup";

	return instance;
};
util.inherits(StartupService, BaseService);