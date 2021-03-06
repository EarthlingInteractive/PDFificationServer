module.exports = (function() {
"use strict";

const fsu = require('./FSUtil');
const timeout = require('./timeout');

var PDFGenerator = function() {
};
PDFGenerator.prototype.makeNightmare = function( nightmareOptions ) {
	let Nightmare = require('nightmare');
	return new Nightmare(nightmareOptions);
};

function urlEscapeFilename(filename) {
	return filename.replace(/%/,'%25').replace(/ /,'%20');
}

/**
 * @return promise(absolute url)
 */
PDFGenerator.prototype.filenameOrUrlToUrl = function(filenameOrUrl) {
	if( /^(file|ftp|http|https):/.exec(filenameOrUrl) ) {
		return Promise.resolve(filenameOrUrl);
	} else if( /^\/\//.exec(filenameOrUrl) ) {
		return Promise.resolve("file:"+urlEscapeFilename(filenameOrUrl));
	} else if( /^\//.exec(filenameOrUrl) ) {
		return Promise.resolve("file://"+urlEscapeFilename(filenameOrUrl));
	} else {
		return new Promise( (resolve,reject) => {
			require('fs').realpath( filenameOrUrl, (err,fullpath) => {
				if( err ) reject(err);
				else resolve("file://"+urlEscapeFilename(fullpath));
			});
		});
	}
};

/**
 * @return promise()
 */
PDFGenerator.prototype.assertNonEmptyFile = function( filename ) {
	return new Promise( (resolve,reject) => {
		require('fs').stat(filename, (err,stat) => {
			if( err ) reject(err);
			else resolve(stat);
		});
	}).then( (stat) => {
		if(stat && stat.size == 0) {
			return Promise.reject(new Error(filename + " is empty"));
		}
	}, (err) => {
		return Promise.reject(new Error(filename + " couldn't be statted, which probably means it doesn't exist"));
	});
};

/**
 * @return promise(outputFile)
 */
PDFGenerator.prototype.convertFileToPdf = function( inputFilenameOrUrl, pdfFilename, options ) {
	if( options == undefined ) options = {debugging:true};
	let checkOutputFile = options.checkOutputFile == undefined ? true : !!options.checkOutputFile;
	let waitForDomSelector = options.waitForDomSelector || 'body';
	let nightmareOptions = options.nightmareOptions || (options.debugging ? {
		show: true,
		dock: true,
		openDevTools: { mode: 'detach' }
	} : { show: false });
	let pdfOptions = {
		marginsType: 1,
		pageSize: 'Letter',
		printBackground: true
	};
	
	if( waitForDomSelector == null || waitForDomSelector.length === 0 ) {
		return Promise.reject("You have to wait for some DOM selector.");
	}
	
	let prom = fsu.mkParentDirs(pdfFilename).then( () => {
		return this.filenameOrUrlToUrl(inputFilenameOrUrl);
	}).then( (htmlUrl) => {
		let nightmare = options.nightmare || this.makeNightmare(nightmareOptions);
		
		let prom = nightmare.goto(htmlUrl)
			.wait(waitForDomSelector)
			.pdf(pdfFilename, pdfOptions)
			.end();
		if( checkOutputFile ) {
			prom = prom.then( () => this.assertNonEmptyFile(pdfFilename) );
		}
		return prom.then( () => pdfFilename );
	});

	if( options.timeout != undefined ) {
		let resultDescription = "PDFification of <"+inputFilenameOrUrl+"> with selector '"+waitForDomSelector+"'";
		prom = timeout(prom, +options.timeout, resultDescription);
	}

	return prom;
};

PDFGenerator.default = PDFGenerator; // For ES6 module compatibility!

main: if( typeof require != 'undefined' && typeof module != 'undefined' && require.main === module ) {
	const argv = process.argv;
	const USAGE_TEXT = "Usage: " + argv[1] + " [options] -o <PDF output file> <HTML URL>\n" +
		"Options:\n" +
		"  -s <DOM selector> ; wait until the indicated DOM selector\n" +
		"                      resolves to something before PDFifying.\n"+
		"                      Default = \"body\".";

	let showHelp = false;
	let infile = undefined;
	let outfile = undefined;
	let waitForDomSelector = '.c-align';
	let options = {};
	for( let a = 2; a < argv.length; ++a ) {
		const arg = argv[a];
		if(arg == '--help' || arg == '-h' || arg == '-?') {
			showHelp = true;
		} else if(arg == '--debug') {
			options.debugging = true;
		} else if(arg == '-s') {
			waitForDomSelector = argv[++a];
		} else if(arg == '-o') {
			outfile = argv[++a];
		} else if(arg.length > 0 && arg[0] == '-') {
			console.error("Error: unrecognized argument: " + arg);
			console.error(USAGE_TEXT);
			process.exitCode = 1;
			break main;
		} else {
			if(infile == null) {
				infile = arg;
			} else {
				console.error("Error: more than one input file specified: " + infile + ", " + arg);
				console.error(USAGE_TEXT);
				process.exitCode = 1;
				break main;
			}
		}
	}
	if(!infile) {
		console.error("Error: no input file specified");
		console.error(USAGE_TEXT);
		process.exitCode = 1;
		break main;
	}
	if(!outfile) {
		console.error("Error: no output file specified");
		console.error(USAGE_TEXT);
		process.exitCode = 1;
		break main;
	}
	if(showHelp) {
		console.log(USAGE_TEXT);
		break main;
	}
	
	let finished = false;
	process.on('exit', () => {
		if( !finished ) {
			console.error("Error: Program exited early; PDF generation promise never resolved or errored.");
			console.error("Maybe you need to run with 'xvfb-run [-a] ...' (or xvfb-maybe)?");
			process.exitCode = 1;
		}
	});
	
	let generator = new PDFGenerator();
	generator.convertFileToPdf(infile, outfile, options).catch( (err) => {
		console.error("Error: "+err);
		process.exitCode = 1;
	}).then( () => {
		finished = true;
	});
}

return PDFGenerator;

})();
