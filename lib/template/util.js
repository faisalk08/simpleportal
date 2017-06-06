"use strict";
(function(exports){
    /**
     * To capitalize the given words first letter
     */
	exports.capitaliseFirstLetter = function(string){
    	if(!string)
    		return string;
    	return string.charAt(0).toUpperCase() + string.slice(1);
    };
    
    /**
     * To change the  first chrecter to lower case
     */
    exports.lowercaseFirstLetter = function(string){
    	if(!string)
    		return string;
    	return string.charAt(0).toLowerCase() + string.slice(1);
    };
    
    /**
     * Get the formatted json key 
     * 
     * @method formatJSONKey
     * 
     */
    exports.formatJSONKey = function(field){
    	return field.replace(/ /g, '').replace(/(\/|\\|\'|\"|\.|-|;|\(|\))/ig, '_');
    };
    
	exports.formatLangArguments = function(value, args){
		/*
		 * This function will replace the dynamic value passed in arguments.Eg: {0} will be replaced with first value in arguments array.
		 */
		if(args && (typeof args == "string" || typeof args.length != "number")){
			value = value.replace('{0}', args);
		}else if(args && args.length > 0){
			for(var index in args){
				value = value.replace('{'+index+'}', args[index]);
			}
		}
		
		return value;
	};
	
	exports.convertLangKey = function(key){
		return exports.capitaliseFirstLetter(key.replace(/[-|_]/gi, ' '));
	};

    // your code goes here
	exports.getTranlsatedMessage = function(translationlookup, langkey, key, args){
		if(!key || typeof key !== 'string')
			return key;
		
		/*
		 * Should use the translation from the remote server later for now fine to use the json based translation.
		 */
		if(translationlookup && translationlookup[langkey]){
			if(translationlookup[langkey][key]){
				return exports.formatLangArguments(translationlookup[langkey][key], args);
			} else if(translationlookup[langkey][key.toLowerCase()]){
				return exports.formatLangArguments(translationlookup[langkey][key.toLowerCase()], args);
			} else if(key.indexOf("-") > -1){
				var keyarray = key.split("-");
				
				var translatedmessage = '';
				for(var index in keyarray)
					translatedmessage += ' ' + exports.getTranlsatedMessage(translationlookup, langkey, keyarray[index]);
				
				return translatedmessage;
			}else return exports.convertLangKey(key);
		}else{
			return exports.convertLangKey(key);
		}
	};
	
	/**
	 * To get model from model field settings
	 */
	exports.getModelFromSettings = function(modelfields){
		var modelobject={};

		if(modelfields)
			modelfields.forEach(function(modelfield){
				var dbfield = exports.formatJSONKey(modelfield.field);
				
				modelobject[dbfield]=null;
				
				if(defaultvalue_mapping.hasOwnProperty(modelfield.dataType))
					modelobject[dbfield] = defaultvalue_mapping[modelfield.dataType];
				
				if(modelfield.multiple && modelobject[dbfield])
					modelobject[dbfield]=[modelobject[dbfield]];
			});
		
		return modelobject;
	}
	
	/**
	 * To get the field from object
	 */
	exports.getFieldFromObject = function(object, fieldprefix, categorytree, modelsettings){
		if(typeof fieldprefix == "object"){
			modelsettings = fieldprefix;
			fieldprefix='';
		}
		
		var fieldarray = [],
			objectfields = Object.keys(object||{}),
			fieldprefix = fieldprefix||'';
		
		if(fieldprefix.length > 0 && fieldprefix.lastIndexOf("__") != fieldprefix.length -2 )
			fieldprefix = fieldprefix + "__";
		
		for(var fieldIndex in objectfields){
			var field = objectfields[fieldIndex];
			var fielddataType = typeof object[field];
			
			var modelfield = {html:{caption:field}, field: fieldprefix + field, dataType:fielddataType, defaultvalue:object[field]};
			if(modelsettings && modelsettings[field])
				modelfield.fieldsetting = modelsettings[field];
			
			if(typeof object[field] == 'boolean')
				modelfield.type='checkbox';
			else if(typeof object[field] == 'number'){
				if(object[field] === Number(object[field]) && object[field] % 1 !== 0)
					modelfield.type='float';
				else
					modelfield.type='number';
			} else if(object[field] instanceof Array 
				|| (object[field] && typeof object[field] === "object" && typeof object[field].length == "number")){
				modelfield.dataType=  'object';
				if(object[field] && object[field].length >= 1){
					modelfield.dataType=  typeof object[field][0];
				}
				modelfield.type= 'array';
				modelfield.multiple=true;
			} else if(typeof object[field] == 'object'){
				var category = fieldprefix.substring(fieldprefix.lastIndexOf('__')+2, fieldprefix.length) + field;
				var categorytitle = fieldprefix.substring(0, fieldprefix.lastIndexOf('__'));
				
				var submodelsettings;
				if(modelsettings && modelsettings[field])
					submodelsettings = modelsettings[field];
				
				var subfields = exports.getFieldFromObject(object[field], fieldprefix + field, categorytree, submodelsettings);
				
				if(subfields && subfields.length > 0)
					for(var i in subfields){
						if(i == 0 && !subfields[i].html.category){
							subfields[i].html.categorytitle=categorytitle.replace(/__/ig, ' > ');
							subfields[i].html.category = category;	
						}
						
						fieldarray.push(subfields[i]);
					}
				else{
					modelfield.type='object';
					
					delete modelfield.dataType;
				}	
			} 
			fieldarray.push(modelfield);
		}
		
		return fieldarray;
	};
	
	/**
	 * To get the model from an object
	 */
	exports.getModelFromObject = function(object, fieldprefix, categorytree){
		var modelobject = {},
			objectfields = Object.keys(object||{}),
			fieldprefix = fieldprefix||'';
		
		if(fieldprefix.length > 0 && fieldprefix.lastIndexOf("__") != fieldprefix.length -2 )
			fieldprefix = fieldprefix + "__";
		
		for(var fieldIndex in objectfields){
			var field = objectfields[fieldIndex];
			var fielddataType = typeof object[field];
			
			// format field 
			var dbfield = exports.formatJSONKey(field);
			
			if(typeof object[field] == 'boolean')
				modelobject[dbfield]=false;
			else if(typeof object[field] == 'number'){
				if(object[field] === Number(object[field]) && object[field] % 1 !== 0)
					modelobject[dbfield]=0.0;
				else
					modelobject[dbfield]=0;
			} else if(object[field] instanceof Array){
				var objecttype = 'object';
				if(object[field] && object[field].length == 1){
					objecttype = typeof object[field][0];
					if(objecttype == 'string')
					modelobject[dbfield]=[''];
					else
						modelobject[dbfield]=[{}];
				}else
					modelobject[dbfield]=[''];
			} else if(typeof object[field] == 'object'){
				modelobject[dbfield]={};
			} else
				modelobject[dbfield]='';
		}
		
		return modelobject;
	};
	
	var defaultvalue_mapping = {
		"boolean":false, 
		"float":0.0, 
		"number":0, 
		"string":"", 
		"text":"", 
		"date":"", 
		"object":{}, 
		"array":[]
	};
})(typeof exports === 'undefined'? this['mymodule']={}: exports);