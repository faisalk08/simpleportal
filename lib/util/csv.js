"use strict";
var simpleportal=require('./../simpleportal');
	yacsv = require('./ya-csv'),
	fs = require('fs');
	
var logger= simpleportal.logger;

/**
* CSV parser

        var csvparser = new require('simpleportal.Csv')(
        	{
        		file:{path: to file}, 
        		seperator:';'
        	}
        );
 
        var jsondata = csvparser.toJSON();
  * @class CsvParser
  * 
  * @module simpleportal
  * @submodule wrapper
  * 
  * @constructor
  * 
  * @param {} options Options for the parser object
  */
var csv = 
 module.exports = function(options){
	var instance = this;
	
	/**
	 * @property options
	 * @type object 
	 */
	instance.options = instance.options=simpleportal.util.extendJSON({}, OPTIONS);
	if(options)
		instance.options=simpleportal.util.extendJSON(instance.options, options);
	
	instance.file = options.file;
}

/**
 * To covert the csv in to a json file
 * 
 * @method toJSON
 * 
 * @param {callback} callback The callback to excecute when complete 
 */
csv.prototype.toJSON = function(callback){
	var instance = this;
	logger.getInstance().debug('CSV Processor Service', 'Processing file - >>>>>'+ instance.file.path);
	
	instance.parse(callback);
}

/**
 * To parse the CSV in to a json array
 * 
 * @method parse
 * @param {callback} callback The callback to excecute when complete
 * @return 
 */
csv.prototype.parse = function(callback){
	var instance = this;
	
	var collection = [];
	var error = [];
	try{
		var reader = yacsv.createCsvFileReader(instance.file.path, instance.options);

		reader.addListener('data', function(data) {
		    collection.push(data);
		});	
		
		reader.addListener('end', function(data) {
		    callback(null, collection);
		});	

		//readStream.removeListener('error', function(){});
		reader.addListener('error', function(data) {
		    error.push(data);
		   callback(error, collection);
		});	
	}catch(err){
		console.log(err);
		callback(err, collection);
	}
}

/**
 * Default options for the csv parser
 * 
 * @property OPTIONS
 * @type Object
 * @final
 * @static
 */
var OPTIONS = {
	'columnsFromHeader': true,
	'separator': ',',
	'quote': '"',
	'escape': '"',       
	'comment': '',
};