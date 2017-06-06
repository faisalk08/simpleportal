"use strict";

var util = require('./../util'),
	fs = require('fs'),
	TemplateUtil = require('./../util/templateutil'),
	Template=require("./../util/template"),
	moment = require("moment");

/**
 * Dynamic App
 * default_theme:instance.configuration.resources.theme.use
 */
var DynamicPluginAppRouter = function(options, pluginsetting, pluginloader){
	var self = this;
	
	self.options = util.extendJSON({}, DynamicPluginAppRouter.OPTIONS, options);
	
	self.pluginloader = pluginloader;
	self.viewsettings={};
	
	self.setDefaultPluginData(pluginsetting, pluginloader);
	self.setSavedPluginPreference(pluginsetting, function(pluginsetting){
		self.setDefaultPluginData(pluginsetting, pluginloader);
	}, pluginloader);

	var hasTheme = false;
	if(pluginloader)
		hasTheme = pluginloader.getPlugins('theme').length > 0;
	
	if(pluginsetting.plugintype == 'theme') {
		self.routerhandle = (function(self){
			return function(request, response, next){
				// to set the service name inside service options
				self.updateServiceOptions(request);
			
				self.updateOptions(request);
				
				self.updateData(request, self.pluginloader);
				
				request.templateoptions.curindex=0;
				
				self.render(request, response, next, self.pluginloader);
			}
		})(self);
	}else {
		self.routerhandle = (function(self){
			return function(request, response, next){
				// to set the service name inside service options
				self.updateServiceOptions(request);
		
				if(hasTheme)
					self.updateThemeOptions(request, pluginloader);
				
				self.updateOptions(request);
				self.updateData(request, self.pluginloader);
				
				request.templateoptions.curindex=0;
				
				self.render(request, response, next, self.pluginloader);
			}
		})(self);
	}
	
	return self;
}

DynamicPluginAppRouter.OPTIONS={};

DynamicPluginAppRouter.prototype.setWebpageDynamicLayout = function(request, response, next){
	var self = this;
	var webcontentquery = {
		plugin:self.viewsettings.id, 
		$or:[
		     {id:request.url.replace("/", "")},
		     {uri:{"$in":[request.url, request.url.replace(".html", "")]}}
		], status:"active"
	};
	
	//let us check if there is webpage then direct it to webpage
	if(self.pluginloader.getServiceloader().getService("webpage")) {
		self.pluginloader.getServiceloader().getService("webpage").details(webcontentquery, function(error, webpage){
			request.webpage = webpage;
			next();
		});
	}else
		next();
}

DynamicPluginAppRouter.prototype.setSavedPluginPreference = function(pluginsetting, callback, pluginloader){
	if(pluginsetting && pluginsetting.pluginsubtype && pluginloader.getServiceloader().getService("system_serverpreference")){
		var defaultkey = 'defaults-plugin-webapp-' + pluginsetting.pluginsubtype;
		
		pluginloader.getServiceloader().getService("system_serverpreference").search({key:{$regex:new RegExp("^" + defaultkey)}}, function(error, data){
			if(data){
				if(data && data.results){
					var preferencemap = {};
					for(var i in data.results){
						var preference = data.results[i]; 
						var subkey = preference.key.replace(defaultkey, '');
						
						preferencemap[subkey] = JSON.parse(preference.preference);
					}
					
					var preferencemapjson = util.unFlattenJSON(preferencemap, '-');
					
					pluginsetting = util.extendJSON({}, pluginsetting, preferencemapjson);
				}
			}
			callback(pluginsetting);
		});
	}else
		callback(pluginsetting)
}

/**
 * Function to update the plugin data the dynamic plugin when the plugins etting is changed
 * @method setDefaultPluginData
 * 
 */ 
