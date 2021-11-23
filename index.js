import express from 'express';
import cookieParser from 'cookie-parser';
import { indexRouter } from './index-route.js'
import {Server} from "socket.io";
import http from "http";

export var app = express();

const userRouting = undefined;

app.set('views', './views');
app.set('view engine', 'pug');

app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

app.use('/', indexRouter);
//app.use('/users', userRouting);
app.use(express.static('./public'))
app.use(express.static('./node_modules'))

const PORT = process.env.PORT ?? 8000;
const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`PORT = ${PORT}`)
})