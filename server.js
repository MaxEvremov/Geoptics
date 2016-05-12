"use strict"

// imports

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

const config = require("./config")

const User = require("./models/User")

// app

let app = express()

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

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Credentials", "true")
    next()
})
app.use(cors({
    origin: true
}))
app.use(compression())
app.use(body_parser.json())
app.use(body_parser.urlencoded({ extended: true }))
app.use(cookie_parser(config.session_secret))

app.use("/api/app", require("./api/app"))
app.use("/api/admin", require("./api/admin"))
// app.use(passport.authenticate("remember-me"))

// static files

app.use("/admin", express.static("admin/build"))
app.all("/admin/*", (req, res) => {
    res.sendFile("index.html", { root: __dirname + "/admin/build" })
})

app.use("/", express.static("app/build"))
app.all("/*", (req, res) => {
    res.sendFile("index.html", { root: __dirname + "/app/build" })
})

// run server

User.ensureAdmin(() => {
    app.listen(config.port)
    console.log("Server running on port", config.port)
})
