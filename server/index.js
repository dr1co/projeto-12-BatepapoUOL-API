import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import joi from 'joi';
import dayjs from 'dayjs';
import { stripHtml } from 'string-strip-html';

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

setInterval(async () => {
    const now = Date.now();

    try {
        const users = await db.collection("users").find({}).toArray();
    
        for (let i = 0 ; i < users.length ; i++) {
            if (now - users[i].lastStatus >= 10000) {
                db.collection("users").deleteOne({name: users[i].name});
                db.collection("messages").insertOne({
                    from: users[i].name,
                    to: "Todos",
                    text: "sai da sala...",
                    type: "status",
                    time: dayjs().format("HH:MM:ss")
                });
            }
        }
    } catch {
        console.log("Não foi possível atualizar a lista de usuários. Tentando novamente em 15s");
    }
}, 15000);

server.post("/participants", async (req, res) => {
    const user = req.body;

    const validation = userSchema.validate(user, {abortEarly: true});
    if (validation.error) {
        res.status(422).send(validation.error.details);
        return;
    }

    try {
        const findUser = await db.collection("users").findOne(user);
        if (findUser) {
            res.status(409).send("Usuário já cadastrado!");
            return;
        }
        db.collection("users").insertOne({
            name: stripHtml(user.name.trim()).result,
            lastStatus: Date.now()
        });
        db.collection("messages").insertOne({
            from: stripHtml(user.name).result,
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
            to: message.to.trim(),
            text: stripHtml(message.text).result,
            type: message.type.trim(),
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

    try {
        const messages = await db.collection("messages").find({}).toArray();

        if (limit) {
            res.status(200).send(messages.slice(-limit).filter((m) => filterMessages(m)).reverse());
        } else {
            res.status(200).send(messages.filter((m) => filterMessages(m)).reverse());
        }
    } catch {
        res.status(500).send("deu ruim :(");
    }
});
server.delete("/messages/:id", async (req, res) => {
    const user = req.headers.user;
    const id = req.params.id;

    try {
        const findMessage = await db.collection("messages").findOne({_id: new ObjectId(id)});
    
        if (!findMessage) {
            res.status(404).send("Mensagem não encontrada.");
            return;
        }
        
        if (user !== message.from) {
            res.status(401).send("Você não é o dono dessa mensagem. Não pode removê-la");
            return;
        }
    
        db.collection("messages").deleteOne({_id: new ObjectId(id)});
        res.status(200).send("Deletada com sucesso!");
    } catch {
        res.status(500).send("deu ruim :(");
    }
});
server.put("/messages/:id", async (req, res) => {
    const from = req.headers.user;
    const message = req.body;
    const id = req.params.id;

    const validation = messageSchema.validate(message, {abortEarly: true});

    if (validation.error) {
        res.status(422).send(validation.error.details);
        return;
    }

    try {
        const findUser = await db.collection("users").findOne({name: from});
    
        if (!findUser) {
            res.status(422).send("Remetente não encontrado!");
            return;
        }

        const findMessage = await db.collection("messages").findOne({_id: new ObjectId(id)});

        if (!findMessage) {
            res.status(404).send("Mensagem não encontrada.");
            return;
        }

        db.collection("messages").updateOne({_id: new ObjectId(id)}, {
            $set: {
                from,
                to: message.to.trim,
                text: stripHtml(message.text).result,
                type: message.type.trim,
                time: dayjs().format("HH:MM:ss")
            }
        });
        res.status(200).send("Mensagem atualizada!");
    } catch {
        res.status(500).send("deu ruim :(");
    }
});

server.post("/status", async (req, res) => {
    const user = req.headers.user;

    try {
        const findUser = await db.collection("users").findOne({name: user});

        if (!findUser) {
            res.status(404).send("Usuário não encontrado.");
            return;
        }
        db.collection("users").updateOne({name: user}, {
            $set: { lastStatus: Date.now()}
        });
        res.status(200).send("Status atualizado com sucesso!");
    } catch {
        res.status(500).send("deu ruim :(");
    }
})

server.listen(5000, () => {
    console.log("Servidor rodando na porta 5000");
});