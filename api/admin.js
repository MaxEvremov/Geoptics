"use strict"

// imports

const express = require("express")

const auth = require("./auth")
const users = require("./users")
const wells = require("./wells")

// main

let api = express()

api.use("/auth", auth)
api.use("/users", users)
api.use("/wells", wells)

// exports

module.exports = api
