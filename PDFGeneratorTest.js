(function() {
	"use strict";

	const PDFGenerator = require('./PDFGenerator');
	
	let pdfGenerator = new PDFGenerator();
	let finished = false;
	process.on('exit', () => {
		if( !finished ) {
			console.error("Error: Program exited early; PDF generation promise never resolved or errored.");
			console.error("Maybe you need to run with 'xvfb-run [-a] ...' (or xvfb-maybe)?");
			process.exitCode = 1;
		}
	});

	new Promise( (resolve,reject) => {
		// Attempt to unlink hello.pdf and don't mind error.
		require('fs').unlink( './hello.pdf', (err) => { resolve(); });
	}).then( () => {
		return pdfGenerator.convertFileToPdf('./hello.html', './hello.pdf')
	}).catch( (err) => {
		console.error(err);
		console.exitCode = 1;
	}).then( () => {
		finished = true;
	});
})();
