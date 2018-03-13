var http = require("http");
var buffer = require("buffer");
var PGClient = require("pg").Client;
var fetch = require("node-fetch");

// SHARED

var APP_SERVICE_IP = process.env.APP_SERVICE_IP;
var PORT = process.env.PORT || 80;
var pg = new PGClient();

// HELPER

function headers(body, url){
	var contentType= "text/html";
	if (url.endsWith(".js")){
		contentType = "text/javascript";
	}else if (url.endsWith(".css")){
		contentType = "text/style";
	}
	return {
		'Content-Length': buffer.byteLength(body),
		'Content-Type': contentType
	}
}

function response(body, res){
	res.writeHeader(200, headers(body, res.url));
	res.end(body);
}

// ASK DB

const query = {
	name: "fetch-page",
	text: "SELECT body FROM pages WHERE host = $1 AND url = $2",
	values: []
};

async function askDb( url, host, res){
	// build query
	var values = [host, url];
	var thisQuery = Object.assign({}, query, {values});

	// ask for page
	var response;
	try{
		response= await client.query(thisQuery)
	}catch(ex){
		return false;
	}

	// return cached response
	if( response&& response.rows&& response.rows.length){
		response(response.rows[0].body, res);
		return true;
	}
	return false;
}

// DOWNLOAD

async function downloadBlob( req){
	var response = await fetch({
		url: `http://${APP_SERVICE_IP}${req.url}`,
		headers: req.headers // important thing is to relay along "host" header via this
	});
	return body.blob();
}

// RELAY BLOB

async function relayBlob(blob, res, headers){
	res.writeHead(200, headers);
	res.end(blob);
}

// SAVE TO DB

var write = {
	name: "write-page",
	text: "INSERT INTO pages(blob, host, url)  ON CONFLICT DO UPDATE",
	values: []
}

async function writeDb( blob, host, url){
	var values = [blob, host, url];
	var thisQuery = Object.assign(write, {values});
	pg.query(write);
}


async function passThroughCache( req, res){
	// ask the db to serve it
	if( await askDb( req.url, req.headers.host, res)){
		// it did - we're done
		return
	}

	// fetch the resource
	var blob = await downloadBlob( req);

	// relay fetched response
	response(blob, res);

	// save result to db
	// TODO: we could check to see if db has gotten the resource in the interveneing time & skip this if so
	saveToDb(blob, req.headers.host, req.url);
}

async function main(){
	await pg.connect();
	const proxyServer = http.createServer(passThroughCache);
	proxyServer.listen(PORT);
	console.log({status: "started", port: PORT})
}

if (require.main === module){
	main();
}

module.exports= main
// util
module.exports.headers = headers
module.exports.response = response
// query db
module.exports.query = query
module.exports.askDb = askDb
// get resource
module.exports.downloadBlob = downloadBlob
// write result
module.exports.write = write
module.exports.writeDb = writeDb
// application runtime
module.exports.passThroughCache = passThroughCache
module.exports.main = main


