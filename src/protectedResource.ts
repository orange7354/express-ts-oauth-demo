import express from 'express';
import type { Request, Response , NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
const app = express();
const port = 9002;


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views/protectedResource'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// TODO : getAccessToken 
app.get('/resource',(req : Request, res : Response) => {

});







app.listen(port, () => {
    console.log(`OAuth Protected Resource is listening at http://localhost:${port}`);
});

