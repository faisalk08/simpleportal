"use strict";

/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012-2017 Faisal(admin@simpleportaljs.com)
 *	
 * MIT Licensed
 */

var util = require("./../util"),
	http = require("http");

var response = exports = module.exports = {};

/**
 * overriding the NODE js Response method!!!
 * 
 * @method send
 * 
 * @param {} status
 * @param {} headers
 * @param {} body
 * @private
 */
response.send = function (status, headers, body) {
	if(headers && !(headers['content-type'] || headers['Content-Type'])){
		/*if(headers['accept'])
			headers['Content-Type'] = headers['accept'];
		else*/
		if(this.getHeader("Content-Type"))
			headers['Content-Type'] = this.getHeader("Content-Type");
		else if(this.contentType())
			headers['Content-Type'] = this.contentType()+'; charset=UTF-8';
		else
			headers['Content-Type'] = 'text/html; charset=UTF-8';
	}
	
	this.writeHead(status, headers);
	this.write(body || '');
    this.end();
};

/**
 * Setting the content type of the response using a function
 * 
 * @method contentType
 * @param {string} value
 * 
 * @return contentType
 * @private
 */
response.contentType = function(value){
	if(value)
		this.content_type = value;
	
	return this.content_type;
}

/**
 * Sending the response as json 
 * 
 * @method json
 * 
 * @param {} body
 * @param {} error
 * @return
 * @private 
 */
response.json = function(body, error){
	util.sendServiceResponse(this, error, body);
}


/**
 * Redirecting user request based on the status and the current request header 
 * 
 * @method redirect
 * @param {} url
 * @param {} status
 * @param {} req
 * @private 
 */
response.redirect = function(url, status, req){
  var base = '/'
    , status = status || 302
    , head = 'HEAD' == req.method
    , body;

  // Setup redirect map
  var map = {
      back: req.header('Referrer', base)
    , home: base
  };

  // Support custom redirect map
  map.__proto__ = {};

  // Attempt mapped redirect
  var mapped = 'function' == typeof map[url]
    ? map[url](req, this)
    : map[url];

  // Perform redirect
  url = mapped || url;

  // Relative
  if (!~url.indexOf('://')) {
    // Respect mount-point
    if ('/' != base && 0 != url.indexOf(base)) url = base + url;

    // Absolute
    var host = req.headers.host
      , tls = req.connection.encrypted;
    url = 'http' + (tls ? 's' : '') + '://' + host + url;
  }

  // Support text/{plain,html} by default
  if (req.accepts('html')) {
	  body = '<p>' + http.STATUS_CODES[status] + '. Redirecting to <a href="' + url + '">' + url + '</a></p>';
	  this.header('Content-Type', 'text/html');
  } else {
	  body = http.STATUS_CODES[status] + '. Redirecting to ' + url;
	  this.header('Content-Type', 'text/plain');
  }

  // Respond
  this.statusCode = status;
  this.header('Location', url);
  this.end(head ? null : body);
};

/**
 * MEthod for reading the user header from the request
 * @method header
 * @param {} name
 * @param {} val
 * @return ThisExpression
 * @private
 */
response.set = response.header = function(name, val){
  if (1 == arguments.length) return this.getHeader(name);
  this.setHeader(name, val);
  return this;
};