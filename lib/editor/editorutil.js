"use strict";

/*!
 * Simple Node Mobile Portal
 * Copyright(c) 2012-2017 Faisal Kottarathil(admin@simpleportaljs.com)
 *	
 * MIT Licensed
 */
/**
 * Get editor fields from a json object
 * can extend from a user configuration
 */
var Util = module.exports = {},
	util = require("./../util"),
	Dataformatter = require("./../util/dataformatter"),
	TemplateUtils = require("./../template/util");

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

Util.getServiceConfiguration = function(serviceoptions, pluginloader){
	var servicedata;
	
	var servicename = serviceoptions.service,
		subservicename = serviceoptions.subservice;
	
	if(servicename){
		var serviceconfig = servicedata = pluginloader.getServiceloader().getServiceDetails(servicename);
		
		if(subservicename && servicedata/* && servicedata.configuration.modelsettings*/){
			var submodelsettings,
				modelfield;
			
			if(subservicename.indexOf('/') != -1){
				var subservicestructure = subservicename.split('/'),
					submodelsettings, 
					prevmodelsettings;
				
				for(var i in subservicestructure){
					if(i != 0 && submodelsettings){
						submodelsettings = util.extendJSON({}, submodelsettings.modelsettings[subservicestructure[i]]);
					} else if(servicedata.configuration.modelsettings[subservicestructure[i]]){
						submodelsettings = util.extendJSON({}, servicedata.configuration.modelsettings[subservicestructure[i]]);
					}
					if(submodelsettings && (Number(i)+1) < subservicestructure.length){
						servicedata.model = submodelsettings.model;
						servicedata.modelfields = TemplateUtils.getFieldFromObject(submodelsettings.model, submodelsettings.modelsettings);
					} else if((!submodelsettings||Object.keys(submodelsettings).length ==0) && prevmodelsettings){
						submodelsettings.model = {};
						submodelsettings.model[subservicestructure[i]]=prevmodelsettings.model[subservicestructure[i]];
						submodelsettings.modelfields = TemplateUtils.getFieldFromObject(submodelsettings.model, submodelsettings.modelsettings);
					}
					modelfield = util.getJSONObject(servicedata.modelfields, 'field', subservicestructure[i]);
					prevmodelsettings=submodelsettings;
				}
			}else {
				submodelsettings = servicedata.configuration.modelsettings[subservicename];

				modelfield = util.getJSONObject(servicedata.modelfields, 'field', subservicename);
			}
			
			if(modelfield && modelfield.type == "array" && (modelfield.dataType == "string" || modelfield.dataType == "float" || modelfield.dataType == "number") ){
				modelfield.primary=true;
				servicedata = Util.getServiceModel({modelfields:[modelfield]}, submodelsettings);
				servicedata.primaryKey = modelfield.field;
				modelfield.type=modelfield.dataType;
			} else if(submodelsettings && submodelsettings.model){
				servicedata.primaryKey = Object.keys(submodelsettings.model)[0];
				
				servicedata = Util.getServiceModel(submodelsettings);
			}
			
			if(!servicedata.primaryKey)
				servicedata.primaryKey = serviceconfig.primaryKey;
			
			if(servicedata) {
				servicedata.apiurl = serviceconfig.apiurl + '/' + subservicename;
				servicedata.name = serviceconfig.name + '/' + subservicename;
				
				servicedata.subservice=subservicename;
			}
		}else {
			var servicemodel = Util.getServiceModel(servicedata, servicedata.configuration.modelsettings);
			
			return util.extendJSON(servicedata, servicemodel);
		}
	}
	
	return servicedata;
}

Util.getServiceModel = function(serviceobject, modelsettings){
	var servicemodel = {
		model:serviceobject.model||{},
		configuraton:{
			modelsettings:util.extendJSON({}, serviceobject.modelsettings, modelsettings),
			validation:serviceobject.validation||{},
			dataformat:serviceobject.dataformat||{}
		}
	}
	
	if(serviceobject.model && !serviceobject.modelfields){
		servicemodel.modelfields=TemplateUtils.getFieldFromObject(serviceobject.model, servicemodel.configuraton.modelsettings);
	}else
		servicemodel.modelfields=serviceobject.modelfields||[];
	
	servicemodel.configuraton.modelsettings = util.extendJSON(Util.getModelSettingsFromSettings(servicemodel.modelfields, serviceobject.dataformat, servicemodel.configuraton.modelsettings), servicemodel.configuraton.modelsettings);
	servicemodel.configuraton.validation = util.extendJSON(Util.getValidationFromSettings(servicemodel.modelfields), servicemodel.configuraton.validation);
	
	if(!serviceobject.model)
		servicemodel.model = TemplateUtils.getModelFromSettings(servicemodel.modelfields);
	
	return servicemodel;
}

