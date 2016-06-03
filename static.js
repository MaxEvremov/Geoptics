"use strict"

// imports

const express = require("express")
const config = require("./config")

// app

let app = express()

app.use("/", express.static("app/src"))
app.use("/admin", express.static("admin/src"))

app.all("/*", (req, res) => {
    res.sendFile("index.html", { root: __dirname + "/app/src" })
})

app.all("/admin/*", (req, res) => {
    res.sendFile("index.html", { root: __dirname + "/admin/src" })
})

app.listen(config.port)
console.log("Server running on port", config.port)
