import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import joi from 'joi';

const server = express();
server.use([cors(), express.json()]);

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URL);
let db;

server.listen(5000, () => {
    console.log("Servidor operando na porta 5000");
});