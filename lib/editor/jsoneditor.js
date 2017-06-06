"use strict";

/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012-2017 Faisal Kottarathil(admin@simpleportaljs.com)
 *	
 * MIT Licensed
 */
var simpleportal = require('./../simpleportal'),
	Template = require('./../util/template'),	
	template = require('./template'),
	events = require('events'),
	util = require("util"),
	fs=require('fs'),
	simpleportalUtil = require("./../util"),
	TemplateUtils = require("./../template/util");

/**
 * Class for modifying json files 
 * 
 * @class JSONEditor
 */
var JSONEditor = function(options, defaultconfiguration){
	var instance = this;

	instance.init(options, defaultconfiguration);
	
	return instance;
}
util.inherits(JSONEditor, events.EventEmitter);

JSONEditor.DEFAULTS = {
	title : 'JSON Editor',
	name : 'jsoneditor',
	uri : '/jsoneditor/',	
	root : simpleportal.resourcesdir + "/settings",
	cdndir : simpleportal.resourcesdir + "/cdn",
	index : 'index.ejs',
	form1 : 'configuration',
	form : 'tabbedconfiguration',
	template : 'ejs',
	fields : []
};

JSONEditor.prototype.activate = function(disable){
	var instance = this;
	
	var active = true;
	if(!disable)
		active = false;
	
	instance.active=active;
}

JSONEditor.prototype.init = function(options, defaultconfiguration){
	var instance = this;
	
	instance.options = simpleportalUtil.clone(JSONEditor.DEFAULTS);
	
	if(options)
		instance.options = simpleportalUtil.extendJSON(instance.options, options);
	
	if(instance.options.root){
		instance.options.templatedir =  instance.options.root + '/templates'; 
	}else{
		throw Error('JSON Editor need the root folder to proceed!');	
	}
	
	if(instance.options.jsonfile)
		instance.jsonfile = instance.options.jsonfile;
	
	if(instance.options.ext_jsonfile)
		instance.ext_jsonfile = instance.options.ext_jsonfile;
	
	instance.jsonobject = {};
	instance.defaultjsonobject = {};
	instance.editorsettings={};
	
	instance.editorsettings.name = (instance.options.name || 'jsoneditor');
	instance.editorsettings.header = (instance.options.title || 'Configuration / JSON Editor');
	
	if(instance.options.url)
		instance.editorsettings.url = (instance.options.url);
	else
		instance.editorsettings.url = (instance.options.uri || '/')  + '/update';
	
	instance.editorsettings.rooturl= (instance.options.uri || '/');
	
	instance.editorsettings.formURL= (instance.options.uri || '/') + '/templates/' + instance.options.form||'configuration';
	
	instance.editorsettings.rootfield= instance.options.rootfield;
	instance.editorsettings.fields= instance.options.fields||[];
	
	// call the configuration update
	if(defaultconfiguration) {
		instance.defaultjsonobject = simpleportalUtil.extendJSON({}, defaultconfiguration);
		
		instance.updateJSONObject(instance.defaultjsonobject);
	}
	
	instance.active=true;
	
	events.EventEmitter.call(instance);
}

/**
 * To update the field list from the provided json object
 */
JSONEditor.prototype.updateFieldFromJSONObject = function(defaultconfiguration){
	var instance = this;
	
	if(!instance.defaultjsonobject)
		instance.defaultjsonobject={};
	
	instance.defaultjsonobject = simpleportalUtil.extendJSON(instance.defaultjsonobject, defaultconfiguration);
	
	instance.editorsettings.fields = TemplateUtils.getFieldFromObject(instance.defaultjsonobject);
	
	instance.updateJSONObject(instance.defaultjsonobject);
}

JSONEditor.prototype.updateFields = function(fields){
	var instance = this;
	instance.editorsettings.fields=fields;
	
	instance.updateJSONObject(instance.defaultjsonobject);
}

/**
 * To get field setting based on the flattened key.
 * 
 */
JSONEditor.prototype.getFieldSetting =  function(field){
	var instance = this;
	return simpleportalUtil.getJSONObject(instance.getEditorSettings().fields, 'field', field);
}

/**
 * To update the json object based on the fields 
 * 
 * Only used by initialize method
 */
