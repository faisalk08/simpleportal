var util = require('./../lib/util');

exports['simpleportal.util.extendJSON'] = function (test) {
	var obj1={a:'b',c:'d',e:'f'};
	var obj2={b:'a',d:'c',f:'e'};
	var obj3={b:'a',d:'c',f:{g:'h', h:'i'}}
	var obj4={b:'a',d:'c',f:[{adf:'asab'}, {a:'b'}]}
	var obj5={b:'av',d:'cc',f:[{aa:'11'},{a:'d'}, {c:'d'}]}
	
	test.equal(Object.keys(util.extendJSON(obj1, obj2)).length, 6, 'this assertion should pass');
	test.equal(util.extendJSON(obj1, obj2).a, 'b', 'this assertion should pass');
	test.equal(util.extendJSON(obj1, obj2).b, 'a', 'this assertion should pass');
	
	test.equal(Object.keys(util.extendJSON(obj1, obj3).f).length, 2, 'this assertion should pass');
	test.equal(util.extendJSON(obj1, obj3).f.h, 'i', 'this assertion should pass');
	
	test.done();
}

exports['simpleportal.util.generateId'] = function (test) {
    test.equal(util.generateId('A_E-I.,O+*#U9012?'), 'ae-iou9012', 'this assertion should pass');
    test.equal(util.generateId('A_E-I.,O+*#U9012?'), 'ae-iou9012', 'this assertion should pass');
    
	test.equal(util.generateId('A_E-I.,O+*#U'), 'ae-iou', 'this assertion should pass');
	test.equal(util.generateId('A_ÜÄE-I.,O+*#U'), 'ae-iou', 'this assertion should pass');
	
	test.equal(util.generateId('nullundefined'), '', 'this assertion should pass');
	
    test.done();
};

exports['simpleportal.util.getArrayValues'] = function (test) {
	var array = util.getArrayValues('1,2,3"5');
	
    test.equal(array.length, 3, 'this assertion should pass');
    test.equal(array[0], 1, 'this assertion should pass');
    
    test.equal(array[2], '3"5', 'this assertion should pass');
    
    test.done();
};

exports['simpleportal.util.getArrayValues : with different seperators'] = function (test) {
	var array = util.getArrayValues('1+2+3+5', '+');
	test.equal(array.length, 4, 'this assertion should pass');
	
	var array = util.getArrayValues('1_2_3_5', '_');
	test.equal(array.length, 4, 'this assertion should pass');
    
	var array = util.getArrayValues('1;2;3;5', ';');
	test.equal(array.length, 4, 'this assertion should pass');
    
	var array = util.getArrayValues('1?2?3?5', '?');
	test.equal(array.length, 4, 'this assertion should pass');
	
	var array = util.getArrayValues('1&2&3&5', '&');
	test.equal(array.length, 4, 'this assertion should pass');
    
    test.done();
};

exports['simpleportal.util.arrayContains'] = function (test) {
	var array = [1,2,3,4,5];
	
	test.ok(util.arraycontains(array, 1), true, 'this assertion should pass');
	test.ok(util.arraycontains(array, 4), true, 'this assertion should pass');
	test.ok(util.arraycontains(array, 5), true, 'this assertion should pass');
	test.ok(!util.arraycontains(array, 7), true, 'this assertion should pass');
	
	var array = ['ABCD',2,3,4,5, '7'];
	test.ok(util.arraycontains(array, 7), true, 'this assertion should pass');
	test.ok(util.arraycontains(array, 'ABCD'), true, 'this assertion should pass');
	
	test.done();
}

exports['simpleportal.util.clone'] = function (test) {
	var array = {a:1,b:2,c:3,d:4,e:5};
	var newarray = util.clone(array);
	
	newarray.e=6;
	
	test.equal(Object.keys(newarray).length, 5, 'this assertion should pass');
	test.notEqual(newarray.e, 5, 'this assertion should pass');
	
	test.equal(array.e, 5, 'this assertion should pass');
	
	var newarray_ = array;
	newarray_.e=6;
	
	test.equal(newarray_.e, 6, 'this assertion should pass');
	test.equal(array.e, 6, 'this assertion should pass');
	
	var array = [1, 2];
	test.equal(2, array.length, 'this assertion should pass');
	test.equal(array[1], 2, 'this assertion should pass');
	
	var array = {b:[1, 2], d:[], e:{g:[1,2]}};
	test.equal(array.e.g.length, 2, 'this assertion should pass');
	test.equal(array.d.length, 0, 'this assertion should pass');
	
	test.done();
}

exports['simpleportal.util.getExtension'] = function (test) {
	var filename = 'filename.csv';
	test.equal(util.getExtension(filename), '.csv', 'this assertion should pass');
	
	var filename = 'filename.abcd.efg';
	test.equal(util.getExtension(filename), '.efg', 'this assertion should pass');

	test.done();
}

exports['simpleportal.util.constructUrl'] = function (test) {
	
	test.equal(util.constructUrl({}), null, 'url options with no host - this assertion should pass');
	
	var urloptions = {host:'www.google.com'}
	var consturl = 'http://www.google.com';
	test.equal(util.constructUrl(urloptions), consturl, 'url options with host - this assertion should pass');
	
	var urloptions = {host:'www.google.com', path:'/api/trial/11578'}
	
	var consturl = 'http://www.google.com/api/trial/11578';
	test.equal(util.constructUrl(urloptions), consturl, 'url options with host and path - this assertion should pass');
	
	urloptions = {host:'www.google.com', path:'/api/trial/11578', port:80}
	test.equal(util.constructUrl(urloptions), consturl, 'url options with host and path with port 80 - this assertion should pass');
	
	urloptions = {host:'www.google.com', path:'/api/trial/11578', secure:true}
	var constsecureurl = 'https://www.google.com/api/trial/11578';
	test.equal(util.constructUrl(urloptions), constsecureurl, 'secure url options with host and path - this assertion should pass');
	
	urloptions = {host:'www.google.com', path:'/api/trial/11578', secure:true, port:443}
	test.equal(util.constructUrl(urloptions), constsecureurl, 'secure url options with host and path with port 443 - this assertion should pass');
	
	urloptions = {host:'www.google.com', path:'/api/trial/11578', secure:true, port:85}
	var constsecureurl = 'https://www.google.com:85/api/trial/11578';
	test.equal(util.constructUrl(urloptions), constsecureurl, 'url options with host and path with port 85 - this assertion should pass');

	test.done();
}
