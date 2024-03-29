import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';

const app = express();
const host = 'localhost';
const clientPort = 3000;


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views/client'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get('/', (req : Request, res :Response) => {
  res.render('index');
});



app.listen(clientPort, () => {
  console.log(`OAuth clinet server is listening at http://${host}:${clientPort}`);
});


