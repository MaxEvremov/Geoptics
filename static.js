"use strict"

// imports

const express = require("express")
const config = require("./config")

// app

let app = express()

app.use("/app", express.static("app/build"))
app.use("/admin", express.static("admin/build"))

app.all("/app/*", (req, res) => {
    res.sendFile("index.html", { root: __dirname + "/app/build" })
})

app.all("/admin/*", (req, res) => {
    res.sendFile("index.html", { root: __dirname + "/admin/build" })
})

app.listen(config.port)
console.log("Server running on port", config.port)
