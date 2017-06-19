"use strict";

/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012-2017 Faisal(admin@simpleportaljs.com)
 *	
 * MIT Licensed
 */

/**
 * Service class to be used inside the API services
 */
module.exports={
	Filterloader:require("./filterloader"),
	Oauthloader:require("./oauthloader"),
	Pluginloader:require("./pluginloader"),
	Serviceloader:require("./serviceloader"),
	Startuploader:require("./startuploader"),
	Viewloader:require("./viewloader")
};