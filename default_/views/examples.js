/**
 * View Handler for `simpleportal.Server` can be accessed with /example
 * 
 * @module viewloader
 * 
 * @class exampleview
 * 
 * @static
 */
var exampleView = module.exports = {};

var simpleportal = require("simpleportal");

var util = simpleportal.util;
var templateView = simpleportal.template;
var exampleService = simpleportal.serviceloader.examples.service;

/**
 * API view handlers required for `simpleportal.viewloader` middleware
 * @property view
 * 
 * @type object
 */
exampleView.view = {};

/**
 * View handler : example (/example/hello)
 * 
 * @method view.hello
 * 
 * @param {} request
 * @param {} response
 * @param {} next
 */
exampleView.view.hello = function(request, response, next){
	exampleService.hello(request, response, function(error, data){
		if(error){
			console.log('Some error from hello' + error);
		} else if(data.redirectUrl){
			response.writeHead(301, {'Location':data.redirectUrl});
			response.end();
		} else{
			console.log('data returned - ' + data.toString());
		}
		
		data = data || {};
		data.pageTitle='Hello World';
		templateView.renderPage(
			response,
			{
				layout:'layout',
				data:data,
				template:{
					'pages/content':'pages/examples/hello'
				}, error:error
			}, function(error, html){
				response.send(200, {}, html);
			}
		);
	});
}