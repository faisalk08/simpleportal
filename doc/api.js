YUI.add("yuidoc-meta", function(Y) {
   Y.YUIDoc = { meta: {
    "classes": [
        "Base64",
        "CRUDService",
        "Csvparser",
        "DBPool",
        "Encryption",
        "LocalCache",
        "Logger",
        "PluginUtil",
        "Response",
        "Restfulmongo",
        "Server",
        "Service.CRUDService",
        "Service.CUDService",
        "Service.RService",
        "Service.RemoteService",
        "Service.StorageService",
        "SimplePortalOAuth",
        "__Base64",
        "configuration",
        "db",
        "filterloader",
        "logger",
        "notificationcenter",
        "oauth",
        "pluginloader",
        "router",
        "serviceloader",
        "simpleportal",
        "simpleportal.Csv",
        "simpleportal.CsvReader",
        "simpleportal.DispatchWrapper",
        "simpleportal.Template",
        "startuploader",
        "template",
        "util",
        "viewloader"
    ],
    "modules": [
        "middleware",
        "simpleportal",
        "util",
        "wrapper"
    ],
    "allModules": [
        {
            "displayName": "middleware",
            "name": "middleware",
            "description": "Startup loader middleware for `simpleportal.Server`"
        },
        {
            "displayName": "simpleportal",
            "name": "simpleportal",
            "description": "Main class for the simpleportal"
        },
        {
            "displayName": "util",
            "name": "util"
        },
        {
            "displayName": "wrapper",
            "name": "wrapper",
            "description": "CRUDService for connecting to database or a remote api"
        }
    ]
} };
});