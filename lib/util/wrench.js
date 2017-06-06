"use strict";

var wrench_ = require('wrench'),
	fs = require("fs");
var wrench = wrench_;

wrench_.copyDirSyncRecursive_=wrench.copyDirSyncRecursive;

/**
 *  wrench.copyDirSyncRecursive("directory_to_copy", "new_directory_location", opts);
 *  
 *  Recursively dives through a directory and moves all its files to a new location. This is a
 *  Synchronous function, which blocks things until it's done. If you need/want to do this in
 *  an Asynchronous manner, look at wrench.copyDirRecursively() below.
 *  Note: Directories should be passed to this function without a trailing slash.
 *  
 * @method copyDirSyncRecursive
 * @param {} sourceDir
 * @param {} newDirLocation
 * @param {} opts
 * @return 
 */
wrench.copyDirSyncRecursive = function(sourceDir, newDirLocation, opts) {
	if (!opts || !opts.preserve) {
        try {
            if(fs.statSync(newDirLocation).isDirectory()) exports.rmdirSyncRecursive(newDirLocation);
        } catch(e) { }
    }

    /*  Create the directory where all our junk is moving to; read the mode of the source directory and mirror it */
    var checkDir = fs.statSync(sourceDir);
    try {
        fs.mkdirSync(newDirLocation, checkDir.mode);
    } catch (e) {
        //if the directory already exists, that's okay
        if (e.code !== 'EEXIST') throw e;
    }

    var files = fs.readdirSync(sourceDir);

    for(var i = 0; i < files.length; i++) {
        // ignores all files or directories which match the RegExp in opts.filter
		if(typeof opts !== 'undefined') {
            if(!opts.whitelist && opts.filter && files[i].match(opts.filter)) continue;
		    // if opts.whitelist is true every file or directory which doesn't match opts.filter will be ignored
		    if(opts.whitelist && opts.filter && !files[i].match(opts.filter)) continue;
            if (opts.excludeHiddenUnix && /^\./.test(files[i])) continue;
        }

        var currFile = fs.lstatSync(sourceDir + "/" + files[i]);

        /**
         * Description
         * @method fCopyFile
         * @param {} srcFile
         * @param {} destFile
         * @return 
         */
        var fCopyFile = function(srcFile, destFile) {
        	if(typeof opts !== 'undefined' && opts.checktimestamp && fs.existsSync(destFile)){
            	var destStat = fs.statSync(destFile);
            	var srcStat = fs.statSync(srcFile);
            	
            	if(isNewer(srcStat.mtime, destStat.mtime)){
            		var contents = fs.readFileSync(srcFile);
     	            fs.writeFileSync(destFile, contents);
            	}
            }else if(typeof opts !== 'undefined' && opts.preserveFiles && fs.existsSync(destFile)) return;
            else{
	            var contents_ = fs.readFileSync(srcFile);
	            fs.writeFileSync(destFile, contents_);
            }
        };

        if(currFile.isDirectory()) {
            /*  recursion this thing right on back. */
            wrench.copyDirSyncRecursive_(sourceDir + "/" + files[i], newDirLocation + "/" + files[i], opts);
        } else if(currFile.isSymbolicLink()) {
            var symlinkFull = fs.readlinkSync(sourceDir + "/" + files[i]);

            if (!opts.inflateSymlinks) {
                fs.symlinkSync(symlinkFull, newDirLocation + "/" + files[i]);
                continue;
            }

            var tmpCurrFile = fs.lstatSync(sourceDir + "/" + symlinkFull);
            if (tmpCurrFile.isDirectory()) {
            	wrench.copyDirSyncRecursive_(sourceDir + "/" + symlinkFull, newDirLocation + "/" + files[i], opts);
            } else {
                /*  At this point, we've hit a file actually worth copying... so copy it on over. */
                fCopyFile(sourceDir + "/" + symlinkFull, newDirLocation + "/" + files[i]);
            }
        } else {
            /*  At this point, we've hit a file actually worth copying... so copy it on over. */
            fCopyFile(sourceDir + "/" + files[i], newDirLocation + "/" + files[i]);
        }
    }
};

/**
 * Function to compare two files
 * 
 * @method isNewer
 * 
 * @param {} a
 * @param {} b
 * @return BinaryExpression
 * 
 * @private
 */
function isNewer(a, b) {
    return a.getTime() > b.getTime();
}

/*
 * Exporting the room service.
 */
module.exports = wrench;