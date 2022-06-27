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
const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.valid('message', 'private_message')
})

server.post("/participants", async (req, res) => {
    const user = req.body;

    const validation = userSchema.validate(user, {abortEarly: true});
    if (validation.error) {
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
            time: dayjs().format("HH:MM:ss")
        });
        res.status(201).send("Usuário cadastrado com sucesso!");
    } catch {
        res.status(500).send("Deu ruim :(");
    }
});
server.get("/participants", async (req, res) => {
    const users = await db.collection("users").find({}).toArray();
    res.send(users);
});

server.post("/messages", async (req, res) => {
    const message = req.body;
    const from = req.headers.user;
    const validation = messageSchema.validate(message, {abortEarly: true});

    if (validation.error) {
        res.status(422).send(validation.error.details);
        return;
    }

    const findUser = await db.collection("users").findOne({name: from});
    if (!findUser) {
        res.status(422).send("Remetente não encontrado!");
        return;
    }

    try {
        db.collection("messages").insertOne({
            from,
            to: message.to,
            text: message.text,
            type: message.type,
            time: dayjs().format("HH:MM:ss")
        });
        res.status(201).send("Mensagem enviada!");
    } catch {
        res.status("500").send("deu ruim :(");
    }
});
server.get("/messages", async (req, res) => {
    function filterMessages(mes) {
        if (mes.type !== "private_message") return true;
        else if (mes.from === user || mes.to === user) return true;
        else return false;
    }

    const limit = req.query.limit;
    const user = req.headers.user;
    const messages = await db.collection("messages").find({}).toArray();
    if (limit) {
        res.status(200).send(messages.slice(-limit).filter((m) => filterMessages(m)));
    } else {
        res.status(200).send(messages.filter((m) => filterMessages(m)));
    }
});

server.listen(5000, () => {
    console.log("Servidor rodando na porta 5000");
});