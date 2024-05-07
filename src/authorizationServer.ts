import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import nosql from 'nosql'
import { buildUrl, generateRandomString } from './utils/helper';

const app = express();
const host = 'localhost';
const port = 9001;

const nosqlClient = nosql.load('database.nosql');


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views/authorizationServer'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authServer : AuthServer = {
    authorizationEndpoint: 'http://localhost:9001/authorize',
    tokenEndpoint: 'http://localhost:9001/token'
};

const clients : Client[] = [
    {
        client_id: "oauth-client-1",
        client_secret: "oauth-client-secret-1",
        redirect_uris : ["http://localhost:9000/callback"]
    },  
];

interface CodeEntry {
    request: any;
}

const codes: { [key: string]: CodeEntry } = {};
const requests: { [key: string]: any } = {};

const getClient = (client_id : string | null) : Client | undefined => {
    if(!client_id) return undefined;
    return clients.find(client => client.client_id === client_id);
};


app.get('/authorize',(req :Request, res : Response) => {
    const client = getClient(req.query.client_id as string);

    if(!client) {
        console.log('Unknown client %s', req.query.client_id);
        res.render('error', {error: 'Unknown client'});
        return;
    } else if (!client.redirect_uris.includes(req.query.redirect_uri as string)) {
        console.log('Mismatched redirect URI, expected %s got %s', client.redirect_uris, req.query.redirect_uri);
        res.render('error', {error: 'Invalid redirect URI'});
        return;
    } else {
        const reqid = generateRandomString(8);
        requests[reqid] = req.query;
        res.render('approve', {client: client, reqid: reqid });
        return;
    }
});


app.post('/approve', (req : Request, res : Response) => {
    //csrf対策 authorizeで生成したランダムな文字列
    const reqid = req.body.reqid as string;

    const query = requests[reqid];
    delete requests[reqid];

    if(!query) {
        res.render('error', {error: 'No matching authorization request'});
        return;
    }

    if(req.body.approve) {
        //ユーザーが承認した場合
        if(query.response_type === 'code') {
            // 許可コードによる付与方式の対応
            const code = generateRandomString(8);
            codes[code] = { request : query };
            
            const redirect = buildUrl(query.redirect_uri, {
                code : code,
                state: query.state 
            });

            res.redirect(redirect);
            return;
        } else {
            const urlParsed = buildUrl(query.redirect_uri, {
                error: 'unsupported_response_type'
            });
            res.redirect(urlParsed);
            return;
        }

    } else {
        const urlParsed = buildUrl(query.redirect_uri, {
            error: 'access_denied'
        });
        res.redirect(urlParsed);
    }
});

app.post('/token', (req : Request, res : Response) => {
    const auth = req.headers['authorization'];

    let clientId :string | null = null;
    let clientSecret :string | null = null;

    if(auth){
        const clientCredentials = decodeClientCredentials(auth);
        clientId = clientCredentials.id;
        clientSecret = clientCredentials.secret;
    }

    if(req.body.client_id) {
        if(clientId) {
            // formパラメータとヘッダーの両方でクライアントIDが指定されている場合はエラーとする(セキュリティ上の理由)
            console.log('Client attempted to authenticate with multiple methods');
            res.status(401).json({error: 'invalid_client'});
            return;
        }
        clientId = req.body.client_id;
        clientSecret = req.body.client_secret;
    }

    const client = getClient(clientId)

    if(!client){
        console.log('Unknown client %s', clientId);
        res.status(401).json({error: 'invalid_client'});
        return;
    }

    if(client.client_secret != clientSecret) {
        console.log('Mismatched client secret, expected %s got %s', client.client_secret, clientSecret);
        res.status(401).json({error: 'invalid_client'});
        return;
    }

    if (req.body.grant_type == 'authorization_code') {
        const code = codes[req.body.code];

        if(code){
            delete codes[req.body.code];
            if(code.request.client_id == clientId) {
                const access_token = generateRandomString(16);
                const refresh_token = generateRandomString(16);

                nosqlClient.insert({ access_token : access_token, client_id : clientId });
                nosqlClient.insert({ refresh_token : refresh_token, client_id : clientId });

                console.log('Issuing access token %s to client %s', access_token, clientId);

                const token_response = {
                    access_token: access_token,
                    token_type: 'Bearer',
                    refresh_token: refresh_token
                };

                res.status(200).json(token_response);

                console.log('Issued tokens for code %s', req.body.code);

                return;
            } else {
                console.log('Client mismatch, expected %s got %s', code.request.client_id, clientId);
                res.status(400).json({error: 'invalid_grant'});
                return;
            }
        } else {
            console.log('Unknown code, %s', req.body.code);
            res.status(400).json({error: 'invalid_grant'});
            return;
        }
    } else if ( req.body.grant_type === 'refresh_token' ) {
        nosqlClient.one().make((builder : any) => {
            builder.where('refresh_token', req.body.refresh_token);
            builder.callback((err : any, token : any) => {
                if(token){
                    console.log("We found a matching refresh token: %s", req.body.refresh_token);
                    if (token.client_id != clientId) {
                        nosql.remove().make(function(builder :any) { builder.where('refresh_token', req.body.refresh_token); });
                        res.status(400).json({error: 'invalid_grant'});
                        return;
                    }
                    const access_token = generateRandomString(16);
                    nosql.insert({ access_token: access_token, client_id: clientId });
                    var token_response = { access_token: access_token, token_type: 'Bearer',  refresh_token: token.refresh_token };
                    res.status(200).json(token_response);
                    return;
                } else {
                    console.log('No matching token was found.');
                    res.status(400).json({error: 'invalid_grant'});
                    return;
                }
            });
        });
    
    } else {
        console.log('Unknown grant type %s', req.body.grant_type);
        res.status(400).json({error: 'unsupported_grant_type'});
    }
});

const decodeClientCredentials = function(auth : string) : { id: string, secret: string } {
	const clientCredentials = Buffer.from(auth.slice('basic '.length), 'base64').toString().split(':');
    const clientId = decodeURIComponent(clientCredentials[0]);
    const clientSecret = decodeURIComponent(clientCredentials[1]);
    return { id: clientId, secret: clientSecret };
};



app.listen(port, () => {
    console.log(`OAuth Authorization Server is listening at http://${host}:${port}`);
});