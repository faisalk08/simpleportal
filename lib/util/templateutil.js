"use strict";
/*
 * Exporting the TemplateUtil service.
 */
var TemplateUtil = module.exports = {};

var editorUtil=require('./../editor').Util,
	TemplateUtils = require('./../template/util'),
	util=require('./../util'),
	fs = require('fs'),
	templatetool = require("ejs");

TemplateUtil.PLUGIN_CONFIG = {
//	templatedir:__dirname + '/../../server/resources/templates/plugin',
//	layoutdir:__dirname + "/../../server/resources/templates/plugin/layout/templates",
	templateextension:'.ejs',
	layoutextension:".html.ejs"
};

TemplateUtil.getTemplateConfig= function(pluginloader, key){
	if(pluginloader)
		return pluginloader.getTemplateConfig(key);
	else if(!key)
		return TemplateUtil.PLUGIN_CONFIG;
	else if(key && TemplateUtil.PLUGIN_CONFIG[key])
		return TemplateUtil.PLUGIN_CONFIG[key];
	else
		return null;
}

TemplateUtil.updatePluginViewData = function(viewsettings, pluginsetting, pluginloader){
	var instance = this;
	
	viewsettings = util.extendJSON(viewsettings, {themeconfig:{}, servicelinks:[], modelfiles:[], viewfiles:[], modelfields:[], name:''}, pluginsetting);
	
	if(pluginsetting.webappsetting) {
		if(!pluginsetting.webappsetting.layout)
			pluginsetting.webappsetting.layout={};
		
		if(!pluginsetting.webappsetting.layout.sidepanel)
			 pluginsetting.webappsetting.layout.sidepanel=[];
		
		var cursidepanel = pluginsetting.webappsetting.layout.sidepanel;
		
		if(!pluginsetting.configuration)
			pluginsetting.configuration ={};
		
		for(var i in pluginsetting.configuration.services){
			var service = pluginloader.getServiceloader().getService(i, pluginsetting);
			
			if(service && !util.jsonarraycontains(cursidepanel, 'urlRoot', service.getApiUrl()))
				cursidepanel.push({
					icon:service.getConfiguration('iconclass', 'fa fa-database'), 
					uri:'#' + service.getConfiguration("uri"), 
					display:service.title || service.name, 
					urlRoot:service.getApiUrl()
				});
		}
		
		pluginsetting.webappsetting.layout.sidepanel = cursidepanel;
		
		if(!pluginsetting.webappsetting)
			viewsettings.webappsetting = {layout:{}};
		else if(!viewsettings.webappsetting.layout){
			viewsettings.webappsetting.layout = {sidepanel:[]};
		}else if(!viewsettings.webappsetting.layout.sidepanel)
			viewsettings.webappsetting.layout.sidepanel = [];
		
		viewsettings.webappsetting.layout.sidepanel = cursidepanel;
	}
	return viewsettings;
}

