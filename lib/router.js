/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var router = module.exports = {};

var util = require('./util');

var DispatchWrapper = require('./wrapper/dispatch').DispatchWrapper;

router.register = function(modules) {
	router.dispatch = new DispatchWrapper();
	for(var i = 0; i < modules.length;){
		module = modules[i++];
		util.callModuleFunction(module, true, 'initRouter', router);
	}
};

router.dispatch = {};