DynamicPluginAppRouter.prototype.setDefaultPluginData = function(pluginsetting, pluginloader){
	var self = this;
	/*
	 * @TODO read from server preference
	 */
	var viewsettings = self.viewsettings = TemplateUtil.updatePluginViewData({}, pluginsetting, pluginloader);
	
	TemplateUtil.updatePluginLookupdirs(viewsettings, {templateroot:"templates/html5"}, pluginloader);
	
	if(pluginloader)
		viewsettings.metatagpage = pluginloader.templatedir + "/webapp/templates/metatags.ejs";
	
	if(viewsettings.plugintype == "webapp"){
		var javascriptsorting = viewsettings.webappsetting.javascriptsorting||{};
		
		var actualhtmldir = util.appendFilePath(viewsettings.installeddir, viewsettings.htmldir);
 		
		if(fs.existsSync(actualhtmldir + '/js/models')) {
			viewsettings.modelfiles = fs
				.readdirSync(actualhtmldir + '/js/models')
				.filter(function(f){return /\.js/.test(f);})
				.sort(function(a, b){
					// 	let us check if sorting order is defined 
					if(javascriptsorting[a.replace(".js", "")]/* && javascriptsorting[b.replace(".js", "")]*/) {
						return /^common\.js/.test(a) ? -1 : javascriptsorting[b.replace(".js", "")]||0 - javascriptsorting[a.replace(".js", "")];
					} else
						return /^common\.js/.test(a) ? -1 : /^common\.js/.test(b) ? 1 : a - b; 
				});
		} else if(fs.existsSync(actualhtmldir + '/js/models.min.js')) {
			viewsettings.modelfiles = ['../../js/models.min.js'];
		} else if(fs.existsSync(actualhtmldir + '/js/models.js')) {
			viewsettings.modelfiles = ['../../js/models.js'];
		} 
		
		if(fs.existsSync(actualhtmldir + '/js/views')){
			viewsettings.viewfiles = fs
				.readdirSync(actualhtmldir + '/js/views')
				.filter(function(f){return /\.js/.test(f);})
				.sort(function(a, b){
					if(javascriptsorting[a.replace(".js", "")]/* && javascriptsorting[b.replace(".js", "")]*/) {
						return /^common\.js/.test(a) ? -1 : javascriptsorting[b.replace(".js", "")] || 0 - javascriptsorting[a.replace(".js", "")];
					} else
						return /^common\.js/.test(a) ? -1 : /^common\.js/.test(b) ? 1 : a - b; 
				});
		} else if(fs.existsSync(actualhtmldir + '/js/views.min.js')) {
			viewsettings.viewfiles = ['../../js/views.min.js'];
		} else if(fs.existsSync(actualhtmldir + '/js/views.js')) {
			viewsettings.viewfiles = ['../../js/views.js'];
		}
	} else if(viewsettings.plugintype == "theme") {
		TemplateUtil.updatePluginLookupdir(viewsettings, util.appendFilePath(TemplateUtil.getTemplateConfig(self.pluginloader, "templatedir"), pluginsetting.plugintype, ""));
	}
}

/**
 * To update the service options.
 * 
 */