TemplateUtil.getPluginTemplateData = function(request, templatedata, options, pluginsetting, pluginloader){
	if(pluginsetting)
		templatedata.pluginsetting = pluginsetting;
	
	if(templatedata.pluginsetting && templatedata.pluginsetting.id){
		// have a look at plugin changed 
		if(pluginloader.hasPluginChanged(templatedata.pluginsetting.id)){
			var latestplugindata = pluginloader.getPluginDetails(templatedata.pluginsetting.id, templatedata.pluginsetting.plugintype);
			
			if(latestplugindata)
				TemplateUtil.updatePluginViewData(pluginsetting, latestplugindata, pluginloader);
			
			// reset the changed attribute
			pluginloader.removePluginChanged(templatedata.pluginsetting.id);
		}
//		
//		var latestplugindata = simpleportal.pluginloader.getPluginDetails(templatedata.pluginsetting.id, templatedata.pluginsetting.plugintype);
//		if(latestplugindata && latestplugindata[pluginsetting.plugintype+'setting'])
//			templatedata.pluginsetting[pluginsetting.plugintype+'setting'] = latestplugindata[pluginsetting.plugintype+'setting'];
	}
	
	if(options.servicename) {
		TemplateUtil.getServiceConfigData(options.servicename, templatedata, pluginsetting, pluginloader);
	}
	
//	if(templatedata.pluginsetting.configuration && templatedata.pluginsetting.configuration.webappsetting && templatedata.pluginsetting.configuration.webappsetting.layout && templatedata.pluginsetting.configuration.webappsetting.layout.sidepanel){
//		var cursidepanel = templatedata.pluginsetting.configuration.webappsetting.layout.sidepanel;
//		for(var i in templatedata.pluginsetting.configuration.services){
//			var service = simpleportal.serviceloader[i];
//			
//			if(!util.arraycontains(cursidepanel, 'urlRoot', service.getApiUrl()))
//				cursidepanel.push({uri:'#'+service.configuration.uri, display:service.name, urlRoot:service.getApiUrl()});
//		}
////		self.viewsettings.configuration.webappsetting.layout.sidepanel = cursidepanel
//	}
	if(pluginsetting && pluginsetting.plugintype == "theme"){
		// do nothing to set the the properties as default values is available inside theme files itself.
		templatedata.themeconfig = pluginsetting;
	} else{
		if(pluginsetting && pluginsetting[pluginsetting.plugintype + 'setting'] 
			&& pluginsetting[pluginsetting.plugintype + 'setting'].theme){
			
			if(pluginsetting 
				&& pluginsetting[pluginsetting.plugintype+'setting'].theme != "default"){
				
				templatedata.themeconfig = TemplateUtil.getThemeConfig(request, pluginsetting, pluginsetting[pluginsetting.plugintype+'setting'].theme, pluginloader);
				
				if(templatedata.themeconfig)
					templatedata.themesetting = templatedata.themeconfig.themesetting;
			}
		} else if(pluginsetting.theme){
			templatedata.themeconfig = TemplateUtil.getThemeConfig(request, pluginsetting, pluginsetting.theme, pluginloader);
			
			if(templatedata.themeconfig.themesetting)
				templatedata.themesetting = templatedata.themeconfig.themesetting;
		}
	}
	//copy following variable in to the main template body
	var globalvariables = ["metatagpage", "id", "version", "name", "modelname", "title", "webappuri", "description", "configuration", "layout", "themeconfig", "webappsetting", "themesetting", "modelfiles", "viewfiles", "modelfields", "pagelayout", "servicelinks"];
	util.copyJSON(templatedata, globalvariables, pluginsetting);
	
	templatedata["PLUGIN_CONFIG"]=TemplateUtil.getTemplateConfig(pluginloader);//PLUGIN_CONFIG;
	
	return templatedata;
}

/**
 * To get the theme 
 *  - user session userprofile preference Theme Id
 *  - Plugin theme id
 *  - Server configuration theme id passed as the third argument
 *  
 */
TemplateUtil.getThemeConfig = function(request, pluginsetting, default_themeId, pluginloader){
	var themeId = default_themeId;
	var userprofile = request.getUserprofile();
	
	if(pluginsetting && pluginsetting.webappsetting && pluginsetting.webappsetting.theme && !pluginsetting.webappsetting.changetheme)
		themeId = pluginsetting.webappsetting.theme;
	else if(userprofile && userprofile.preference && userprofile.preference.themeId)
		themeId = userprofile.preference.themeId;
	else if(pluginsetting && pluginsetting.webappsetting && pluginsetting.webappsetting.theme)
		themeId = pluginsetting.webappsetting.theme;
	
	var themeconfig;
	if(themeId)
		themeconfig = pluginloader.getPluginDetails((themeId||default_themeId), 'theme');
			//util.getJSONObject(pluginloader.getPlugins('theme'), 'id', (themeId||default_themeId));
	
	return themeconfig
}

TemplateUtil.updatePluginLookupdir = function(pluginsetting, path){
	pluginsetting.lookupdirs = pluginsetting.lookupdirs||[];
	
	if(fs.existsSync(path))
		pluginsetting.lookupdirs.push(path);
}

