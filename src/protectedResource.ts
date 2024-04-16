import express from 'express';
import type { Request, Response , NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import nosql from 'nosql'

const nosqlClient = nosql.load('database.nosql');

const app = express();
const port = 9002;


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views/protectedResource'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());


interface ResourceRequest extends Request {
    access_token? :string
}

const resource = {
    "name": "Protected Resource",
	"description": "This data has been protected by OAuth 2.0"
}

const getAccessToken = (req : ResourceRequest , res : Response , next : NextFunction) => {
    let inToken = null;

    const auth = req.headers['authorization'];

    // headerにBearer Tokenがある場合
    //headerは大文字小文字を区別しないため
    if(auth && auth.toLowerCase().indexOf('bearer') === 0 ){
        // tokenの値自体は区別する
        inToken = auth.slice('bearer '.length);
    } else if ( req.body && req.body.access_token ) {
        //bodyの中を検証
        inToken = req.body.access_token;
    } else if (  req.query && req.query.access_token ) {
        inToken = req.query.access_token;
    }

    nosqlClient.one().make(function(builder :any) {
        builder.where('access_token', inToken);
        builder.callback(function(err :any ,token :any) {
            if (token) {
                console.log("We found a matching token: %s", inToken);
            } else {
                console.log('No matching token was found.');
            };
            req.access_token = token;
            next();
            return;
        });
    });
}

app.get('/resource',getAccessToken,(req : ResourceRequest, res : Response) => {
    if (req.access_token) {
        res.json(resource);
    } else {
        res.status(401).end();
    }
});







app.listen(port, () => {
    console.log(`OAuth Protected Resource is listening at http://localhost:${port}`);
});

