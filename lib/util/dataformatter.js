"use strict";
/**
 * Various field formats
 * Date format uses moment based formatting and parsing
 */
var moment = require("moment");

var DataFormatter = {
	/**
	 * @method DataFormatter.date
	 * 
	 * @param {} value
	 * @param {} defaultValue
	 * @param {} body
	 * @return number
	 * 
	 * @private
	 */
	date:function(value, defaultValue, options){
		var datevalue = value||defaultValue;
		
		var format = "MM.DD.YYY";//defaultformat;
		if(options && typeof options == "string")
			format = options;
		else if(options && options.format)
			format = options.format;
		
		try{
			console.log(datevalue + ' >>>> '+ format +' >>> ' +moment(datevalue, format).isValid() + '>>>>>' + moment(datevalue, format).toDate());
		}catch(error){
			console.log(error);
		}
		
		if(datevalue && format.length == datevalue.length)
			return moment(datevalue, format).toDate();
		else {
			return moment(datevalue).toDate();
		}	
	},
		
	/**
	 * @method DataFormatter.number
	 * 
	 * @param {} value
	 * @param {} defaultValue
	 * @param {} body
	 * @return number
	 * 
	 * @private
	 */
	"float": function(value, defaultValue, body){
		var numbervalue = value||defaultValue;
		if(numbervalue) //German number format fix
			numbervalue = ((numbervalue+'').replace(/,/g, '.'))
		
		if(numbervalue)
			numbervalue = Number(numbervalue);
		
		return numbervalue;
	},
	
	/**
	 * @method DataFormatter.number
	 * 
	 * @param {} value
	 * @param {} defaultValue
	 * @param {} body
	 * @return number
	 * 
	 * @private
	 */
	"number": function(value, defaultValue, body){
		var numbervalue = value||defaultValue;
		
		if(numbervalue)
			numbervalue = Number(numbervalue);
					
		return numbervalue;
	},
	/**
	 * @method DataFormatter.boolean
	 * 
	 * @param {} value
	 * @param {} defaultValue
	 * @param {} body
	 * @return boolvalue
	 * 
	 * @private
	 */
	"boolean": function(value, defaultValue, body){
		var boolvalue = defaultValue||false;
		
		if((value == 'true' || value == '1' || value == 'on') || value)
			boolvalue = true;
		
		return boolvalue;
	},
	/**
	 * @method DataFormatter.array
	 * 
	 * @param {} value
	 * @param {} defaultValue
	 * @param {} body
	 * 
	 * @return array of values
	 * 
	 * @private
	 */
	"array": function(value, defaultValue, body){
		if(!value)
			return defaultValue||[];
		
		return util.getArrayValues(value);
	},
	
	/**
	 * @method DataFormatter.string
	 * 
	 * @param {} value
	 * @param {} defaultValue
	 * @param {} body
	 * 
	 * @return formatted string
	 * 
	 * @private
	 */
	"string": function(value, defaultValue, body){
		if(!value)
			return defaultValue||[];

		return value.trim();
	},
	
	/**
	 * Format a field based on the default value
	 * @param value string
	 * @param defaultValue number, float, array
	 * 
	 * @returns formatted object string, number, array or date
	 */
	"formatWithDefaultData": function(value, defaultValue, options){
		if(!defaultValue)
			return value;
		else{
			var datatype = typeof defaultValue;
			
			if(datatype == "object" && typeof defaultValue.length == "number" && defaultValue.length > 0 && typeof defaultValue[0] == "string")
				datatype = "array";
			
			//@BUGFIX number to float
			if(datatype == "number" && defaultValue === Number(defaultValue) && defaultValue % 1 !== 0)
				datatype = "float";
						
			if(DataFormatter[datatype])
				return DataFormatter[datatype](value, defaultValue, options);
			else
				return value;
		}
	},
	
	/**
	 * @param object object to format
	 * @param formats various format with key as field name in the model
	 */
	"formatObject": function(formats, object, defaultobject, objectsource){
		for(var field in formats){
			var formatter = formats[field];
			
			if (field == 'object'){}//skipping object format will handle at the end of all individual format!
			else if ( typeof formatter == "string" && DataFormatter[formatter] )
				object[field] = DataFormatter[formatter](object[field], defaultobject[field], objectsource);
			else if( typeof formatter == "object" && object[field] ){
				var formatterkey = Object.keys(formatter)[0];
				var formatteroptions = formatter[formatterkey];
				if ( DataFormatter[formatterkey] )
					object[field] = DataFormatter[formatterkey](object[field], defaultobject[field], formatteroptions, objectsource);
			} else if( typeof formatter == "function" && object[field] )
				object[field] = formatter(object[field], defaultobject[field], objectsource);
		}
		
		/**
		 * format key object is used for handling object formatting
		 */
		if(formats.hasOwnProperty('object') && typeof formats['object'] === "function"){
			object = formats['object'](object, objectsource);
		}
		
		return object;
	},
	
	/**
	 * To get the formatter from formats object
	 */
	getDataFormatter: function(formats, field){
		var formatter = formats[field];
		
		if (typeof formatter == "string" && DataFormatter[formatter])
			return [formatter];
		else if( typeof formatter == "object"){
			var formatterkey = Object.keys(formatter)[0];
			var formatteroptions = formatter[formatterkey];
			
			if ( DataFormatter[formatterkey] )
				return [formatterkey, formatteroptions];
		}else
			return null;
	}
}

var util = {};

/**
 * To get the array values from a value seperarted by a special charactar
 * 
 * @method getArrayValues
 * @param {} value
 * @param {} seperator
 * @param {} defaultKey
 * @return arrayResult array of values
 */
util.getArrayValues = function(value, seperator, defaultKey) {
	if(!value || value.length == 0)
		return [];
	
	if(value == '')
		return [];
	
	if(typeof value == 'array' || (typeof value =='object' && typeof value.length  == "number")){
		if(typeof value == 'array' && value.length == 1 && typeof value[0] == 'object' && Object.keys(value[0]).length == 0)
			return [];
		else
			return value;	
	}
	
	value = String(value);
	var arrayString = value.split(seperator || ",");
	var arrayResult = new Array();
	
	for (var i=0; i < arrayString.length; i++) {
		if (defaultKey || defaultKey != null) {
			var tempValue = {};
			tempValue[defaultKey] = arrayString[i].trim();
			arrayResult.push(tempValue);
		} else {
			var val = arrayString[i].trim();
			if(val != '')
				arrayResult.push(arrayString[i].trim());
		}
	}
	
	return arrayResult;
}

module.exports = DataFormatter;