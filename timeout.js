"use strict";

module.exports = function(promise, time, waitingForDescription) {
	return new Promise( (resolve,reject) => {
		let done = false;
		let timeoutHandle = setTimeout(() => {
			if( !done ) {
				reject(new Error("Timeout after "+time+"ms waiting for "+waitingForDescription));
				done = true;
			}
		}, time);
		promise.then( (v) => {
			if( !done ) {
				resolve(v);
				clearTimeout(timeoutHandle);
				done = true;
			}
		});
		promise.catch( (err) => {
			if( !done ) {
				reject(err);
				clearTimeout(timeoutHandle);
				done = true;
			}
		});
	});
}
