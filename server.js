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
            id: user.id
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
                id: json_user.id
            })
        })
    }
))


// static files

app.use("/app", express.static("app/build"))
app.use("/admin", express.static("admin/build"))

app.all("/app/*", (req, res) => {
    res.sendFile("index.html", { root: __dirname + "/app/build" })
})

app.all("/admin/*", (req, res) => {
    res.sendFile("index.html", { root: __dirname + "/admin/build" })
})

// middlewares

app.use(compression())
app.use(body_parser.json())
app.use(body_parser.urlencoded({ extended: true }))
app.use(cookie_parser(config.session_secret))
app.use(session({
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 30
    },
    store: new pg_session({
        pg: pg,
        conString: config.postgres_con,
        tableName: "sessions"
    }),
    secret: config.session_secret,
    saveUninitialized: false,
    resave: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use((req, res, next) => {
    console.log("req.user", req.user)
    console.log("req.session", req.session)
    next()
})

app.use("/api/app", require("./api/app"))
app.use("/api/admin", require("./api/admin"))
// app.use(passport.authenticate("remember-me"))


// run server

User.ensureAdmin(() => {
    app.listen(config.port)
    console.log("Server running on port", config.port)
})
