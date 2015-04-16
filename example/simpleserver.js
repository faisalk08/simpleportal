var simpleportal = require('simpleportal');

var logger = require("simpleportal").logger;

logger.getInstance().debug('Simple web server', 'Initializing the simpleportal web server');
var app = new simpleportal.Server();

logger.getInstance().debug('Simple web server', 'Creating the simpleportal  web server');
app.createServer();