JSONEditor.prototype.updateJSONObject = function(defaultconfiguration){
	var instance = this;
	
	instance.jsonobject = {};
	var tabbedfields = {general:[]};
	
	var flattenjson = simpleportalUtil.flattenJSON(defaultconfiguration, '__');
	
	if(defaultconfiguration){
		for(var i in instance.editorsettings.fields){
			var field = instance.editorsettings.fields[i];
			
			var elementfield = field.field;
			if(instance.options.rootfield && field.field)
				elementfield = field.field.replace(instance.options.rootfield + '__', '');
			
			if(typeof flattenjson[elementfield] == 'object' && flattenjson[elementfield].id) // FIX- when using w2ui list plugin data is send in a object with id as the value
				instance.jsonobject[field.field]=flattenjson[elementfield].id;
			else if(flattenjson[elementfield])
				instance.jsonobject[field.field]=flattenjson[elementfield];
			else if(typeof flattenjson[field.field] == 'object' && flattenjson[field.field].id) // FIX- when using w2ui list plugin data is send in a object with id as the value
				instance.jsonobject[field.field]=flattenjson[field.field].id;
			else
				instance.jsonobject[field.field]=flattenjson[field.field];
			
			if(field.field.indexOf('__') != -1){
				var tab = field.field.substring(0, field.field.indexOf('__'));
				if(!tabbedfields[tab])
					tabbedfields[tab]=[];
				
				tabbedfields[tab].push(field);
			}else
				tabbedfields['general'].push(field);
		}
	}
	
	var tabs =[];
	for(var i in tabbedfields){
		if(!tabbedfields[i]||tabbedfields[i].length == 0)
			console.log('Skipping tab no fields found!!');
		else
			tabs.push({id:i, caption:i, fields:tabbedfields[i]})
	}
	
	instance.tabs = tabs;
	instance.editorsettings.tabs=tabs;
	
	return instance;
}

JSONEditor.prototype.getEditorSettings = function(flatten){
	var instance = this;
	
	return instance.editorsettings;
}

JSONEditor.prototype.getJSONObject = function(flatten, category, categoryid){
	var instance = this;
	
	if(flatten)
		return simpleportalUtil.flattenJSON(instance.jsonobject, '__');
	else
		return instance.jsonobject;
}

JSONEditor.prototype.getJSONDefaults = function(category){
	var instance = this;
	if(!category || !instance._defaults || !instance._defaults[category]){
		return null;
	}
	
	return instance._defaults[category];
}

JSONEditor.prototype.addJSONDefaults = function(category, defaults){
	var instance = this;
	
	if(!instance._defaults){
		instance._defaults={};
	}
	
	instance._defaults[category] = defaults;
}

JSONEditor.prototype.getObject = function(flatten, category, categoryid){
	var instance = this;
	
	var object = simpleportalUtil.clone(instance.editorsettings);
	
	if(!flatten)
		object.record = instance.getJSONObject(instance.jsonobject[category]);
	else
		object.record = instance.getJSONObject(flatten);
	
	if(category){
		object.name = category;
		
		object.fields=TemplateUtils.getFieldFromObject(instance.getJSONDefaults(category));
	}
	
	return object;
}

JSONEditor.prototype.renderTemplate = function(templatename, data, response){
	var instance = this;
	
	var viewoptions = {
		file : instance.getTemplatePath(templatename),
		data : data
	};
	
	var templateProcess = new Template(viewoptions); 
	templateProcess.render(response, function(error, html){
		if(typeof response == "function"){
			response(error, html)
		}else{
			if(error){
				response.send(500, null, error);
			}else{
				templateProcess.sendToResponse(response);
			}	
		}
	});
//	
//	template.render(instance.getTemplatePath(templatename), data, function(error, html){
//		if(typeof response == 'function')
//			response(error, html);
//		else
//			response.send(200, null, html);
//	});
}

JSONEditor.prototype.getTemplatePath = function(templatename){
	var instance = this;
	
	return simpleportalUtil.getServerPath(instance.options.templatedir + '/' + templatename + '.ejs');
}

JSONEditor.prototype.render = function(data, response){
	var instance = this;
	
	instance.renderTemplate('index', data, response);
}

/**
 * JSON object input 
 * fields array of field
 */
