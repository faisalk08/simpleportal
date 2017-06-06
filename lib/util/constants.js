"use strict";
var Constants = {};

/**
 * Constants related to event emit
 */
Constants.ServiceMethods={
	DETAILS:"details",
	SEARCH:"search"
}

/**
 * Constants related to event emit
 */
Constants.ServiceEvents={
	INIT:"init",
	STARTUP:"startup",
	AFTER_SEARCH:"aftersearch",
	AFTER_LIST:"afterlist",
	AFTER_DETAILS:"afterdetails",
	AFTER_UPDATE:"afterupdate",
	AFTER_ADD:"afteradd",
	AFTER_DELETE:"afterremove",
	BACKUP:"backup",
	SETTINGS:"settings",
	VIEW_READY:"viewready"
}

/**
 * Constants related to event emit
 */
Constants.ServiceTemplates={
	afterdetails:"details",
	afterlist:"searchresult",
	aftersearch:"searchresult",
	settings:"servicesettings"
}

Constants.CommonAPIEvents={
	USER_LOGIN:"user.login"
}

/**
 * Module for accessing the various constants used inside simpleportal
 * can access using simpleportal.Constants
 */
module.exports=Constants;