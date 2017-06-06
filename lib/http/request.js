"use strict";

/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012-2017 Faisal Kottarathil(admin@simpleportaljs.com)
 *	
 * MIT Licensed
 */

var req = exports = module.exports = {},
	mime =require("mime");
/**
 * Method to get the user profile from the session or the request in itself
 */
req.getUserprofile = function(){
	var userprofile;
//	if(this.session && this.session.userprofile)
//		userprofile = this.session.userprofile;
//	else if(this.userprofile)
//		userprofile = this.userprofile;
//	else 
	if(this.user)
		userprofile = this.user;
	
	return userprofile;
}

req.getOauthprofile = function(provider){
	var userprofile = req.getUserprofile();
	if(userprofile["oauth"] && userprofile["oauth"][provider] && userprofile["oauth"][provider].profile)
		return userprofile["oauth"][provider].profile;
	else
		return null;
}

req.setUserprofile = function(userprofile){
//	if(this.session)
//		this.session.userprofile=userprofile;
//	else
	this.user = userprofile;
}

/**
 * Description
 * @method flash
 * @param {} type
 * @param {} msg
 * @return
 * @private
 */
req.flash = function(type, msg){
  if (this.session === undefined) throw Error('req.flash() requires sessions');
  var msgs = this.session.flash = this.session.flash || {};
  if (type && msg) {
    var i = 2
      , args = arguments
      , formatters = this.app.flashFormatters || {};
    formatters.__proto__ = flashFormatters;
    msg = utils.miniMarkdown(msg);
    msg = msg.replace(/%([a-zA-Z])/g, function(_, format){
      var formatter = formatters[format];
      if (formatter) return formatter(utils.escape(args[i++]));
    });
    return (msgs[type] = msgs[type] || []).push(msg);
  } else if (type) {
    var arr = msgs[type];
    delete msgs[type];
    return arr || [];
  } else {
    this.session.flash = {};
    return msgs;
  }
};


/**
 * Method for setting the response header
 * @method header
 * @param {} name
 * @param {} defaultValue
 * @return
 * @private 
 */
req.get = req.header = function(name, defaultValue){
  switch (name = name.toLowerCase()) {
    case 'referer':
    case 'referrer':
      return this.headers.referrer
        || this.headers.referer
        || defaultValue;
    default:
      return this.headers[name] || defaultValue;
  }
};


/**
 * Method for reading the accept header from user request
 * @method accepts
 * @param {} type
 * @return
 * @private 
 */
req.accepts = function(type){
  var accept = this.header('Accept');

  // normalize extensions ".json" -> "json"
  if (type && '.' == type[0]) type = type.substr(1);

  // when Accept does not exist, or contains '*/*' return true
  if (!accept || ~accept.indexOf('*/*')) {
    return true;
  } else if (type) {
    // allow "html" vs "text/html" etc
    if (!~type.indexOf('/')) type = mime.lookup(type);

    // check if we have a direct match
    if (~accept.indexOf(type)) return true;

    // check if we have type/*
    type = type.split('/')[0] + '/*';
    return !!~accept.indexOf(type);
  } else {
    return false;
  }
};