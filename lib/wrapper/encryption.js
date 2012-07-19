var crypto = require("crypto");

module.exports = Encryption = function(password) {
	this._password = password;
	this.salt = this.makeSalt();
	this.hashed_password = this.encryptPassword(password);
};

Encryption.prototype.encryptPassword=function(){
	return crypto.createHmac('sha1', this.salt).update(this._password).digest('hex');	
}

Encryption.prototype.makeSalt =function(){
	return "ABCDEFGHIJKLMNOPQRSTUVWXYZ";	
}

Encryption.prototype.authenticate =function(hashedPassword){
	console.log(this.encryptPassword());
	console.log(hashedPassword);
	console.log(this._password);
	return this.encryptPassword() === hashedPassword;	
}