TemplateUtil.updatePluginLookupdirs = function(pluginsetting, options, pluginloader){
	var templatepath;
	if(options && options.templateroot){
		templatepath = options.templateroot;
	}
	
	var lookupdirs = pluginsetting.lookupdirs = pluginsetting.lookupdirs||[];

	if(pluginsetting.installeddir && pluginsetting.webappsetting && pluginsetting.webappsetting.webapptype)
		TemplateUtil.updatePluginLookupdir(pluginsetting, util.getServerPath(util.appendFilePath(pluginsetting.installeddir, templatepath, pluginsetting.webappsetting.webapptype)));
	
	if(pluginsetting.installeddir && ( !pluginsetting.webappsetting || !pluginsetting.webappsetting.webapptype )){
		pluginloader.getLogger().debug('TemplateUtil:updatePluginLookupdirs ', "including templaes for -- > " + pluginsetting.webappuri + ">> " + pluginsetting.pluginsubtype + ">> " + util.getServerPath(util.appendFilePath(pluginsetting.installeddir, templatepath)));
		TemplateUtil.updatePluginLookupdir(pluginsetting, util.getServerPath(util.appendFilePath(pluginsetting.installeddir, templatepath)));
	}	
	
	// default directory inside simpleportal
	if(pluginsetting.pluginsubtype){
		TemplateUtil.updatePluginLookupdir(pluginsetting, 
			util.appendFilePath(TemplateUtil.getTemplateConfig(pluginloader, 'templatedir'), pluginsetting.plugintype, pluginsetting.pluginsubtype, templatepath)
		);
	}
	
//	if(pluginloader) {
//		TemplateUtil.updatePluginLookupdir(pluginsetting, 
//			util.appendFilePath(pluginloader.templatedir, pluginsetting.plugintype, templatepath)
//		);
//		
//		if(!(pluginsetting.webappsetting && pluginsetting.webappsetting.mobile))
//			TemplateUtil.updatePluginLookupdir(pluginsetting, util.appendFilePath(pluginloader.templatedir, templatepath));
//	}else {
	TemplateUtil.updatePluginLookupdir(pluginsetting, 
		util.appendFilePath(TemplateUtil.getTemplateConfig(pluginloader, 'templatedir'), pluginsetting.plugintype, templatepath)
	);
	
	if(!(pluginsetting.webappsetting && pluginsetting.webappsetting.mobile))
		TemplateUtil.updatePluginLookupdir(pluginsetting, 
			util.appendFilePath(TemplateUtil.getTemplateConfig(pluginloader, 'templatedir'), templatepath)
		);
//	}
	
	setLayoutLink(pluginsetting, 'pagelayout', pluginloader);
	setLayoutLink(pluginsetting, 'servicelayout', pluginloader);
}

function setLayoutLink(pluginsetting, layouttype, pluginloader){
	if(pluginsetting[pluginsetting.plugintype + "setting"] 
		&& pluginsetting[pluginsetting.plugintype + "setting"].layout 
		&& pluginsetting[pluginsetting.plugintype + "setting"].layout[layouttype]){
		
		var layoutpagename = pluginsetting[pluginsetting.plugintype + "setting"].layout[layouttype];
		
		if( layoutpagename && layoutpagename.indexOf("/") == 0 ){
			var pluginid = layoutpagename.substring(1);
			
			pluginid = pluginid.substring(0, pluginid.indexOf("/"));
			
			var pluginpath = layoutpagename.substring(layoutpagename.indexOf( "/" + pluginid + "/" ) + ( pluginid.length + 2 ));
			
			var layoutplugin = pluginloader.getPluginDetails(pluginid, 'all');
			
			if(layoutplugin) {
				var layoutpage = layoutplugin.installeddir + "/" + pluginpath;
				
				pluginsetting[layouttype] = layoutpage;
			} else if(pluginsetting && pluginsetting[layouttype] && fs.existsSync(pluginsetting[layouttype])){
				pluginloader.getLogger().debug('TemplateUtil:setLayoutLink ', "using layout type from configuration.");
			}
		}else {
			if(pluginsetting && pluginsetting[layouttype] && fs.existsSync(pluginsetting[layouttype])){
				pluginloader.getLogger().debug('TemplateUtil:setLayoutLink ', "using layout type from configuration.");
			}else if(pluginsetting && layoutpagename){
				var layoutfile = util.appendFilePath(pluginsetting.installeddir, pluginsetting.layoutdir, layoutpagename);
				
				if(fs.existsSync(layoutfile))
					pluginsetting[layouttype] = layoutfile;
				else{
					layoutfile = util.appendFilePath(pluginsetting.installeddir, pluginsetting.layoutdir, "templates", layoutpagename);
					
					if(fs.existsSync(layoutfile))
						pluginsetting[layouttype] = layoutfile;
				}
			}

			if(!pluginsetting[layouttype]){
				var defaulttemplatepath = util.appendFilePath(TemplateUtil.getTemplateConfig(pluginloader, 'layoutdir'), layoutpagename);
				
				if(layouttype == "servicelayout")
					defaulttemplatepath = util.appendFilePath(TemplateUtil.getTemplateConfig(pluginloader, 'layoutdir'), "content", layoutpagename);
				
				if(fs.existsSync(defaulttemplatepath))
					pluginsetting[layouttype] = defaulttemplatepath;
			}
		}
	}
}