JSONEditor.prototype.getUpdatedObject = function(object, currentobject, fields, callback){
	var instance = this;
	var jsonchanges = {}; 
	
	// can be either way now iterating object instead of fields, if only one changes then no need to iterate entire fields list
	for(var i in object){
		var fieldprops = simpleportalUtil.getJSONObject(fields, 'field', i);
		
		if(fieldprops && !fieldprops['disabled']){
			if(typeof object[i] == 'object' && object[i].id){ // FIX- when using w2ui list plugin data is send in a object with id as the value
				if(currentobject[i] != object[i].id)
					jsonchanges[i] = object[i].id;
			} else if(currentobject[i] != object[i] && object[i] != '')
				jsonchanges[i] = object[i];
			
			if(fieldprops.type=='checkbox' && jsonchanges[i] == '1')
				jsonchanges[i] = true;
			
			else if(fieldprops.type=='checkbox' && jsonchanges[i] != '1') {
				if(currentobject.hasOwnProperty(i))
					jsonchanges[i] = false;
			} else if(fieldprops.multiple && typeof object[i] == "string"){
				jsonchanges[i] = object[i].trim().replace("\n", "").split(",");
			} else if(fieldprops.multiple && typeof object[i] == "object"){
				jsonchanges[i] = object[i];
			}
		}
	}
	
	if(callback)
		callback(null, jsonchanges);
	
	return jsonchanges;
}

JSONEditor.prototype.updateRecord = function(jsonchanges, callback){
	var instance = this;
	
	instance.jsonobject  = simpleportalUtil.extendJSON(instance.jsonobject, jsonchanges);
	
	if(callback)
		callback(null, jsonchanges_unflattened);
}

JSONEditor.prototype.update = function(object, callback){
	var instance = this;
	
	var jsonchanges = {}; 
	
	// can be either way now iterating object instead of fields, if only one changes then no need to iterate entire fields list
	for(var i in object){
		var fieldprops = simpleportalUtil.getJSONObject(instance.editorsettings.fields, 'field', i);
		
		if(fieldprops && !fieldprops['disabled']) {
			if(typeof object[i] == 'object' && object[i].id){ // FIX- when using w2ui list plugin data is send in a object with id as the value
				if(instance.jsonobject[i] != object[i].id)
					jsonchanges[i] = object[i].id;
			} else if(instance.jsonobject[i] != object[i] && object[i] != '')
				jsonchanges[i] = object[i];
			
			if(fieldprops.type == 'checkbox' && jsonchanges[i] == '1')
				jsonchanges[i] = true;
			
			else if(fieldprops.type == 'checkbox' && jsonchanges[i] != '1') {
				if(instance.jsonobject.hasOwnProperty(i))
					jsonchanges[i] = false;
			} else if(fieldprops.multiple && typeof object[i] == "string"){
				jsonchanges[i] = object[i].trim().replace("\n", "").split(",");
			} else if(fieldprops.multiple && typeof object[i] == "object"){
				jsonchanges[i] = object[i];
			}
		}
	}
	var jsonchanges_unflattened = simpleportalUtil.unFlattenJSON(jsonchanges, '__');
	
	instance.jsonobject  = simpleportalUtil.extendJSON(instance.jsonobject, jsonchanges);
	
	if(callback)
		callback(null, jsonchanges_unflattened);
}

JSONEditor.prototype.save = function(updatedobject, savefile, callback){
	var instance = this;
	
	if(!savefile && instance.onsave)
		instance.onsave(updatedobject);
	
	else if(instance.ext_jsonfile && updatedobject && Object.keys(updatedobject).length > 0) {
		var jsontoupdate = simpleportalUtil.clone(updatedobject);
		
		if(fs.existsSync(instance.ext_jsonfile)) {
			var curjson = simpleportalUtil.readJSONFile(instance.ext_jsonfile);
			
			jsontoupdate = simpleportalUtil.extendJSON(curjson, jsontoupdate);
		}
		
		if(callback)
			return fs.writeFileSync(instance.ext_jsonfile, JSON.stringify(jsontoupdate, null, '\t'));
		else
			fs.writeFile(instance.ext_jsonfile, JSON.stringify(jsontoupdate, null, '\t'), callback);
	}
}

JSONEditor.prototype.read = function(){
	var instance = this;
}

module.exports=JSONEditor;