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

let server = http.createServer( (req,res) => {
	if( req.method == 'POST' && req.url == '/pdfify' ) {
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
server.listen(port);
