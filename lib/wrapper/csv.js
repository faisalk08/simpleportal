var logger= require('simpleportal').logger.getInstance();

var yacsv = require('ya-csv');

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
	var reader = yacsv.createCsvFileReader(instance.file.path, {
		columnsFromHeader: true,
		'separator': ',',
	    'quote': '"',
	    'escape': '"',       
	    'comment': '',
	});

	var collection = [];
	reader.addListener('data', function(data) {
	    console.log(data);

        collection.push(data);
	});	
	
	reader.addListener('end', function(data) {
	    console.log(collection);

	    callback(null, collection);
	});	
}