/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012 Faisal Kottarathil
 * MIT Licensed
 */

var simpleportal = module.exports = {};

var fs = require('fs');

simpleportal.version = '0.1.0';
simpleportal.CRUDService = require('./wrapper/crudservice').CRUDService;

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
        simpleportal.__defineGetter__(capitaliseFirstLetter(name), function(){
        	return require('./wrapper/' + name);
        });
    }
});

function capitaliseFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}