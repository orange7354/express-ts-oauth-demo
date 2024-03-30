import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';

const app = express();
const host = 'localhost';
const clientPort = 9000;


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views/client'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


type AuthServer = {
  authorizationEndpoint : string;
  tokenEndpoint : string;
}

type Client = {
  client_id : string;
  client_secret : string;
  redirect_uris : string[];
}

const authServer :AuthServer = {
	authorizationEndpoint: 'http://localhost:9001/authorize',
	tokenEndpoint: 'http://localhost:9001/token'
};

const client  :Client = {
	client_id: "oauth-client-1",
	client_secret: "oauth-client-secret-1",
	redirect_uris : ["http://localhost:9000/callback"]
};



app.get('/', (req : Request, res :Response) => {
  res.render('index');
});


app.get('/authorize', function(req, res){
	const access_token = null;
  const state = generateRandomString(16);
	
	var authorizeUrl = buildUrl(authServer.authorizationEndpoint, {
		response_type: 'code',
		client_id: client.client_id,
		redirect_uri: client.redirect_uris[0],
		state: state
	});
	
	console.log("redirect", authorizeUrl);
	res.redirect(authorizeUrl);
});




function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
}



function buildUrl(base: string, options: Record<string, string>, hash?: string): string {
  const url = new URL(base);
  
  for (const [key, value] of Object.entries(options)) {
    url.searchParams.append(key, value);
  }
  
  if (hash) {
    url.hash = hash;
  }
  
  return url.toString();
}




app.listen(clientPort, () => {
  console.log(`OAuth clinet server is listening at http://${host}:${clientPort}`);
});


