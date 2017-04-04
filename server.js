"use strict";

const http = require('http');
const fs = require('fs');
const PDFGenerator = require('./PDFGenerator');

let port = process.env.PORT || 8056;

const defaultTimeout = 5000;
const maxTimeout = 15000;

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

function handlePdfifyRequest(req) {
	let tempBase = "temp/"+randChars(20);
	let tempInputFile = tempBase+".html";
	let tempOutputFile = tempBase+".pdf";
	return pipeToFile(req, tempInputFile).then( () => {
		console.log("Converting "+tempInputFile+" to "+tempOutputFile);
		return new PDFGenerator().convertFileToPdf(tempInputFile, tempOutputFile, {
			timeout: defaultTimeout,
		});
	}).then( () => ({
		send: (res) => {
			res.writeHead(200, {'Content-Type': 'application/pdf'});
			return pipeFromFile(tempOutputFile, res).catch( (err) => {
				console.error("Error while piping "+tempOutputFile+" back to client");
				console.error(err.stack);
			});
		}
	}));
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

function handlePdfifyGetRequest(req) {
	let m = /^([^\?]*)(?:\?(.*))?$/.exec(req.url);
	let qsParams = parseQueryString(m[2]);
	let inputUrl = qsParams['uri'];
	let timeout = defaultTimeout;
	if( qsParams['timeout'] ) {
		timeout = +qsParams['timeout']*1000;
		if( timeout > maxTimeout ) timeout = maxTimeout;
	}
	
	if( inputUrl == undefined ) {
		return Promise.reject(new Error("No 'uri' given"));
	}
	let waitForDomSelector = qsParams['waitForDomSelector'] || 'body';

	let tempBase = "temp/"+randChars(20);
	let tempOutputFile = tempBase+".pdf";
	return new PDFGenerator().convertFileToPdf(inputUrl, tempOutputFile, {
		waitForDomSelector,
		timeout,
	}).then( () => ({
		send: (res) => {
			res.writeHead(200, {'Content-Type': 'application/pdf'});
			return pipeFromFile(tempOutputFile, res).catch( (err) => {
				console.error("Error while piping "+tempOutputFile+" back to client");
				console.error(err.stack);
			});
		}
	}));
}

if( process.env.DISPLAY == undefined || process.env.DISPLAY.length == 0 ) {
	console.error("Error: DISPLAY environment variable isn't set; this won't work!");
	process.exitCode = 1;
	return;
}

function handleRequest( req ) {
	let m = /^([^\?]*)(?:\?.*)?$/.exec(req.url);
	let path = m[1];
	
	if( req.method == 'GET' && path == '/pdfify' ) {
		return handlePdfifyGetRequest(req);
	} else if( req.method == 'POST' && req.url == '/pdfify' ) {
		return handlePdfifyRequest(req);
	} else {
		return Promise.resolve({
			send: (res) => {
				res.writeHead(404, {'Content-Type': 'text/plain'});
				res.end("Only POST /pdfify is supported (you did "+req.method+" "+req.url+")");
				return Promise.resolve();
			}
		});
	}
}

let server = http.createServer( (req,res) => {
	handleRequest(req).then( (responder) => {
		return responder.send(res).catch( (err) => {
			console.error("Error sending response? "+err.stack);
			res.end();
		});
	}, (err) => {
		console.error("Request to "+req.method+" "+req.url+" failed; sending 500: "+err.stack+"");
		res.writeHead(500, {'Content-Type': 'text/plain'});
		res.end(err.stack);
	});
});
server.listen( port, () => {
	console.log(`PDFification web server listening on port ${port}`);
});
