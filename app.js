import cors from 'cors'
import express from "express";
import cookieParser from "cookie-parser";


const app = express()

// middlewares
app.use(cookieParser())
app.use(express.static("public"))
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }))


// import routes
import v1 from "./routes/v1.routes.js"

app.use("/api/v1", v1)

export {app};

