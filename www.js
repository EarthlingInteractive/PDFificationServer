"use strict";

const http = require('http');
const fs = require('fs');
const PDFGenerator = require('./PDFGenerator');

let port = 8056;

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
	console.log("Piping stuff to "+file);
	let writeStream = fs.createWriteStream(file)
	return pipe( stream, writeStream );
}

function pipeFromFile( file, stream ) {
	console.log("Piping stuff from "+file);
	let readStream = fs.createReadStream(file);
	return pipe( readStream, stream );
}

function handlePdfifyRequest(req,res) {
	let tempBase = "temp/"+randChars(20);
	let tempInputFile = tempBase+".html";
	let tempOutputFile = tempBase+".pdf";
	return pipeToFile(req, tempInputFile).then( () => {
		console.log("Converting "+tempInputFile+" to "+tempOutputFile);
		return new PDFGenerator().convertFileToPdf(tempInputFile, tempOutputFile).then( () => {
			console.log("PDF conversion done!");
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
	if( req.method == 'POST' && req.url == '/pdfify' ) {
		handlePdfifyRequest(req,res).catch( (err) => {
			res.writeHead(500, {'Content-Type': 'text/plain'});
			res.end(error.trace)
		});
	} else {
		res.writeHead(404, {'Content-Type': 'text/plain'});
		res.end("Only POST /pdfify is supported (you did "+req.method+" "+req.url+")");
	}
});
server.listen(8056);
