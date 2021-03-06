"use strict"

// imports

const express = require("express")
const pg = require("pg").native
const session = require("express-session")
const pg_session = require("connect-pg-simple")(session)
const passport = require("passport")

const helpers = require(__base + "lib/helpers")

const auth = require(__base + "api/auth")
const users = require(__base + "api/admin/users")
const wells = require(__base + "api/admin/wells")
const textures = require(__base + "api/admin/textures")
const sensors = require(__base + "api/admin/sensors")
const state = require(__base + "api/admin/state")

const config = require(__base + "config")

// main

let api = express()

api.use(session({
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 30
    },
    store: new pg_session({
        pg: pg,
        conString: config.postgres_con,
        tableName: config.sessions_admin_table
    }),
    secret: config.session_secret,
    saveUninitialized: false,
    resave: false
}))
api.use(passport.initialize())
api.use(passport.session())

api.use(helpers.logRequests)

api.use("/auth", auth.generateAPI(["admin"]))
api.use("/users", helpers.validatePermissions("admin"), users)
api.use("/wells", helpers.validatePermissions("admin"), wells)
api.use("/textures", helpers.validatePermissions("admin"), textures)
api.use("/sensors", helpers.validatePermissions("admin"), sensors)
api.use("/state", state)

// exports

module.exports = api
