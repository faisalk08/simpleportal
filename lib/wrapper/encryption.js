var crypto = require("crypto");

/**
 * Encryption class for encrypting text using the crypto module 
 * 
 	var encryptor = new simpleportal.Encryption('sample');
 	var isequeal = encryptor.authenticate('ENCRYPTED TEXT FROM DATABASE');
 * 
 * @class Encryption
 * @module simpleportal
 * @submodule wrapper
 * 
 * @constructor 
 * 
 * @param {string} text encryption text
 */
module.exports = Encryption = function(text) {
	this._text = text;
	this.salt = this.makeSalt();
	this.hashed_text = this.encryptText(text);
};

/**
 * TO encrypt a text
 * 
 * @method encryptText
 * 
 * @return encrypted text
 * @private
 */
Encryption.prototype.encryptText=function(){
	return crypto.createHmac('sha1', this.salt).update(this._text).digest('hex');	
}

/**
 * To make salt for the encryption
 * 
 * @method makeSalt
 * 
 * @return encryption salt
 * 
 * @private
 */
Encryption.prototype.makeSalt =function(){
	return "ABCDEFGHIJKLMNOPQRSTUVWXYZ";	
}

/**
 * To verify the string entered and the encrypted data are same
 * 
 * @method authenticate
 * @param {string} hashedText the text or hashed data from the database or local storage
 * 
 * @return {boolean} 
 */
Encryption.prototype.authenticate =function(hashedText){
	return this.encryptText() === hashedText;	
}