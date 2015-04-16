simpleportal
============

Simple Portal


/**
 * Step 1
 * Production specific configuration
 * 
 * configuration.json
 * 
 * Application / server configuration has to be placed in a file called 'configuration.json' and server can be started using 'node main'
 */

/**
 * Step 1.1
 * Customization for development computer
 * 
 * configuration.local.json
 * 
 * can also make local configuration by creating 'configuration.local.json'  and server can be started using 'node main local'
 */

/**
 * Step 2.0
 * 
 * API
 * 
 * Can be stored under 'api' folder siblings to the main.js
 */

/**
 * Step 3.0
 * 
 * Front end / apis which are accessed directly from the root uri
 * 
 * Can be stored inside 'view' folder siblings to the main.js
 */

/**
 * Step 4.0
 * 
 * Plugin / webapps / themes / util
 * 
 * Can be placed under the 'plugin' folder siblings to the main.js
 */

/**
 * Step 5.0
 * 
 * Webapp / uri filters / uri redirect filter
 * 
 * Can be stored under 'filter' folder siblings to the main.js
 */

/**
 * Step 6.0
 * 
 * Server startup / sub applications
 * 
 * Any application startups / like creating a sub server or creating anything after the server start can be placed under 'startup' folder siblings to the main.js
 */