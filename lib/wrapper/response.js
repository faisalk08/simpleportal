module.exports = function response() {
	return function(request, response, next){
		if(request.query)
			response.callback = request.query.callback;
		if(request.headers && request.headers['accept'] && (
			request.headers['accept'].indexOf('text/javascript') > -1 ||
			request.headers['accept'].indexOf('application/javascript') > -1
		)) 
			response.setHeader("Content-Type", 'application/json');
		else if(request.headers && request.headers['accept'] && (
				request.headers['accept'].indexOf('text/css') > -1 ||
				request.headers['accept'].indexOf('application/css') > -1
			)) 
				response.setHeader("Content-Type", 'text/css');
		if(request.headers && request.headers['Content-Type'])
			response.setHeader("Content-Type", request.headers['Content-Type']);
		else if(request.headers && request.headers['content-type'])
			response.setHeader("Content-Type", request.headers['content-type']);
		next();
	};
};