TemplateUtil.updateTemplateLocations = function(request, pluginsetting, pluginloader){
	var templatepath = request.url;

	if(templatepath == "/" 
			&& pluginsetting && pluginsetting.webappsetting 
			&& (pluginsetting.webappsetting.defaulturi 
			&& pluginsetting.webappsetting.defaulturi.indexOf("#") !== 0))
		templatepath = pluginsetting.webappsetting.defaulturi;
	else if(templatepath == '/' && pluginsetting.plugintype == "webapp")
		templatepath = "/index.html";
	
	if(templatepath.indexOf("/") != 0)
		templatepath = templatepath; 
	
	if(templatepath.lastIndexOf('?') != -1)
		templatepath = templatepath.substring(0, templatepath.lastIndexOf('?'));
	else
		templatepath = templatepath;
	
	if(!request.templateoptions)
		request.templateoptions = request.templateoptions || {filelocations:[]};
	
	if(!request.templateoptions.filelocations)
		request.templateoptions.filelocations = [];

	request.templateoptions.htmlfile = templatepath;
	var templatewithextension = util.appendFileExtension(templatepath, TemplateUtil.getTemplateConfig(pluginloader, 'templateextension'));
//	if(!request.templateoptions.filelocations)
//		request.templateoptions.filelocations = [];
//	
	if(pluginsetting.lookupdirs)
		pluginsetting.lookupdirs.forEach(function(lookuppath){
			updateFilePath(request.templateoptions.filelocations, util.appendFilePath(lookuppath, templatewithextension));
//			request.templateoptions.filelocations.push(util.appendFilePath(lookuppath, templatewithextension));
		});
}

var updateFilePath = function(locations, pathtoadd, multiple){
	if((multiple || locations.length <= 0) && fs.existsSync(pathtoadd))
		locations.push(pathtoadd);
	
	return locations;
}

