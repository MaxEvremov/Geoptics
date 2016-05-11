"use strict"

// imports

const express = require("express")
const knex = require("knex")({ client: "pg" })
const _ = require("lodash")
const moment = require("moment")
const pg = require("pg").native
const session = require("express-session")
const pg_session = require("connect-pg-simple")(session)
const passport = require("passport")

const helpers = require("./helpers")

const config = require("../config")

const favorites = require("./favorites")
const auth = require("./auth")

// validators

let isDateValid = (date) => (!date || moment(date).isValid())
let isLengthValid = (length) => (!length || !isNaN(parseFloat(length)))

let formatDate = (date) => moment(date).format("YYYY-MM-DD HH:mm:ss")

// main

let api = express()

api.use(session({
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 30
    },
    store: new pg_session({
        pg: pg,
        conString: config.postgres_con,
        tableName: "sessions_app"
    }),
    secret: config.session_secret,
    saveUninitialized: false,
    resave: false
}))
api.use(passport.initialize())
api.use(passport.session())
api.use((req, res, next) => {
    console.log("req.user", req.user)
    console.log("req.session", req.session)
    next()
})

api.use("/favorites", favorites)
api.use("/auth", auth)

api.post(
    "/init",
    helpers.validateRequestData({
        date_start: isDateValid,
        date_end: isDateValid
    }),
    (req, res, next) => {
        let date_start = req.body.date_start
        let date_end = req.body.date_end

        let query = knex.select(knex.raw("avg(temp) as temp, date"))
            .from("t_measurements")
            .groupBy("date")
            .orderBy("date")
            .where("date", ">=", date_start
                ? formatDate(date_start)
                : "-infinity"
            )
            .andWhere("date", "<=", date_end
                ? formatDate(date_end)
                : "infinity"
            )

        pg.connect(
            config.postgres_con,
            (err, client, release) => {
                if(err) {
                    console.error(err)

                    if(client) {
                        release(client)
                    }

                    return res.json({
                        err: "db_err"
                    })
                }

                client.query(
                    query.toString(),
                    (err, result) => {
                        if(err) {
                            console.error(err)

                            if(client) {
                                release(client)
                            }

                            return res.json({
                                err: "db_err"
                            })
                        }

                        release()

                        let data = _.chain(result.rows)
                            .map(v => [new Date(v.date), v.temp])
                            .value()

                        return res.json({
                            err: null,
                            result: {
                                data: data
                            }
                        })
                    }
                )
            }
        )
    }
)

api.post(
    "/measurements",
    helpers.validateRequestData({
        dates: true
    }),
    (req, res, next) => {
        let dates = req.body.dates

        if(!_.isArray(dates)) {
            dates = [dates]
        }

        let query = knex.select()
        .from("t_measurements")
        .whereIn("date", dates)

        console.log(query.toString())

        let getMeasurements = (err, client, release) => {
            if(err) {
                console.error(err)

                if(client) {
                    release(client)
                }

                return res.json({
                    err: "db_err"
                })
            }

            console.time("query")

            client.query(
                query.toString(),
                (err, result) => {
                    console.timeEnd("query")
                    if(err) {
                        console.error(err)

                        if(client) {
                            release(client)
                        }

                        return res.json({
                            err: "db_err"
                        })
                    }

                    release()

                    console.time("filter")

                    let data = _.chain(result.rows)
                        .groupBy("date")
                        .map((row, key) => {
                            let values = _.chain(row)
                                .map(v => [v.length, v.temp])
                                .sortBy(v => v[0])
                                .value()

                            return {
                                date: moment(key).valueOf(),
                                values: values
                            }
                        })
                        .value()

                    console.timeEnd("filter")

                    return res.json({
                        err: null,
                        result: data
                    })
                }
            )
        }

        pg.connect(
            config.postgres_con,
            getMeasurements
        )
    }
)

// exports

module.exports = api
