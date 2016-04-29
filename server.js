"use strict"

// imports

const express = require("express")
const bodyParser = require("body-parser")
const compression = require("compression")

const config = require("./config")

const User = require("./models/User")

// app

let app = express()

app.use(bodyParser.json())
app.use(compression())

app.use("/api/app", require("./api/app"))
app.use("/api/admin", require("./api/admin"))

// static files

app.use("/app", express.static("app/build"))
app.use("/admin", express.static("admin/build"))

app.all("/app/*", (req, res) => {
    res.sendFile("index.html", { root: __dirname + "/app/build" })
})

app.all("/admin/*", (req, res) => {
    res.sendFile("index.html", { root: __dirname + "/admin/build" })
})

// run server

User.ensureAdmin(() => {
    app.listen(config.port)
    console.log("Server running on port", config.port)
})