Util.getModelSettingsFromSettings = function(modelfields, dataformat){
	var modelsettings={};
	
	for(var fieldIndex in modelfields){
		var modelfield = modelfields[fieldIndex];
		
		//@TODO check data format and update data type
		if(dataformat) {
			// only change the type if it is date or time
			var dataformat = Dataformatter.getDataFormatter(dataformat, modelfield.field);
			if(dataformat && dataformat[0] == "date"){
				modelfield.type="date";
				
				if(!modelfield.fieldsetting)modelfield.fieldsetting={displayoptions:{}};
					modelfield.fieldsetting.type = modelfield.type;
				
				if(!modelfield.fieldsetting.displayoptions)
					modelfield.fieldsetting.displayoptions={};
				
				if(typeof dataformat[1] == "object")
					modelfield.fieldsetting.displayoptions = dataformat[1];
				else if (typeof dataformat[1] == "string")
					modelfield.fieldsetting.displayoptions.format = dataformat[1];
			}
		}
		
		if(modelfield.type == "array" && (modelfield.dataType == "string" || modelfield.dataType == "float" || modelfield.dataType == "number")){
			if(!modelfield.fieldsetting)modelfield.fieldsetting={multiple:true};
			
			modelfield.fieldsetting.type = modelfield.type;
			modelfield.fieldsetting.dataType = modelfield.dataType;
			delete modelfield.multiple;
			
			modelfield.fieldsetting.model={};
			modelfield.fieldsetting.model[modelfield.field]='';
			
			modelfield.fieldsetting.validation={};
			modelfield.fieldsetting.validation[modelfield.field]=modelfield.validation = "required";
		} else if(modelfield.type == "array"){
//			modelfield.fieldsetting={multiple:true, type:modelfield.dataType};
			modelfield.fieldsetting={multiple:true, type:modelfield.type, dataType: modelfield.dataType, model:{}, validation:{}, modelsettings:{}};
		} else if(modelfield.type == "object"){
			if(!modelfield.fieldsetting)modelfield.fieldsetting={};
				
			modelfield.fieldsetting.type = modelfield.type;
		} else if(modelfield.fieldsetting && modelfield.type){
			if(!modelfield.fieldsetting.type)
				modelfield.fieldsetting.type=modelfield.type;
		}
		
		if(modelfield.fieldsetting && modelfield.dataType)
			modelfield.fieldsetting.dataType=modelfield.dataType;
		
		if(modelfield.fieldsetting && modelfield.multiple)
			modelfield.fieldsetting.multiple=modelfield.multiple;
		
		if(modelfield.fieldsetting && modelfield.fieldsetting.model){
			//do update the props from
			var sub_modelfields = TemplateUtils.getFieldFromObject(modelfield.fieldsetting.model, modelfield.fieldsetting.modelsettings)
			modelfield.fieldsetting.modelsettings=util.extendJSON(Util.getModelSettingsFromSettings(sub_modelfields, modelfield.fieldsetting.dataformat, modelfield.fieldsetting.modelsettings), modelfield.fieldsetting.modelsettings);
		} else if(modelfield.fieldsetting){
			//@TODO fix issues for handling the model fields
//			console.log("+++++++++++++++NO MODAL["+modelfield.field+"]+++++++++++++++");
//			console.log(modelfield.fieldsetting);			
//			console.log("+++++++++++++++NO MODAL["+modelfield.field+"]+++++++++++++++");
		}	
		
		if(modelfield.fieldsetting){
			modelsettings[modelfield.field]=modelfield.fieldsetting;
		}
	}
	return modelsettings;
};

Util.getValidationFromSettings = function(modelfields){
	var validationobject={};

	if(modelfields)
		modelfields.forEach(function(modelfield){
			if(modelfield.validation)
				validationobject[modelfield.field] = modelfield.validation;
			else if(modelfield.primary)
				validationobject[modelfield.field] = "required";
			else if(Dataformatter.hasOwnProperty(util.modelValidations[modelfield.dataType]))
				validationobject[modelfield.field] = modelfield.dataType;
		});
	
	return validationobject;
}