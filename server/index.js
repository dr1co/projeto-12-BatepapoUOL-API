import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import joi from 'joi';
import dayjs from 'dayjs';

const server = express();
server.use([cors(), express.json()]);

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URL);
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db("BatepapoUol");
});

const userSchema = joi.object({
    name: joi.string().required()
});

server.post("/participants", async (req, res) => {
    const user = req.body;
    const now = dayjs().format("HH:MM:SS")
    const validation = userSchema.validate(user, {abortEarly: true});
    if (!validation) {
        res.status(422).send(validation.error.details);
        return;
    }

    const findUser = await db.collection("users").findOne(user);
    if (findUser) {
        res.status(409).send("Usuário já cadastrado!");
        return;
    }

    try {
        db.collection("users").insertOne({
            name: user.name,
            lastStatus: Date.now()
        });
        db.collection("messages").insertOne({
            from: user.name,
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            time: now
        });
        res.status(201).send("Entrando na sala...");
    } catch {
        res.status(500).send("deu ruim :(");
    }
});

server.listen(5000, () => {
    console.log("Servidor rodando na porta 5000");
});