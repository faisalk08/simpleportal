var spcsv = require('../lib/wrapper/csv');

exports['verify csv header'] = function (test) {
    var csvparser = new spcsv({file:{path :__dirname+'/sample/test.csv'}, 'quote': '', 'escape': '', 'separator':','});
    
  	var jsondata = csvparser.toJSON(function(error, jsondata){
  		test.ok(jsondata[0].hasOwnProperty('name'), 'this assertion should pass');
  		test.ok(jsondata[1].hasOwnProperty('key'), 'this assertion should pass');
  		test.ok(jsondata[2].hasOwnProperty('value'), 'this assertion should pass');
  		
  		test.done();
  	});
};

exports['verify csv data'] = function (test) {
    var csvparser = new spcsv({file:{path :__dirname+'/sample/test.csv'}, 'quote': '','escape': ''});
    
  	var jsondata = csvparser.toJSON(function(error, jsondata){
  		
  		test.equals(jsondata[0].name, 't', 'this assertion should pass');
  		test.equals(jsondata[1].name, 'tt', 'this assertion should pass');
  		test.equals(jsondata[2].name, 'ttt', 'this assertion should pass');
  		
  		test.equals(jsondata[0].key, 'k', 'this assertion should pass');
  		test.equals(jsondata[1].key, 'kk', 'this assertion should pass');
  		test.equals(jsondata[2].key, 'kkk', 'this assertion should pass');
  		
  		test.equals(jsondata[0].value, '1', 'this assertion should pass');
  		test.equals(jsondata[1].value, '32', 'this assertion should pass');
  		test.equals(jsondata[2].value, '456', 'this assertion should pass');
  		
  		test.done();
  	});
};

exports['verify csv with semicolon header'] = function (test) {
    var csvparser = new spcsv({file:{path :__dirname+'/sample/testsemicol.csv'}, 'quote': '','escape': '', 'separator':';'});
    
  	var jsondata = csvparser.toJSON(function(error, jsondata){
  		
  		test.ok(jsondata[0].hasOwnProperty('name'), 'this assertion should pass');
  		test.ok(jsondata[1].hasOwnProperty('key'), 'this assertion should pass');
  		test.ok(jsondata[2].hasOwnProperty('value'), 'this assertion should pass');
  		
  		test.done();
  	});
};