TemplateUtil.updateTemplateThemeLocations = function(request, pluginsetting, themeconfig, pluginloader){
	var templatepath = request.url;

	var layoutconfig;
	if(pluginsetting && pluginsetting.webappsetting && pluginsetting.webappsetting.layout)
		layoutconfig = pluginsetting.webappsetting.layout;

	if(templatepath == "/" 
			&& pluginsetting && pluginsetting.webappsetting 
			&& (pluginsetting.webappsetting.defaulturi && pluginsetting.webappsetting.defaulturi.indexOf("#") !== 0))
		templatepath = pluginsetting.webappsetting.defaulturi;
	/*
	if(request.webpage) {
		templatepath = "index.html";
		layoutconfig.pagelayout = request.webpage.layout||"page.html.ejs";
		layoutconfig.pagelayout = util.appendFileExtension(layoutconfig.pagelayout, TemplateUtil.getTemplateConfig(pluginloader, 'layoutextension'));
		
		var _pagelayout = util.appendFilePath(themeconfig.installeddir, themeconfig.layoutdir, "templates", layoutconfig.pagelayout);
		if(fs.existsSync(_pagelayout))
			pluginsetting.pagelayout = _pagelayout;
		else 
			pluginsetting.pagelayout = util.appendFilePath(TemplateUtil.getTemplateConfig(pluginloader, 'layoutdir'), "page.html.ejs");
	} else if( layoutconfig && (templatepath.indexOf("/pages/") == 0 && templatepath.indexOf(".html") != -1) ){
		layoutconfig.pagelayout = templatepath.indexOf("/pages/home.html") != -1 ? "home.html.ejs" : "page.html.ejs";
		
		var _pagelayout = util.appendFilePath(themeconfig.installeddir, themeconfig.layoutdir, "templates", layoutconfig.pagelayout);
		
		if(fs.existsSync(_pagelayout))
			pluginsetting.pagelayout = _pagelayout;
		else 
			pluginsetting.pagelayout = util.appendFilePath(TemplateUtil.getTemplateConfig(pluginloader, 'layoutdir'), "page.html.ejs");
	}*/
	
	if(
		(templatepath == '/'  && pluginsetting.plugintype == "webapp") ||
		(templatepath.indexOf("/pages/") == 0 && templatepath.indexOf(".html") != -1)
		|| request.webpage
	)
		templatepath = "/index.html";
	
//	if(templatepath.indexOf("/") != 0)
//		templatepath = templatepath; 
	
	if(templatepath.lastIndexOf('?') != -1)
		templatepath = templatepath.substring(0, templatepath.lastIndexOf('?'));
	else
		templatepath = templatepath;
	
	if(!request.templateoptions)
		request.templateoptions = request.templateoptions || {filelocations:[]};
	
	if(!request.templateoptions.filelocations)
		request.templateoptions.filelocations = [];

	request.templateoptions.htmlfile = templatepath;
	var templatewithextension = util.appendFileExtension(templatepath, TemplateUtil.getTemplateConfig(pluginloader, 'templateextension'));
	
	var plugintypesetting = pluginsetting[pluginsetting.plugintype + "setting"];
	
	var plugintype = pluginsetting.plugintype,
		pluginsubtype;
	
	if(plugintypesetting && plugintypesetting[pluginsetting.plugintype + "type"])
		pluginsubtype = plugintypesetting[pluginsetting.plugintype + "type"];
	
	if(themeconfig && themeconfig.lookupdirs)
		themeconfig.lookupdirs.forEach(function(lookuppath){
			// check if the pluginsubtype is available inside theme
			if(pluginsubtype){
				updateFilePath(request.templateoptions.filelocations, util.appendFilePath(lookuppath, 'templates', plugintype, pluginsubtype, templatewithextension), true);
//				if(fs.existsSync(util.appendFilePath(lookuppath + '/templates/' + pluginsubtype, templatewithextension)))
//					request.templateoptions.filelocations.push(util.appendFilePath(lookuppath + '/templates/' + pluginsubtype, templatewithextension));
			}
			if(plugintype){
				updateFilePath(request.templateoptions.filelocations, util.appendFilePath(lookuppath, 'templates', plugintype, templatewithextension), true);
//				if(fs.existsSync(util.appendFilePath(lookuppath + '/templates/' + plugintype, templatewithextension)))
//					request.templateoptions.filelocations.push(util.appendFilePath(lookuppath + '/templates/' + plugintype, templatewithextension));
			}
			updateFilePath(request.templateoptions.filelocations, util.appendFilePath(lookuppath, 'templates', templatewithextension), true);
//			if(fs.existsSync(util.appendFilePath(lookuppath, 'templates', templatewithextension)))
//				request.templateoptions.filelocations.push(util.appendFilePath(lookuppath, 'templates', templatewithextension));
			
			// check if the pluginsubtype is available inside theme
			if(pluginsubtype){
				updateFilePath(request.templateoptions.filelocations, util.appendFilePath(lookuppath, plugintype, pluginsubtype, templatewithextension), true);
				
//				if(fs.existsSync(util.appendFilePath(lookuppath, plugintype, pluginsubtype, templatewithextension)))
//					request.templateoptions.filelocations.push(util.appendFilePath(lookuppath, plugintype, pluginsubtype, templatewithextension));
			}
			
			if(plugintype){
				updateFilePath(request.templateoptions.filelocations, util.appendFilePath(lookuppath, plugintype, templatewithextension), true);
//				if(fs.existsSync(util.appendFilePath(lookuppath, plugintype, templatewithextension)))
//					request.templateoptions.filelocations.push(util.appendFilePath(lookuppath, plugintype, templatewithextension));
			}
			updateFilePath(request.templateoptions.filelocations, util.appendFilePath(lookuppath, templatewithextension), true);
//			if(fs.existsSync(util.appendFilePath(lookuppath, templatewithextension)))
//				request.templateoptions.filelocations.push(util.appendFilePath(lookuppath, templatewithextension));
			
//			// check if the pluginsubtype is available inside theme
//			if(plugintypesetting && plugintypesetting[pluginsetting.plugintype + "setting"] && plugintypesetting[pluginsetting.plugintype + "setting"][pluginsetting.plugintype + "type"]){
//				if(fs.existsSync(util.appendFilePath(lookuppath, plugintypesetting[pluginsetting.plugintype + "setting"][pluginsetting.plugintype + "type"], templatewithextension)))
//					request.templateoptions.filelocations.push(util.appendFilePath(lookuppath, plugintypesetting[pluginsetting.plugintype + "setting"][pluginsetting.plugintype + "type"], templatewithextension));
//			}
			
		});
	
	// check there is layouts inside the theme
	if(themeconfig && themeconfig.layoutdir && layoutconfig && layoutconfig.pagelayout) {
		var themelayoutpath;
		if(pluginsetting.pagelayout)
			themelayoutpath =  pluginsetting.pagelayout.replace(pluginsetting.installeddir, themeconfig.layoutdir);
		
		if(themelayoutpath)
			themelayoutpath = util.appendFilePath(themeconfig.installeddir, themeconfig.layoutdir, pluginsetting.pagelayout.substring(pluginsetting.pagelayout.indexOf("layout/") + 6));
		else{
			themelayoutpath = util.appendFilePath(themeconfig.installeddir, themeconfig.layoutdir, layoutconfig.pagelayout);
			
			if(!fs.existsSync(themelayoutpath)){
				themelayoutpath = util.appendFilePath(themeconfig.installeddir, themeconfig.layoutdir, "templates", layoutconfig.pagelayout);
			}
		}
		
		if(fs.existsSync(themelayoutpath)){
			pluginsetting.pagelayout = themelayoutpath;
		}
	}
}

