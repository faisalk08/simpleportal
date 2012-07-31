var logger= require('simpleportal').logger.getInstance();

var yacsv = require('./ya-csv');
var fs = require('fs');

var csv = module.exports = function(options){
	var instance = this;
	instance.file = options.file;
}

csv.prototype.toJSON = function(callback){
	var instance = this;
	logger.info('CSV Processor Service', 'Processing file - >>>>>'+ instance.file.name);
	
	instance.parse(callback);
}

csv.prototype.parse = function(callback){
	var instance = this;
	
	var collection = [];
	var error = [];
	try{
		var options = {
			columnsFromHeader: true,
			'separator': ',',
			'quote': '"',
			'escape': '"',       
			'comment': '',
		};
		var reader = yacsv.createCsvFileReader(instance.file.path, options);

		reader.addListener('data', function(data) {
		    collection.push(data);
		});	
		
		reader.addListener('end', function(data) {
		    callback(null, collection);
		});	

		//readStream.removeListener('error', function(){});
		reader.addListener('error', function(data) {
		    console.log(data);
			error.push(data);
		   callback(error, collection);
		});	
	}catch(err){
		console.log(err);
		callback(err, collection);
	}
}