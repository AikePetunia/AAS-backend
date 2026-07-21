import express from "express";
import dotenv from "dotenv";
import { createServer } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { corsMiddleware } from "./middlewares/cors.mjs";
dotenv.config();
const app = express();
const server = createServer(app);
const ALLOWED_ORIGINS = ["http://localhost:5173"];

app.use(express.json());
app.disable("x-powered-by");

const dbClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

app.use((req, res, next) => {
    corsMiddleware({acceptedOrigins = ALLOWED_ORIGINS})
	next();
});

server.listen(process.env.PORT, () => {
	console.log(`server open on http://localhost:${process.env.PORT}`);
});