TemplateUtil.updatePluginTemplateOptions = function(request, pluginsetting, options, pluginloader){
	var templatepath = request.url;

	if(templatepath == "/" 
		&& pluginsetting && pluginsetting.webappsetting 
		&& (pluginsetting.webappsetting.defaulturi 
		&& pluginsetting.webappsetting.defaulturi.indexOf("#") !== 0))
		templatepath = pluginsetting.webappsetting.defaulturi;
	
	if(
		templatepath == '/'  /*|| templatepath == '/mobile/'  || templatepath == '/mobile' */|| (templatepath.indexOf("/pages/") == 0
		&& templatepath.indexOf(".html") != -1))
		templatepath = "/index.html.ejs";
	
	if(templatepath.indexOf("/") != 0)
		templatepath = templatepath; 
	
	if(templatepath.lastIndexOf('?') != -1)
		templatepath = templatepath.substring(0, templatepath.lastIndexOf('?'));
	else
		templatepath = templatepath;
	
	if(!request.templateoptions)
		request.templateoptions = request.templateoptions || {filelocations:[]};
	
	if(!request.templateoptions.filelocations)
		request.templateoptions.filelocations = [];

	request.templateoptions.templatename = 	templatepath;

	var templatewithextension = util.appendFileExtension(templatepath, TemplateUtil.getTemplateConfig(pluginloader, 'templateextension'))
	var templateroot ;
	if(options && options.templateroot)
		templateroot = options.templateroot;

	var plugintypesetting = pluginsetting[pluginsetting.plugintype + "setting"];
	var plugintype = pluginsetting.plugintype,
		pluginsubtype;
	if(plugintypesetting && plugintypesetting[pluginsetting.plugintype + "type"])
		pluginsubtype = plugintypesetting[pluginsetting.plugintype + "type"];

	if(pluginsubtype) {
		var templatefilename = util.appendFilePath(pluginsetting.installeddir, templateroot, pluginsubtype, templatewithextension);
		request.templateoptions.filelocations = updateFilePath(request.templateoptions.filelocations, util.getServerPath(templatefilename), true);
		
//		var templatefilename = util.appendFilePath(pluginsetting.installeddir, pluginsetting.pluginsubtype, templateroot, templatewithextension);
//		request.templateoptions.filelocations = updateFilePath(request.templateoptions.filelocations, util.getServerPath(templatefilename), false);
	}
	
	var templatefilename = util.appendFilePath(pluginsetting.installeddir, templateroot, plugintype, templatewithextension);
	if(fs.existsSync(util.getServerPath(templatefilename)))
		request.templateoptions.filelocations = updateFilePath(request.templateoptions.filelocations, util.getServerPath(templatefilename), true);
	
	var templatefilename = util.appendFilePath(pluginsetting.installeddir, templateroot, templatewithextension);
	if(fs.existsSync(util.getServerPath(templatefilename)))
		request.templateoptions.filelocations = updateFilePath(request.templateoptions.filelocations, util.getServerPath(templatefilename), true);
	
	// default ditectary inside simpleportal
//	if(pluginsubtype) {
//		request.templateoptions.filelocations = updateFilePath(request.templateoptions.filelocations, util.appendFilePath(TemplateUtil.getTemplateConfig(pluginloader, 'templatedir'), pluginsetting.plugintype, pluginsubtype, templateroot, templatewithextension), false);
//		request.templateoptions.filelocations = updateFilePath(request.templateoptions.filelocations, util.appendFilePath(TemplateUtil.getTemplateConfig(pluginloader, 'templatedir'), pluginsetting.plugintype, templateroot, templatewithextension), false);
//		request.templateoptions.filelocations = updateFilePath(request.templateoptions.filelocations, util.appendFilePath(TemplateUtil.getTemplateConfig(pluginloader, 'templatedir'), templateroot, templatewithextension), false);
//	}
} 

/**
 * To get all the service inisde a plugin
 * - uses url query parameter
 * {
 * 	service - name of the service to load
 *  subservice - section of the service / sub model of a service model
 * }
 */
