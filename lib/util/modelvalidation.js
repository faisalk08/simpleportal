"use strict";
(function(exports){
	required:function(value){
		return {isValid:value, message:"Field is required!"};
	},
	/**
	 * To validate whether the value is in a standard time format or not
	 * 
	 * Regular expression used is - /^(\d{1,2}(\.\d{2})?)([ap]m)?$/
	 * 
	 * @method validation_.time
	 * 
	 * @param {} value
	 * @return true if valid time else false
	 * @private
	 */
	time: function(value){
		return {isValid:value.match(/^(\d{1,2}(\.\d{2})?)([ap]m)?$/), message:'Not a valid Time!'};
	},
	
	/**
	 * To validate whether the value is a number
	 * 
	 * @method validation_.number
	 * 
	 * @param {} value
	 * @return true if valid number else false
	 * 
	 * @private
	 */
	number: function(value){
		return {isValid:true};
	},
	/**
	 * To validate whether the value is a url
	 * Regular expression used is - /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
	 * 
	 * @method validation_.url
	 * 
	 * @param {} value
	 * @return true if valid url else false
	 * 
	 * @private
	 */
	url:function(value){
		var regexp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
		return {isValid:!value||regexp.test(value), message:'Not a valid URL'};
	}
})(typeof exports === 'undefined'? this['mymodule']={}: exports);