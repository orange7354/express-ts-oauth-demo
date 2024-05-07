import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { buildUrl, generateRandomString } from './utils/helper';

const app = express();
const host = 'localhost';
const clientPort = 9000;


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views/client'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


type TokenResponse = {
    access_token : string;
    token_type : string;
}


const authServer :AuthServer = {
    authorizationEndpoint: 'http://localhost:9001/authorize',
    tokenEndpoint: 'http://localhost:9001/token'
};

const client :Client = {
    client_id: "oauth-client-1",
    client_secret: "oauth-client-secret-1",
    redirect_uris : ["http://localhost:9000/callback"],
    scope : "foo bar"
};


const protectedResource = 'http://localhost:9002/resource';


//csrf対策　
var state : string = '';
var access_token :string = '';

app.get('/', (req : Request, res :Response) => {
    res.render('index',{
        access_token : access_token,
    });
});


app.get('/authorize',(req :Request, res : Response) => {
	access_token = '';
    state = generateRandomString(16);
    
    const authorizeUrl = buildUrl(authServer.authorizationEndpoint, {
        response_type: 'code',
        client_id: client.client_id,
        redirect_uri: client.redirect_uris[0],
        state: state
    });
    
    console.log("redirect", authorizeUrl);
    res.redirect(authorizeUrl);
});

app.get('/callback', async (req : Request,res :Response) => {
    if(req.query.error){
        res.render('error',{
            error:req.query.error
        });
    }

    if(req.query.state != state){
        res.render('error',{
            error: 'State value did no match'
        });
    }

    const code = req.query.code as string;
    try {
        const tokRes = await getTokens(code, client, authServer);
        access_token = tokRes.access_token;
        res.render('index',{
            access_token: access_token
        })
    } catch ( error ){
        res.render('error',{error : error});
    }
});


app.get('/fetch_resource', async (req :Request, res :Response) => {
    const headers = new Headers();
    headers.append('Authorization', 'Bearer ' + access_token);
    headers.append('Content-Type', 'application/x-www-form-urlencoded');

    const response = await fetch(protectedResource, {
        headers: headers
    });

    if (response.ok) {
        //
        console.log(response.json());
    } else {
        console.log("resource status error code " + response.status);
		res.render('error', {error: 'Unable to fetch resource. Status ' + response.status});
    }
});



async function getTokens(code: string, client: Client, authServer: AuthServer): Promise<TokenResponse> {
    const formData = new URLSearchParams();
    formData.append('grant_type', 'authorization_code');
    formData.append('code', code);
    formData.append('redirect_uri', client.redirect_uris[0]);

    const headers = new Headers();
    headers.append('Content-Type', 'application/x-www-form-urlencoded');
    headers.append('Authorization', 'Basic ' + encodeClientCredentials(client.client_id,client.client_secret));

    const response = await fetch(authServer.tokenEndpoint, {
        method: 'POST',
        headers: headers,
        body: formData.toString(),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const tokRes = await response.json() as TokenResponse;
    return tokRes;
}

function encodeClientCredentials(clientId: string, clientSecret: string): string {
    const escapedClientId = encodeURIComponent(clientId);
    const escapedClientSecret = encodeURIComponent(clientSecret);
    const credentials = `${escapedClientId}:${escapedClientSecret}`;
    return Buffer.from(credentials).toString('base64');
}


app.listen(clientPort, () => {
    console.log(`OAuth client server is listening at http://${host}:${clientPort}`);
});


