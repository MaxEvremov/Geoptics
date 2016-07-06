"use strict"

// imports

const express = require("express")
const pg = require("pg").native
const session = require("express-session")
const pg_session = require("connect-pg-simple")(session)
const passport = require("passport")

const helpers = require(__base + "lib/helpers")
const validators = require(__base + "lib/validators")

const config = require(__base + "config")

const favorites = require(__base + "api/app/favorites")
const auth = require(__base + "api/auth")
const plots = require(__base + "api/app/plots")
const state = require(__base + "api/app/state")

// main

let api = express()

api.use(session({
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 30
    },
    store: new pg_session({
        pg: pg,
        conString: config.postgres_con,
        tableName: config.sessions_app_table
    }),
    secret: config.session_secret,
    saveUninitialized: false,
    resave: false
}))
api.use(passport.initialize())
api.use(passport.session())

api.use("/favorites", helpers.validatePermissions(["admin", "user"]), favorites)
api.use("/auth", auth.generateAPI(["admin", "user"]))
api.use(
    "/plots",
    helpers.validatePermissions(["admin", "user"]),
    helpers.validateRequestData({ well_id: validators.isIDValid }),
    helpers.checkWellAccess,
    plots
)
api.use("/state", state)

// exports

module.exports = api
