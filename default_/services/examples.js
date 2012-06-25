var exampleService = module.exports = {};

exampleService.service={};

exampleService.service.hello = function(request, response, callback) {
	console.log("Service 'hello' is called.");
	var message = 'Hello World!!';
	callback(null, {message:message});
}

exampleService.service['/'] = function(request, response, callback) {
	exampleService.service.hello(request, response, callback);
}