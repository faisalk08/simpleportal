"use strict";
/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012-2017 Faisal Kottarathil(admin@simpleportaljs.com)
 *	
 * MIT Licensed
 */
/**
 * Service class to be used inside the API services
 */
module.exports={
	Service:require("./service"),
	StorageService:require("./storageservice"),
	RemoteService:require("./remoteservice"),
	CUDService:require("./cudservice"),
	RService:require("./rservice"),
	BaseService:require("./baseservice"),
	FilterService:require("./filterservice")
};

/**
 * default constructor for every service
 */