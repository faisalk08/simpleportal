var spenryption = require('../lib/wrapper/encryption');

exports['verify a text'] = function (test) {
    var encryptor = new spenryption('sample');
    
	test.ok(!encryptor.authenticate('sample'), 'this assertion should fail');
	test.ok(encryptor.authenticate('bf7b384d0a3792efb5a7f81db2ee3b5f55362536'), 'this assertion should pass');
	
    test.done();
};

exports['verify a number'] = function (test) {
    var encryptor = new spenryption('1234');
    
	test.ok(encryptor.authenticate('3fc8f562d32db0e58ebf369025ebbe5170d7bbfc'), 'this assertion should pass');
	test.ok(!encryptor.authenticate('1234'), 'this assertion should fail');
	
    test.done();
};
