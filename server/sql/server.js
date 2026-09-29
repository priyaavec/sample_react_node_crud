import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";

import { getPool, sql } from "./db.js";
import {
  uploadFile,
  deleteBlob,
  downloadBlob
} from "./blob.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173"
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Azure React + Node CRUD API is running"
  });
});
