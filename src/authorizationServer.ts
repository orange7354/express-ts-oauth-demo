import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';

const app = express();
const host = 'localhost';
const port = 9001;


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views/'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));





app.listen(port, () => {
    console.log(`OAuth Authorization Server is listening at http://${host}:${port}`);
});