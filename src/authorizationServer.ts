import express from 'express';
import type { Request, Response } from 'express';
import { get } from 'http';
import path from 'path';
import { buildUrl, generateRandomString } from './utils/helper';


const app = express();
const host = 'localhost';
const port = 9001;


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views/authorizationServer'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const authServer :AuthServer = {
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

const getClient = (client_id :string) : Client | undefined => {
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
        res.render('approve', {client, reqid});
        return;
    }
});


app.post('/approve', (req : Request, res : Response) => {
    const rapid = req.body.rapid as string;
    const query = requests[rapid];
    delete requests[rapid];

    if(!query) {
        res.render('error', {error: 'No matching authorization request'});
        return;
    }

    if(req.body.approve) {
        if(query.response_type === 'code') {
            const code = generateRandomString(8);
            codes[code] = { request : query };
            const redirect = buildUrl(query.redirect_uri, { code, state: query.state });
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


app.listen(port, () => {
    console.log(`OAuth Authorization Server is listening at http://${host}:${port}`);
});