TemplateUtil.getAllServiceData = function(pluginsetting, options, pluginloader){
	var serviceconfiglist = [];
	// get the service registered under the plugin configuration only
	
	if(pluginsetting && pluginsetting.configuration)
		for(var i in pluginsetting.configuration.services) {
			var servicedata = pluginloader.getServiceloader().getServiceDetails(i); // get the details from the Service loader
			var serviceconfig_ = servicedata;
//			if(serviceconfig_)
//				serviceconfiglist.push(simpleportal.serviceloader.getServiceConfig(serviceconfig_)); // get the updated service config
//			
//			if(serviceconfig_)
//				var servicedata = simpleportal.serviceloader.getServiceConfig(serviceconfig_);

			// dynamic tabs or links
			if(servicedata){
				servicedata.servicelinks = [{id:'list', icon:'fa fa-th-list'}, {id:'search', icon:'fa fa-search'}];
				
				if(servicedata.modify)
					servicedata.servicelinks.push({id:'form', icon:'fa fa-edit', subpage:true});
				
				if(servicedata.servicetype != "system"){
					if(servicedata.modify)
						servicedata.servicelinks.push({id:'backup', icon:'fa fa-database', subpage:true, cssclass:"pull-right"});
					
					servicedata.servicelinks.push({id:'report', icon:'fa fa-dashboard', subpage:true, cssclass:"pull-right"});
				}
				
				serviceconfiglist.push(servicedata);
			}	
		}
		
	return serviceconfiglist;
}

TemplateUtil.getServiceConfigData = function(serviceoptions, templatedata, pluginsetting, pluginloader){
	var serviceoptions = serviceoptions||{};
	if(typeof serviceoptions != "object")
		serviceoptions = {service:serviceoptions};
	
	if(serviceoptions.service == "all")
		templatedata.serviceconfiglist = TemplateUtil.getAllServiceData(pluginsetting, serviceoptions, pluginloader);
	else {
		var serviceconfig = TemplateUtil.getServiceConfigDataFromOptions(serviceoptions, pluginloader);
		
		if(serviceconfig){
			templatedata.serviceconfig=serviceconfig;
			util.extendJSON(templatedata, serviceconfig);
			
			// now check is it actual service
			if(serviceoptions.servicename)
				templatedata.servicename = serviceoptions.servicename;
			else
				templatedata.servicename = serviceconfig.name;
		}
	}	
	
	return templatedata;
}


/**
 * To get the Service details of the Service selected 
 * - uses url query parameter
 * {
 * 	service - name of the service to load
 *  subservice - section of the service / sub model of a service model
 * }
 */
TemplateUtil.getServiceConfigDataFromOptions = function(serviceoptions, pluginloader){
	var servicedata = editorUtil.getServiceConfiguration(serviceoptions, pluginloader);
	
	// dynamic tabs or links
	if(servicedata/* && !subservicename*/){
		servicedata.servicelinks = [{id:'list', icon:'fa fa-th-list'}, {id:'search', icon:'fa fa-search'}];
		
		if(servicedata.modify)
			servicedata.servicelinks.push({id:'form', icon:'fa fa-edit', subpage:true});
	}	
		
	return servicedata;
}

/**
 * To format the current model and updae the corresponding validation and model settings
 * 
 */
