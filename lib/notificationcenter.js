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
var NotificationCenter={};

NotificationCenter.osnotification=false;
NotificationCenter.socketnotification=true;

/**
 * Description
 * @method notify
 * @param {} options
 * @return 
 */
NotificationCenter.notify = function(options){
	if(NotificationCenter.osnotification&& options.message && !options.data)
		notify_mac(options);
	
	if(NotificationCenter.socketnotification && NotificationCenter.socketio && options.data)
		notify_socketio(options);
};

/**
 * Description
 * @method notify_socketio
 * @param {} options
 * @return 
 */
function notify_socketio(options){
	NotificationCenter.socketio.emit('notification', options.data);
		
	if(options.message||options.data.message)
		notify_mac({message:options.message||options.data.message});
	else if(options.status=='exception')
		notify_mac(options.message + ' -- ' + options.exception);
}

/**
 * Description
 * @method notify_mac
 * @param {} options
 * @return 
 */
function notify_mac(options){
	try{
		var notifier = require('node-notifier');
		var nc = new notifier.NotificationCenter();
		
		var options_=defaults;
		var extend = require('util')._extend;
		var o = extend({}, options_);
		extend(o,  options);

		nc.notify(o);	
	}catch(error){
		
	}
}

var defaults={
	'title': 'evimed eSPA',
	'subtitle': 'Trial feasibility made easy!!',
	'message': '',
	'sound': 'Funk', // case sensitive
	'appIcon': __dirname + '/coulson.jpg',
	'contentImage': __dirname + '/coulson.jpg',
	'open': 'file://' + __dirname + '/coulson.jpg'
};

NotificationCenter.socketio=null;

module.exports = NotificationCenter;