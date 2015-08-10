/* Retrieve the editor settings from the server */

$.get(window.location.pathname + 'editorsettings' + location.search, function(editorsettings){
	if(editorsettings)
		loadConfigurationForm(editorsettings);
});

/**
 * To load the w2UI Form using json editor configuration
 * @method loadConfigurationForm
 * 
 * @param editorsettings
 */
function loadConfigurationForm(editorsettings){
	/* Default configuration for the json editor */
	var defaults={
		name:'configuration',
		title:(window.serverTitle||'')+ ' Settings',
		formURL:'template/tabbedconfiguration',
		url:'configuration',
		tabs:[],
		fields:[],
		record:{},
		onChange:function(event, onemore, index){
			var obj = this;
			
			if(event.target.indexOf('db__mongodb') != -1){
				obj.databasechanged=true;
				$('#tabs_configuration_tabs_tab_database div').addClass('alert-danger');
			}
			
			if(Object.keys(obj.getChanges()).length > 0)
				$('.w2ui-buttons [name=save]').addClass('btn-success');
			/*
			if(/__new/.test(event.target)){
				console.log(onemore);
				window.open('/configuration/subeditor/?ajax=true&category=services&categoryid='+event.value_new.id, "details", "titlebar=no&toolbar=no&location=no");
			}
			*/
			return true;
		}
	};
	
	/* Extending editor options from the remote server */
	var editoroptions = $.extend(defaults, editorsettings);
	editoroptions.formURL=editoroptions.formURL+ location.search;
	editoroptions.url =editoroptions.url+ location.search;
	
	editoroptions.actions = {
		"reset": function () {
			this.clear();
		},
		"save": function (event) {
			event.preventDefault();
			var obj = this;
			
			var validationerros = obj.validate()
			
			var changes = obj.getChanges();
			
			var remoteoptions = {url:obj.url, data:changes, success:function(){
				location.reload();
			}};
	   		
			callRemoteServer(remoteoptions);
		}
	};
	
	function callRemoteServer(options){
		var defaults = {
			type: "POST",
			url: editoroptions.url,
			data: [],
			success: function(data){
				try{
					var responseJSON = JSON.parse(data.responseText);
					
					if(options.success)
						options.success(responseJSON);
				}catch(error){
					if(options.success)
						options.success(error);
				}
			},
			error: function(data){
				if(data&&data.responseText){
					try{
						var responseJSON = JSON.parse(data.responseText);
						
						if(responseJSON.status == 'success'){
							if(options.success)
								options.success(responseJSON);
							
							alert('Successfull message from server');
						}else{
							if(options.error)
								options.error(responseJSON);
							
							if(responseJSON.message.message)
								alert('Error from Server - ERROR:-' + responseJSON.message.message);
							else if(responseJSON.message)
								alert('Error from Server - ' + responseJSON.message);
							else
								alert('Error from Server');
						}
					}catch(error){
						if(options.error)
							options.error(error);
					}
				}
			},
		  	dataType: 'text/json'
		};
			
		var ajaxoptions = $.extend(defaults, options);
		var goahhead = confirm('Do you want to send | call the remote server ?');
		
		if(goahhead)
			$.ajax(ajaxoptions);
		else
			return false;
	}
	
	$(editoroptions.tabs).each(function(index, tab){
		if(tab.buttons){
			$(tab.buttons).each(function(bindex, button){
				editoroptions.actions[button.field]=function(){
					event.preventDefault();
			   		var obj = this;
					var changes = obj.getChanges();
					
					var option = button.action || button.action;
					var remoteoptions = {url:option, data:changes};
			   		
					callRemoteServer(remoteoptions);
				}
			});
		}
	});
	
	if(editoroptions.rootfield && editoroptions.rootfield.indexOf("__new") >= -1 ) {
		if(!editoroptions.record[editoroptions.rootfield])
			editoroptions.record[editoroptions.rootfield]='new';
		if(editoroptions.tabs&&editoroptions.tabs.length > 0)
			editoroptions.tabs[0].fields.push({html:{caption:'Name / Title - '}, field:editoroptions.rootfield});
		
		editoroptions.fields.push({html:{caption:'Name / Title - '}, field:editoroptions.rootfield});
		/*<div class="w2ui-field w2ui-span8" style="clear: both">
			<label>Title | Name :</label>
			<div>
				<input name="<%= rootfield %>" type="<%= 'text' %>" maxlength="100" style="width: 250px !important;" value='<%= rootfield %>'>
			</div>
		</div>*/
	}
	
	console.log(editoroptions);
	
	/* Creating the w2Ui form using the configuration from server */
	var w2uieditor = $('#'+ editoroptions.name).w2form(editoroptions);
	
	w2uieditor.on("action", function(event, element){
		if($(element.originalEvent.target).hasClass('subcategory')){
			console.log('Target to open -- '+ element.target);
			window.open('/configuration/subeditor/?category='+element.target+'&categoryid=new', "details", "titlebar=no&toolbar=no&location=no");
		}
	});
	
}