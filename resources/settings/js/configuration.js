$.get('/configurationsettings', function(data){
	if(data)
		loadConfigurationForm(data);
});

function loadConfigurationForm(configuration){
	$('#configuration').w2form({ 
		name     : 'configuration',
		header   : (window.serverTitle||'')+ ' Settings',
		formURL  : '/configurationform', 
		url:'/configuration',
	    tabs: [
	       { id: 'general', caption: 'General' },
	       { id: 'database', caption: 'Database'},
	       { id: 'log', caption: 'Logs' }/*,
	       { id: 'oauth', caption: 'Oauth Provider' }*/
       ], 
       fields:configuration.fields||[],
       record:configuration.record,
	   actions: {
		   "startserver": function () {
		   		event.preventDefault();
		   		var obj = this;
				var changes = obj.getChanges();
		   		
				$.ajax({
					type: "POST",
					url: '/startserver',
					data: changes,
					success: function(data){
						alert('Successfully checked database configuration');
					},error: function(data){
						if(data&&data.responseText){
							try{
								var responseJSON = JSON.parse(data.responseText);
								
								if(responseJSON.status == 'success'){
									obj.databasechanged=false;
									alert('Successfully checked database configuration');	
								}else
									alert('Some error while checking Database configuration ERROR:-' + responseJSON.message.message);
							}catch(error){}
						}
					},
				  	dataType: 'text/json'
				});
		   		return false;
		   	},"testdb": function () {
		   		event.preventDefault();
		   		var obj = this;
				var changes = obj.getChanges();
		   		
				$.ajax({
					type: "POST",
					url: '/checkdbconnection',
					data: changes,
					success: function(data){
						alert('Successfully checked database configuration');
					},error: function(data){
						if(data&&data.responseText){
							try{
								var responseJSON = JSON.parse(data.responseText);
								
								if(responseJSON.status == 'success'){
									obj.databasechanged=false;
									alert('Successfully checked database configuration');	
								}else
									alert('Some error while checking Database configuration ERROR:-' + responseJSON.message.message);
							}catch(error){}
						}
					},
				  	dataType: 'text/json'
				});
		   		return false;
		   	},
			"reset": function () {
				this.clear();
			},
			"save": function (event) {
				event.preventDefault();
				var obj = this;
				
				var validationerros = obj.validate()
				
				var changes = obj.getChanges();
				
				var goahhead =true;
				if(obj.databasechanged){
					goahhead =confirm('Do you want to save the configuration with out checking the database configuration ?');
				}
				
				if(goahhead)
					$.ajax({
						type: "POST",
						url: obj.url,
						data: changes,
						success: function(data){},
						error: function(data){
							if(data&&data.responseText){
								try{
									var responseJSON = JSON.parse(data.responseText);
									
									if(responseJSON.status == 'success'){
										obj.databasechanged=false;
										alert('Successfully saved the configuration !!');	
									}else
										alert('Some error while saving the configuration - ERROR:-' + responseJSON.message.message);
								}catch(error){}
							}
						},
					  	dataType: 'text/json'
					});
			}
		},onChange:function(event){
			var obj = this;
			
			if(event.target.indexOf('db__mongodb') != -1){
				obj.databasechanged=true;
				$('#tabs_configuration_tabs_tab_database div').addClass('alert-danger');
			}
			
			if(Object.keys(obj.getChanges()).length > 0)
				$('.w2ui-buttons [name=save]').addClass('btn-success');
		}
	});
}