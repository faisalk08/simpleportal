/**
 * Notification middleware for `simpleportal.Server`
 *
 * @property notificationcenter
 * @for simpleportal
 * @type {notificationcenter}
 * @static
 */

/**
 * Notification middleware for `simpleportal.Server`
 * 
 * @class notificationcenter
 * @module middleware
 * @static
 */
var simpleportal = require('simpleportal');

var NotificationCenter= function(options, socketio){
	var instance = this;
		
	instance.options = simpleportal.util.extendJSON({}, defaults, options);
	
	if(instance.options.osnotification)
		instance.osnotification=true;
	
	if(instance.options.socketnotification)
		instance.socketnotification=true;
	
	if(socketio)
		instance.socketio;
};

NotificationCenter.prototype.updateSocketIO = function(socketio){
	var instance=this;
	
	if(socketio)
		instance.socketio;
}

/**
 * Description
 * @method notify
 * @param {} options
 */
NotificationCenter.prototype.notify = function(data){
	var instance = this;
	
	if(instance.osnotification && data.message && !data.data)
		instance.__notify_mac(data);
	
	if(instance.socketnotification && instance.socketio && data.data)
		instance.__notify_socketio(data);
};

/**
 * To notify using socket io
 * @method notify_socketio
 * @param {} data
 * @private
 */
NotificationCenter.prototype.__notify_socketio= function(data){
	var instance = this;
	
	if(instance.socketio)
		instance.socketio.emit('notification', data.data);
		
	if(data.message||options.data.message)
		instance.__notify_mac({message:data.message||data.data.message});
	else if(data.status=='exception')
		instance.__notify_mac(data.message + ' -- ' + data.exception);
}

/**
 * To notify mac os - using node notifier
 * @method notify_mac
 * @param {} data
 * @return 
 */
NotificationCenter.prototype.__notify_mac = function(data){
	var instance = this;
	try{
		var notifier = require('node-notifier');
		var nc = new notifier.NotificationCenter();
		
		var data_ = simpleportal.util.extendJSON({}, instance.options, data);

		nc.notify(data_);	
	}catch(error){
		console.log(error);
	}
}

var defaults={
	'title': 'Simple portal',
	'subtitle': 'Notifciation center',
	'message': '',
	'sound': 'Funk', // case sensitive
	'appIcon': __dirname + '/coulson.jpg',
	'contentImage': __dirname + '/coulson.jpg',
	'open': 'file://' + __dirname + '/coulson.jpg'
};

module.exports = NotificationCenter;