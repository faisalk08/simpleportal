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