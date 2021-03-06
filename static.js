"use strict"

// imports

global.__base = __dirname + "/"

const express = require("express")
const body_parser = require("body-parser")
const compression = require("compression")
const passport = require("passport")
const LocalStrategy = require("passport-local").Strategy
const session = require("express-session")
const pg_session = require("connect-pg-simple")(session)
const pg = require("pg").native
const cookie_parser = require("cookie-parser")
const cors = require("cors")
const minimist = require("minimist")
const knex = require("knex")({ client: "pg" })

const argv = minimist(process.argv.slice(2))
const config = require(__base + "config")
const helpers = require(__base + "lib/helpers")

const User = require(__base + "models/User")

// app

let app = express()

// небольшой враппер, чтобы не писать в коллбэках одно и то же каждый раз

app.use((req, res, next) => {
    res.jsonCallback = (err, result) => {
        if(err) {
            return res.json({
                err: err
            })
        }

        return res.json({
            err: null,
            result: result
        })
    }

    return next()
})

passport.serializeUser((user, done) => {
    done(null, user.id)
})

passport.deserializeUser((id, done) => {
    User.findById(id)
    .asCallback((err, result) => {
        if(err) {
            return done(err)
        }

        let user = result.toJSON()

        return done(err, {
            name: user.name,
            login: user.login,
            id: user.id,
            role: user.role
        })
    })
})

passport.use(new LocalStrategy(
    {
        usernameField: "login",
        passwordField: "password"
    },
    (login, password, done) => {
        //console.log("login "+login+" password "+password)
        User.findOne({
            login: login
        })
        .asCallback((err, user) => {
            //console.log(user)
            if(err) {
                return done("db_err")
            }

            if(!user) {
                return done(null, false)
            }

            let is_password_valid = user.verifyPassword(password)

            if(!is_password_valid) {
                return done(null, false)
            }

            let json_user = user.toJSON()

            return done(null, {
                name: json_user.name,
                login: json_user.login,
                id: json_user.id,
                role: json_user.role
            })
        })
    }
))

// middlewares

if(argv.cors) {
    console.log("CORS enabled!")

    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        res.header("Access-Control-Allow-Credentials", "true")
        next()
    })
    app.use(cors({
        origin: true
    }))
}

app.use(compression())
app.use(body_parser.json({ limit: '100mb' }))
app.use(body_parser.urlencoded({ limit: '100mb', extended: true }))
app.use(cookie_parser(config.session_secret))

app.enable("trust proxy")

app.use("/api/admin", require(__base + "api/admin"))

// static files

if(config.serve_static) {
    app.use("/", express.static("admin/src"))
    app.all("/*", (req, res) => {
        res.sendFile("index.html", { root: __dirname + "/admin/src" })
    })

    app.use("/data", express.static("data"))
}

// run server

User.ensureAdmin(() => {
    let port = 7600

    app.listen(port)
    console.log("Server running on port", port)
})
