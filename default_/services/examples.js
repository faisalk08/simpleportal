/**
 * API using `simpleportal.serviceloader` can be accessed from http uri /api/example
 * 
 * @module serviceloader
 * 
 * @class exampleservice
 * 
 * @static
 */
var exampleService = module.exports = {};

/**
 * API view handlers required for `simpleportal.serviceloader` middleware
 * @property service
 * 
 * @type object
 */
exampleService.service={};

/**
 * API : Example : (api/example/hello)
 * 
 * @method api/example/hello
 * 
 * @param {} request
 * @param {} response
 * @param {} callback
 */
exampleService.service.hello = function(request, response, callback) {
	var message = 'Hello World!!';
	callback(null, {message:message});
}

/**
 * API : Example : (api/example/)
 * 
 * @method api/example/
 * 
 * @param {} request
 * @param {} response
 * @param {} callback
 */
exampleService.service['/'] = function(request, response, callback) {
	exampleService.service.hello(request, response, callback);
}