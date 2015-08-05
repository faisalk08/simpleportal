/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */
/**
 This is the __module__ description for the `simpleportal` module.
 simpleportal frameworks vareous classess can be directly accessed using `simpleportal`
  
 - All class files in the `simpleportal/lib/wrapper` folder is accessible with `simpleportal`.{module name with First charactar upper case}
  
 - 	for example `simpleportal.Csv` for Csv parsing
  
 - All files siblings to `simpleportal` can be accessed with `simpleportal.{modulename}`
  
 - 	For example `simpleportal.util` - All util functions can be directly used
  
        var simpleportal = require('simpleortal');
        
		var csvparser = simpleportal.Csv({file:{path:/Users/guest/test.csv}});
 @module simpleportal	
*/

/**
 * Main class for the simpleportal
 * 
 * @class simpleportal
 * @module simpleportal
 * @main simpleportal
 * @static
 */
var simpleportal = module.exports = {};

var fs = require('fs');

/**
 * @property version
 * @type string
 * @static
 */
simpleportal.version = '0.1.0';

fs.readdirSync(__dirname).forEach(function(filename){
    if (/\.js$/.test(filename)) {
        if(filename != 'simpleportal.js'){
            var name = filename.substr(0, filename.lastIndexOf('.'));
            
            simpleportal.__defineGetter__(name, function(){
                    return require('./' + name);
            });
        }
    }
});

fs.readdirSync(__dirname + '/wrapper').forEach(function(filename){
    if (/\.js$/.test(filename)) {
        var name = filename.substr(0, filename.lastIndexOf('.'));
        if(name == 'crudservice')
        	simpleportal.__defineGetter__('CRUDService', function(){
            	return require('./wrapper/' + name).CRUDService;
            });
        else
        	simpleportal.__defineGetter__(capitaliseFirstLetter(name), function(){
        		return require('./wrapper/' + name);
        	});
    }
});

/**
 * To capitalize the first charector of a word
 * 
 * @method capitaliseFirstLetter
 * 
 * @param {} string
 * @return BinaryExpression
 * @private
 */
function capitaliseFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

overrideHTTPMethods();

/**
 * Override HTTP Methods - Default method inside http will be changed for express like functionalities
 * 
 * @method  overrideHTTPMethods
 * 
 */
function overrideHTTPMethods(){
	var http = require("http");
	
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
	http.ServerResponse.prototype.send = function (status, headers, body) {
		if(headers && !(headers['content-type'] || headers['Content-Type'])){
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
	http.ServerResponse.prototype.contentType = function(value){
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
	http.ServerResponse.prototype.json = function(body, error){
		simpleportal.util.sendServiceResponse(this, error, body);
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
	http.ServerResponse.prototype.redirect = function(url, status, req){
	  var app = this.app
	    , base = '/'
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
	
	var req = http.IncomingMessage.prototype;
	
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
	req.get =req.header = function(name, defaultValue){
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
	

	/**
	 * MEthod for reading the user header from the request
	 * @method header
	 * @param {} name
	 * @param {} val
	 * @return ThisExpression
	 * @private
	 */
	http.ServerResponse.prototype.header = function(name, val){
	  if (1 == arguments.length) return this.getHeader(name);
	  this.setHeader(name, val);
	  return this;
	};
}