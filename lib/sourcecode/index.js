"use strict";

var Subversion = require('./subversion');

module.exports={
	getClient:function(sourcetype, soucecodesetting){
		// to get the source code client 
		// @TODO find the client using dynamic process.
		if(sourcetype == "subversion"){
			return new Subversion(soucecodesetting);
		}
	},
	isValidClient:function(clientid){
		//@TODO replace this when new client like git is available.
		return clientid != 'suversion';
	},
	Subversion:Subversion
}