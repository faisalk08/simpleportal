"use strict";
/**
 * A class for handling the view service
 */
var util = require("util"),
	BaseService = require("./baseservice");
	
var ViewService = module.exports = function(options){
	BaseService.call(this, options);
	this.preferencekey = "view";

	return this;
};

util.inherits(ViewService, BaseService);