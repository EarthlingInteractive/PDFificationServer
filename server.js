"use strict";

const http = require('http');
const fs = require('fs');
const PDFGenerator = require('./PDFGenerator');

let port = process.env.PORT || 8056;

const randCharBase = "abcdefghijklmnopqrstuvwxyz0123456789"; 
function randChars(count) {
	let str = "";
	for( let i=0; i<count; ++i ) {
		str += randCharBase[Math.floor(Math.random()*randCharBase.length)];
	}
	return str;
}

function pipe( readStream, writeStream ) {
	return new Promise( (resolve,reject) => {
		readStream.on('error', reject);
		writeStream.on('error', reject);
		writeStream.on('close', resolve);
		readStream.pipe(writeStream);
	});
}

function pipeToFile( stream, file ) {
	let writeStream = fs.createWriteStream(file)
	return pipe( stream, writeStream ).then( () => new Promise( (resolve,reject) =>
		fs.stat(file, (err, stat) => {
			if( err ) reject(new Error("Failed tp create "+file+"; "+err.message));
			else resolve();
		})
	));
}

function pipeFromFile( file, stream ) {
	let readStream = fs.createReadStream(file);
	return pipe( readStream, stream );
}

function handlePdfifyRequest(req,res) {
	let tempBase = "temp/"+randChars(20);
	let tempInputFile = tempBase+".html";
	let tempOutputFile = tempBase+".pdf";
	return pipeToFile(req, tempInputFile).then( () => {
		console.log("Converting "+tempInputFile+" to "+tempOutputFile);
		return new PDFGenerator().convertFileToPdf(tempInputFile, tempOutputFile);
	}).then( () => {
		res.writeHead(200, {'Content-Type': 'application/pdf'});
		return pipeFromFile(tempOutputFile, res).catch( (err) => {
			console.error("Error while piping "+tempOutputFile+" back to client");
			console.error(err.stack);
		});
	});
}

function decodeUriComponentBetter( c ) {
	return decodeURIComponent(c).replace(/\+/g,' ');
}

function parseQueryString( qs ) {
	if( qs == undefined ) return {};
	if( qs.length > 0 && qs[0] == '?' ) qs = qs.substr(1);
	if( qs.length == 0 ) return {};
	let parts = qs.split('&');
	let data = {};
	for( let p in parts ) {
		let kv = parts[p].split('=');
		if( kv.length == 2 ) {
			data[decodeUriComponentBetter(kv[0])] = decodeUriComponentBetter(kv[1]);
		}
	}
	return data;
}

function handlePdfifyGetRequest(req,res) {
	let m = /^([^\?]*)(?:\?(.*))?$/.exec(req.url);
	let qsParams = parseQueryString(m[2]);
	console.log(req.url, m[2], qsParams);
	let inputUrl = qsParams['uri'];
	if( inputUrl == undefined ) {
		return Promise.reject(new Error("No 'uri' given"));
	}
	let waitForDomSelector = qsParams['waitForDomSelector'] || 'body';

	let tempBase = "temp/"+randChars(20);
	let tempOutputFile = tempBase+".pdf";
	return new Promise( (resolve,reject) => {
		let done = false;
		// TODO: Abstract to some timeout.js or something
		setTimeout( () => {
			if( !done ) {
				let msg = "PDFification of <"+inputUrl+"> with selector '"+waitForDomSelector+"' timed out";
				console.error(msg)
				reject(new Error(msg));
				done = true;
			}
		}, 5000);
		new PDFGenerator().convertFileToPdf(inputUrl, tempOutputFile, {
			waitForDomSelector
		}).then( (pdfFile) => {
			if( !done ) {
				resolve(pdfFile);
				done = true;
			}
		}, (error) => {
			if( !done ) {
				reject(error);
				done = true;
			}
		});
	}).then( () => {
		res.writeHead(200, {'Content-Type': 'application/pdf'});
		return pipeFromFile(tempOutputFile, res).catch( (err) => {
			console.error("Error while piping "+tempOutputFile+" back to client");
			console.error(err.stack);
		});
	});
}

let server = http.createServer( (req,res) => {
	let m = /^([^\?]*)(?:\?.*)?$/.exec(req.url);
	let path = m[1];
	if( req.method == 'GET' && path == '/pdfify' ) {
		handlePdfifyGetRequest(req,res).catch( (err) => {
			console.error("Request to "+req.method+" "+req.url+" failed; sending 500: "+err.stack+"");
			res.writeHead(500, {'Content-Type': 'text/plain'});
			res.end(err.stack);
		}).then( () => {
			res.end(); // Make sure!
		}).catch( (err) => {
			console.error("Error sending response? "+err.stack);
		});
	} else if( req.method == 'POST' && req.url == '/pdfify' ) {
		handlePdfifyRequest(req,res).catch( (err) => {
			console.error("Request to "+req.method+" "+req.url+" failed; sending 500: "+err.stack+"");
			res.writeHead(500, {'Content-Type': 'text/plain'});
			res.end(err.stack);
		}).then( () => {
			res.end(); // Make sure!
		}).catch( (err) => {
			console.error("Error sending response? "+err.stack);
		})
	} else {
		res.writeHead(404, {'Content-Type': 'text/plain'});
		res.end("Only POST /pdfify is supported (you did "+req.method+" "+req.url+")");
	}
});
server.listen( port, () => {
	console.log(`PDFification web server listening on port ${port}`);
});