TemplateUtil.formatModelData=function(serviceobject){

	if(serviceobject.model){
		serviceobject.modelfields = TemplateUtils.getFieldFromObject(serviceobject.model, '');
	}else 
		serviceobject.modelfields=[];
	
	// check inside configuration
	if(!serviceobject.configuration)
		 serviceobject.configuration= {modelsettings:{}, validation:{}};
		
	for(var fieldIndex in serviceobject.modelfields){
		var modelfield = serviceobject.modelfields[fieldIndex];
		
		if(modelfield.type == "array" && modelfield.dataType == "string"){
			if(!modelfield.fieldsetting)modelfield.fieldsetting={};
			
			modelfield.fieldsetting.type = modelfield.type;
			modelfield.fieldsetting.dataType = modelfield.dataType;
			
			modelfield.fieldsetting.multiple=true;
			
			modelfield.fieldsetting.model={};
			modelfield.fieldsetting.model[modelfield.field]='';
			
			modelfield.fieldsetting.validation={};
			modelfield.fieldsetting.validation[modelfield.field]=modelfield.validation = "required";
			
			modelfield.fieldsetting.modelsettings={};
		} else if(modelfield.type == "array")
			modelfield.fieldsetting={multiple:true, type:modelfield.type, dataType: modelfield.dataType, model:{}, validation:{}, modelsettings:{}};
		else if(modelfield.type == "object")
			modelfield.fieldsetting={type:modelfield.type, dataType: modelfield.dataType, model:{}, validation:{}, modelsettings:{}};
		
		if(serviceobject.configuration.modelsettings[modelfield.field]){
			modelfield.fieldsetting = util.extendJSON(modelfield.fieldsetting||{}, serviceobject.configuration.modelsettings[modelfield.field]);
			serviceobject.configuration.modelsettings[modelfield.field] = util.extendJSON(modelfield.fieldsetting||{}, serviceobject.configuration.modelsettings[modelfield.field]);
			
			if(!modelfield.fieldsetting.validation && serviceobject.validation && serviceobject.validation[modelfield.field])
				modelfield.validation = serviceobject.validation[modelfield.field];
		} else if(modelfield.fieldsetting){
			serviceobject.configuration.modelsettings[modelfield.field]=modelfield.fieldsetting;
		}
		
		if(serviceobject.configuration.modelsettings[modelfield.field] && serviceobject.configuration.modelsettings[modelfield.field].hasOwnProperty('url')){
			if(serviceobject.configuration.modelsettings[modelfield.field].url.indexOf('/') != 0)
				if(serviceobject.configuration.modelsettings[modelfield.field].url)
					modelfield.fieldsetting.url=serviceobject.configuration.modelsettings[modelfield.field].url = serviceobject.apiurl + '/' + serviceobject.configuration.modelsettings[modelfield.field].url;
				else
					modelfield.fieldsetting.url=serviceobject.configuration.modelsettings[modelfield.field].url = serviceobject.apiurl;
		}
		
		if(serviceobject.primaryKeyFields && util.arraycontains(serviceobject.primaryKeyFields, modelfield.field)){
			modelfield.primary=true;
		}
		
		if(modelfield.type == "number" || modelfield.type == "float"){
			modelfield.validation = (modelfield.validation ? modelfield.validation + "," : "") + modelfield.type;
			
			if(!serviceobject.configuration.validation)
				serviceobject.configuration.validation={};
			
			serviceobject.configuration.validation[modelfield.field] = modelfield.validation;
		}
	}
	
	return serviceobject;
}

TemplateUtil.render = function(file, content, callback){
	// if field is typeof object
	var templatecontent = util.extendJSON({}, content, {
    	getFieldFromObject:TemplateUtils.getFieldFromObject,
    	arraycontains:util.arraycontains
    });
	
	templatecontent.getMessage = function(key, args){
		return TemplateUtils.getTranlsatedMessage({}, this.languageid, key, args);
	}
	
    //may be included the service template content at the top
    var systemincludes = content.systemincludes;
    
    var templatebody = '';
    if(systemincludes){
    	for(var index in systemincludes){
    		templatebody += "\n<%- include "+systemincludes[index]+" %>\n"; 
        }
    }
    
    if(!templatecontent.templatedir) {
    	if(typeof file == 'object' && file.layout)
    		templatecontent.templatedir = file.layout.substring(0, file.layout.lastIndexOf("/"));
    	else if(typeof file == 'object' && file.file)
    		templatecontent.templatedir = file.file.substring(0, file.file.lastIndexOf("/"));
    	else if(file)
    		templatecontent.templatedir = file.substring(0, file.lastIndexOf("/"));
    }
    
    if(templatecontent && !templatecontent.bodytemplate)
    	templatecontent.bodytemplate = '';
    
	if(typeof file == 'object' && file.layout){
		if(templatecontent && file.layout)
	    	templatecontent.bodytemplate = file.layout;
	    
		fs.readFile(file.file, 'utf8', function (err, contentbody) {
	        if (err) {
	        	console.trace(err);
	        	callback(err);
	        }else{
	        	fs.readFile(file.layout, 'utf8', function (err, layoutbody) {
	        		if(!err && layoutbody){
	        			contentbody = layoutbody.replace("<%- include(bodytemplate) %>", contentbody);	
	        		}
	        		
			        callback(null, templatetool.render(templatebody + '' + contentbody, templatecontent));
	    		});
	        }
		});
	}else{
		if(file && file.file)
			fs.readFile(file.file, 'utf8', function (err, contentbody) {
		        callback(err, templatetool.render(contentbody ? templatebody + contentbody : '', templatecontent));
			});
		else if(file && file.indexOf(".png.ejs") != -1)
			fs.readFile(file, callback);
		else if(file)
			fs.readFile(file, 'utf8', function (err, contentbody) {
				callback(err, templatetool.render(contentbody ? templatebody + contentbody : '', templatecontent));
			});
		else
			callback("Not a valid template!");
	}
}