DynamicPluginAppRouter.prototype.updateServiceOptions = function(request){
	var self = this;
	
	request.serviceoptions = request.serviceoptions||{}; 
	
	if(request.query && request.query.service)
		request.serviceoptions.service = request.query.service;
	if(request.query && request.query.subservice)
		request.serviceoptions.subservice = request.query.subservice;
	
	// check the url
	if(/^\/service\//.test(request.url)){
		if(/^\/service\/system\//.test(request.url)){ // convert the sysem url to system_ path
			request.url = request.url.replace(/^\/service\/system\//, "/service/system_");
		}
		
		var templatename = request.url = request.url.replace(/^\/service\//, "");
		var subpath = templatename.substring(0, templatename.indexOf('/'));
		
		if(/(\/setting\/)/.test(templatename)){
			request.serviceoptions.servicename = subpath;
			request.serviceoptions.service = "system_apiservice";
			request.url = request.url.replace(subpath + "/setting/", "");
		} else if(!/(js|templates|templates\/_list)$/.test(subpath)){
			request.serviceoptions.service = subpath;
			request.url = request.url.replace(request.serviceoptions.service + "/", "");
		} else{
			request.serviceoptions.service = "all";
		}
	}
};

/**
 * To update the theme options.
 * 
 */
DynamicPluginAppRouter.prototype.updateThemeOptions = function(request, pluginloader){
	var self = this;
	
	request.curtheme = TemplateUtil.getThemeConfig(request, self.viewsettings, self.options.default_theme, pluginloader);
	
	// check theme has lookupdirs
	if(request.curtheme && !request.curtheme.lookupdirs)
		TemplateUtil.updatePluginLookupdirs(request.curtheme, {}, pluginloader);
	
	TemplateUtil.updateTemplateThemeLocations(request, self.viewsettings, request.curtheme, self.pluginloader);
}

/**
 * To update the options
 */
DynamicPluginAppRouter.prototype.updateOptions = function(request){
	var self = this;
	
	// set the plugin specific location along with the default simpleportal locations
	TemplateUtil.updatePluginTemplateOptions(request, self.viewsettings, {templateroot:"html5"}, self.pluginloader);
	TemplateUtil.updatePluginTemplateOptions(request, self.viewsettings, {templateroot:"templates/html5"}, self.pluginloader);
	TemplateUtil.updatePluginTemplateOptions(request, self.viewsettings, {templateroot:"resources/templates"}, self.pluginloader);
	
	TemplateUtil.updateTemplateLocations(request, self.viewsettings);
	
	var layout = request.query ? request.query.layout : null;
	if(request.webpage) {} 
	else if(!layout && request.templateoptions.htmlfile && 
		(
			request.templateoptions.htmlfile.indexOf("/pages/") == 0
			&& request.templateoptions.htmlfile.indexOf(".html") != 0
		)) {
		console.log("search for layout using page id")
			var webpage;
			if(self.viewsettings.webappsetting && self.viewsettings.webappsetting.websiteconfig.webpages) {
				webpage = util.getJSONObject(self.viewsettings.webappsetting.websiteconfig.webpages, 'uri', request.url);
			}
			
			if(webpage){
				request.webpage = webpage;
				request.webpage.layout = webpage.uri||webpage.layout||'staticpage';
				
//				console.log(webpage)
				// now set the page layout 
//				var layoutpath = util.appendFilePath(TemplateUtil.getTemplateConfig(self.pluginloader, "layoutdir"), "page" + TemplateUtil.getTemplateConfig(self.pluginloader, "layoutextension"));
//				var contentlayout;
//				if(fs.existsSync(layoutpath)){
//					contentlayout = layoutpath;
//				} else{
//					layoutpath = util.appendFilePath(TemplateUtil.getTemplateConfig(self.pluginloader, "layoutdir"), "layout", "page" + TemplateUtil.getTemplateConfig(self.pluginloader, "layoutextension"));
//					if(fs.existsSync(layoutpath))
//						contentlayout = layoutpath;
//					else
//						contentlayout = self.viewsettings.installeddir + "/resources/templates" + request.templateoptions.htmlfile + ".ejs";
//				}
//				layout = webpage.layout||'staticpage';
//					
//				request.templateoptions.contentlayout = contentlayout;
//				request.templateoptions.contentlayoutconfig={id : request.templateoptions.htmlfile};
			}
	}
	console.log("found layout inside here ---> " + layout);
	if(!layout && self.viewsettings.servicelayout && request.serviceoptions.service && /.html$/.test(request.templateoptions.htmlfile)){
		request.templateoptions.contentlayout = self.viewsettings.servicelayout;
		request.templateoptions.contentlayoutconfig={id:self.viewsettings.servicelayout};
	} else if(!layout && request.curtheme && request.curtheme.layout 
			&& request.curtheme.layout.servicelayout && request.serviceoptions.service && /.html$/.test(request.templateoptions.htmlfile))
		layout = request.curtheme.layout.servicelayout;
	
	if(layout && request.curtheme && request.curtheme.layouts){
		var layoutconfig = util.getJSONObject(request.curtheme.layouts, "id", layout + TemplateUtil.getTemplateConfig(self.pluginloader, "layoutextension"));
		
		if(layoutconfig){
			request.templateoptions.contentlayoutconfig = layoutconfig;
			request.templateoptions.contentlayout = util.appendFilePath(request.curtheme.installeddir, layoutconfig.path, layoutconfig.id);
		}
	}
	
	// check if u have found the layout in theme or plugin
	if(layout && !request.templateoptions.contentlayoutconfig){
		var layoutdefaultpath = util.appendFilePath(TemplateUtil.getTemplateConfig(self.pluginloader, "layoutdir"), "content", layout + TemplateUtil.getTemplateConfig(self.pluginloader, "layoutextension"));
		var contentlayout;
		if(fs.existsSync((layoutdefaultpath))){
			contentlayout = layoutdefaultpath;
		} else{
			layoutdefaultpath = util.appendFilePath(TemplateUtil.getTemplateConfig(self.pluginloader, "layoutdir"), layout + TemplateUtil.getTemplateConfig(self.pluginloader, "layoutextension"));
			if(fs.existsSync(layoutdefaultpath))
				contentlayout = layoutdefaultpath;
			else
				contentlayout = util.appendFilePath(self.viewsettings.installeddir, "resources/templates", request.templateoptions.htmlfile + ".ejs");
		}
		
		if (contentlayout){
			request.templateoptions.contentlayoutconfig = {id:layout + TemplateUtil.getTemplateConfig(self.pluginloader, "layoutextension")};
			request.templateoptions.contentlayout = contentlayout;
		}
	}
}

/**
 * To update the data.
 * 
 */
DynamicPluginAppRouter.prototype.updateData = function(request, pluginloader){
	var self = this;
	
	if(request.templateoptions && request.templateoptions.templatename){
		var templatedata = util.extendJSON({
			serviceconfiglist:[], serviceconfig:{}, 
			curtime:moment().format('MMMM Do YYYY, h:mm:ss a'),
			serverconfig:pluginloader.getServerInstance().getConfiguration(),
			userprofile:request.getUserprofile(), requestquery:request.query
		}, request.templateoptions);
		
		if(request.serviceoptions)
			request.templateoptions.servicename=request.serviceoptions;
			
		request.templatedata = TemplateUtil.getPluginTemplateData(request, templatedata, request.templateoptions, self.viewsettings, pluginloader);
		if(request.webpage)
			request.templatedata.webpage = request.webpage;
		
		// check whether you have roles to access the service
		if(request.templatedata.serviceconfig 
			&& request.templatedata.serviceconfig.servicelinks 
			&& request.serviceoptions 
			&& (
				(!request.getUserprofile() || !self.viewsettings.roles)
				|| ((util.arraycontains(request.getUserprofile().roles, self.viewsettings.roles, ["admin", "superadmin"])))
			)
		){
			if(request.templatedata.id == "sp-admin")
				request.templatedata.serviceconfig.servicelinks.push({id:"setting", icon:'fa fa-cog', cssclass:"pull-right"});
			
			if(request.templatedata.serviceconfig.servicetype != "system")
				request.templatedata.serviceconfig.servicelinks.push({id:"report", icon:'fa fa-dashboard', cssclass:"pull-right"});
			
			request.templatedata.serviceconfig.servicelinks.push({id:"backup", title:'import-/-export', icon:'fa fa-download', cssclass:"pull-right"});
		}
		
		var viewmodemapping = {
			list:/((list|list_(.*)).html)/,
			search:/((search|search_(.*)).html)/,
			form:/((form|form_(.*)).html)/,
			setting:/((setting|setting_(.*)).html)/,
			report:/((report|report_(.*)).html)/,
			backup:/((backup|backup_(.*)).html)/,
			details:/service.html/
		};
		
		var viewmode,
			index = 0;
		do {
			var key = Object.keys(viewmodemapping)[index++];
			if(viewmodemapping[key].test(request.templateoptions.htmlfile))
				viewmode = request.templatedata.serviceviewmode = key;
		}  while(!viewmode && index<Object.keys(viewmodemapping).length);
		if(!request.templatedata.serviceviewmode)
			request.templatedata.serviceviewmode=null;
		
		if(request.templatedata.serviceviewmode == "details" 
			&& request.templatedata.serviceconfig.servicelinks) {
			request.templatedata.serviceconfig.servicelinks.push({id:"details", icon:'fa fa-file', subpage:true});
		}
	}	
}

/**
 * To get the next template
 */
DynamicPluginAppRouter.prototype.getNextTemplate = function(request, response, next){
	var self = this;
	if(request.templateoptions && request.templateoptions.filelocations.length > request.templateoptions.curindex){
		return request.templateoptions.filelocations[request.templateoptions.curindex++];
	}else {
		return null;
	}
}

/**
 * To render the template
 * 
 * @method renderTemplate
 */
DynamicPluginAppRouter.prototype.renderTemplate = function(request, response, next, pluginloader){
	var self = this;
	
	var filename = self.getNextTemplate(request);
	var resourcetempdir;
	
	var theme;
	if(filename && /\.html|\.js|\.css/.test(filename) && request.templatedata.pluginsetting 
			&& request.templatedata.pluginsetting.webappsetting 
			&& request.templatedata.pluginsetting.webappsetting.theme)
		theme = request.templatedata.pluginsetting.webappsetting.theme;
	
	if(request.templatedata.pluginsetting){
		if(request.templatedata.pluginsetting.webappuri 
			&& request.templatedata.pluginsetting.webappuri.indexOf("/mobile") > 0)
			resourcetempdir = pluginloader.getTempPath(request.templatedata.pluginsetting, theme, "mobile");
		else
			resourcetempdir = pluginloader.getTempPath(request.templatedata.pluginsetting, theme);
	}
	
	if(filename) {
		request.templatedata.filename = filename;
		
		if(request.templateoptions.contentlayoutconfig && request.templateoptions.contentlayout){
			var templateoptions = {file:filename, layout:request.templateoptions.contentlayout};
			
			if(request.templatedata.webpage) {
				request.templatedata.templatedir = filename.substring(0, filename.lastIndexOf("/"));
				request.templatedata.bodytemplate = request.templateoptions.contentlayout;
			} else if(!request.templatedata.templatedir 
					&& request.templateoptions.htmlfile && 
				(
					request.templateoptions.htmlfile.indexOf("/pages/") == 0
					&& request.templateoptions.htmlfile.indexOf(".html") != 0
				)){
				request.templatedata.templatedir = filename.substring(0, filename.lastIndexOf("/"));
				request.templatedata.bodytemplate = request.templatedata.pluginsetting.installeddir + "/resources/templates" + request.templateoptions.htmlfile + '.ejs';
			}
			
			TemplateUtil.render(templateoptions, request.templatedata, function(error, html){
				if(!error) {
					sendToResponse(request, response, html);
				}else 
					self.renderTemplate(request, response, next, pluginloader);
			});
		} else {
			TemplateUtil.render(filename, request.templatedata, function(error, html){
				if(!error){
					//check if it is theme
					if(/\.html\.ejs|\.js|\plugin\.png|\.css/.test(filename)) {
						if(resourcetempdir && request.templatedata.htmlfile && !fs.existsSync(resourcetempdir + request.templatedata.htmlfile)){

							if(request.templatedata.htmlfile.indexOf(".") == -1)
								request.templatedata.htmlfile = request.templatedata.htmlfile + ".html";
							
							var tempfile = util.appendFilePath(resourcetempdir, request.templatedata.htmlfile);
							
							util.checkDirSync(tempfile.substring(0, tempfile.lastIndexOf("/")));
							
							fs.writeFile(tempfile, html, function (err) {
							    if(err) 
							       console.error(err);
							    else 
							    	pluginloader.getLogger().info("dynamicplugin:renderTemplate", 'saved file under the temp directory :::'  + filename + ">> " + resourcetempdir + " >> " + request.templatedata.htmlfile);
							});
						}
					}
					
					if(request.templateoptions.contentlayoutconfig && request.templateoptions.contentlayout){
//						if(!request.templatedata.bodytemplate)
							request.templatedata.bodytemplate=request.templatedata.filename;
						
						TemplateUtil.render(request.templateoptions.contentlayout, request.templatedata, function(error, html){
							if(!error){
								sendToResponse(request, response, html);
							}else
								self.renderTemplate(request, response, next, pluginloader);
						});
					}else{
						sendToResponse(request, response, html);
					}	
				}else
					self.renderTemplate(request, response, next, pluginloader);
			});
		}
	} else {
		next();
	}	
}

DynamicPluginAppRouter.prototype.render = function(request, response, next, pluginloader){
	var self = this;
	
	if(request.webpage){
		// let us search for the mentioned page inside the templates if found then use that as the content layout
//		console.log(request.templateoptions);
		var webpagecontentlayout = util.appendFilePath(self.viewsettings.installeddir, "/resources/templates", request.templateoptions.htmlfile, ".ejs");
		
		if(fs.existsSync(webpagecontentlayout)){
			request.templatedata.bodytemplate = webpagecontentlayout;
		} else {
			var contentlayout = request.webpage.layout || "webpage";
				contentlayout = util.appendFileExtension(contentlayout, TemplateUtil.getTemplateConfig(self.pluginloader, "layoutextension"));
			
			webpagecontentlayout = util.appendFilePath(TemplateUtil.getTemplateConfig(self.pluginloader, "layoutdir"), "content", contentlayout);
			
			if(fs.existsSync(webpagecontentlayout)){
				request.templatedata.bodytemplate = webpagecontentlayout;
			}
		}
	}
	
	if(request.templatedata && request.templateoptions && request.templateoptions.filelocations){
		request.templatedata.themes = pluginloader.getPlugins('theme');
		
		if(request.curtheme)
			request.templatedata.themeconfig = request.curtheme;
		
		// now check if the template is service specific then include system includes
		if(request.serviceoptions && request.serviceoptions.service && request.templateoptions.htmlfile.indexOf(".html") != -1){
			request.templatedata.systemincludes = [pluginloader.templatedir + '/webapp/templates/html5/templates/system/fieldtemplates.ejs'];
			// need to include the uri mappings as well
			request.templatedata.systemincludes.push(pluginloader.templatedir + '/webapp/templates/html5/templates/system/urimapping.ejs');
			
			if(request.curtheme && request.curtheme.templates){
				var systemtemplates = request.curtheme.templates.filter(function(data){
					return data.filetype == "html" && data.templatetype == "system";
				});
				
				if(systemtemplates)
					for(var index in systemtemplates) {
						request.templatedata.systemincludes.push(request.curtheme.installeddir + "/" +systemtemplates[index].path + "/" + systemtemplates[index].id);
					}
			}	
		}
		
		self.renderTemplate(request, response, next, pluginloader);
	} else
		next();
}

var sendToResponse = function(request, response, content){
	if(!request.headers)
		request.headers = {};
		
	var callback = response.callback;
	if(!callback && request.query && request.query.callback)
		callback = request.query.callback;
	
	if(callback){
		content = callback.replace(/[^\w$.]/g, '') + '(' + content + ');';
		request.headers['Content-Type'] = 'text/javascript';
	}else {
		response.contentType(util.getMimeType(request.templateoptions.htmlfile));
	}	
	
	response.send(200, request.headers, content);
}
module.exports=DynamicPluginAppRouter;