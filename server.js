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

const argv = minimist(process.argv.slice(2))
const config = require(__base + "config")

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
            email: user.email,
            id: user.id,
            role: user.role
        })
    })
})

passport.use(new LocalStrategy(
    {
        usernameField: "email",
        passwordField: "password"
    },
    (email, password, done) => {
        User.findOne({
            email: email
        })
        .asCallback((err, user) => {
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
                email: json_user.email,
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
app.use(body_parser.json())
app.use(body_parser.urlencoded({ extended: true }))
app.use(cookie_parser(config.session_secret))

app.use("/api/app", require(__base + "api/app"))
app.use("/api/admin", require(__base + "api/admin"))

// static files

app.use("/admin", express.static("admin/src"))
app.all("/admin/*", (req, res) => {
    res.sendFile("index.html", { root: __dirname + "/admin/src" })
})

app.use("/", express.static("app/src"))
app.all("/*", (req, res) => {
    res.sendFile("index.html", { root: __dirname + "/app/src" })
})

// run server

User.ensureAdmin(() => {
    let port = argv.p || config.port

    app.listen(port)
    console.log("Server running on port", port)
})
