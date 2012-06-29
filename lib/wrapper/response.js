module.exports = function response() {
	return function(request, response, next){
		if(request.query)
			response.callback = request.query.callback;
		next();
	};
};