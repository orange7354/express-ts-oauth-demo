import express from 'express';
import type { Request, Response } from 'express';
import { get } from 'http';
import path from 'path';

const app = express();
const host = 'localhost';
const port = 9001;


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views/'));
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

const codes: { [key: string]: string } = {};
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



function generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return result;
}


app.listen(port, () => {
    console.log(`OAuth Authorization Server is listening at http://${host}:${port}`);
});