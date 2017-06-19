"use strict";
/**
 * Notification middleware for `simpleportal.Server`
 *
 * @property notificationcenter
 * @for simpleportal
 * @type {notificationcenter}
 * @static
 */
var util = require("./../util");

var NotificationCenter = function(options, socketio){
	var instance = this;
	
	instance.options = util.extendJSON({}, defaults, options);
	
	if(instance.options.osnotification && /darwin/.test(process.platform))
		instance.osnotification=true;
	
	if(instance.options.socketnotification)
		instance.socketnotification=true;
	
	if(socketio)
		instance.socketio;
	
	return instance;
};

NotificationCenter.prototype.updateSocketIO = function(socketio){
	var instance=this;
	
	if(socketio) {
		instance.socketnotification=true;
		
		instance.socketio = socketio;
	}
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
NotificationCenter.prototype.__notify_socketio = function(data){
	var instance = this;
	
	if(instance.socketio && data.data) {
		if (data.data === null || (data.data.id || data.data.taskid) === null) {
            return;
        }
		
        var channel;
        if(data.data.userid||data.data.channel){
        	var channel = data.data.userid || data.data.channel;
            delete data.data.userid;
            delete data.data.channel;
        }
		
        if(channel)
        	instance.socketio["in"](channel).emit("notification", data.data);
        else
        	instance.socketio.emit('notification', data.data);
	}
		
	if(data.message || data.data && data.data.message)
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
		
		var data_ = util.extendJSON({}, instance.options, data);

		nc.notify(data_);	
	} catch(error){
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