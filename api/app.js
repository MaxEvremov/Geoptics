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
const async = require("async")

const helpers = require(__base + "lib/helpers")

const config = require(__base + "config")

const favorites = require(__base + "api/app/favorites")
const auth = require(__base + "api/auth")

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
        tableName: config.sessions_app_table
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

api.use("/favorites", helpers.validatePermissions(["admin", "user"]), favorites)
api.use("/auth", auth.generateAPI(["admin", "user"]))

api.post(
    "/init",
    helpers.validatePermissions(["admin", "user"]),
    helpers.validateRequestData({
        date_start: isDateValid,
        date_end: isDateValid
    }),
    (req, res, next) => {
        let date_start = req.body.date_start
            ? formatDate(req.body.date_start)
            : "-infinity"

        let date_end = req.body.date_end
            ? formatDate(req.body.date_end)
            : "infinity"

        let query = `SELECT * FROM t_measurements_avg
            WHERE date >= '${date_start}' AND date <= '${date_end}'
            ORDER BY date`

        helpers.makePGQuery(
            query,
            (err, result) => {
                if(err) {
                    return res.json({
                        err: err
                    })
                }

                result = _.chain(result)
                    .map(v => [new Date(v.date), v.temp])
                    .value()

                return res.json({
                    err: null,
                    result: result
                })
            }
        )
    }
)

api.post(
    "/measurements",
    helpers.validatePermissions(["admin", "user"]),
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

api.post(
    "/moving_avg",
    helpers.validatePermissions(["admin", "user"]),
    (req, res, next) => {
        const PRECEDING_ROWS = 100

        let date_start = req.body.date_start ? req.body.date_start : "-infinity"
        let date_end = req.body.date_end ? req.body.date_end : "infinity"

        let query = `SELECT avg (temp)
            OVER (
                ORDER BY date
                ROWS BETWEEN ${PRECEDING_ROWS} PRECEDING AND 0 FOLLOWING
            )
            AS temp, date
            FROM t_measurements_avg
            WHERE date BETWEEN '${date_start}' AND '${date_end}'
            ORDER BY date`

        console.time("pg-query")
        helpers.makePGQuery(
            query,
            (err, result) => {
                if(err) {
                    console.error(err)
                    return res.json({
                        err: err
                    })
                }

                console.time("filter")
                result = _.chain(result)
                    .map(v => [new Date(v.date), v.temp])
                    .value()
                console.timeEnd("filter")

                res.json({
                    err: null,
                    result: result
                })
            }
        )
    }
)

api.post(
    "/max_deviation",
    helpers.validatePermissions(["admin", "user"]),
    (req, res, next) => {
        let query = `SELECT
                date,
                max((d).temp) AS max_deviation
            FROM t_deviations
            LEFT JOIN LATERAL unnest(deviations) d ON true
            GROUP BY date
            ORDER BY date`

        helpers.makePGQuery(
            query,
            (err, result) => {
                if(err) {
                    console.error(err)
                    return res.json({
                        err: err
                    })
                }

                console.time("filter")
                result = _.chain(result)
                    .map(v => [new Date(v.date), v.max_deviation])
                    .value()
                console.timeEnd("filter")

                res.json({
                    err: null,
                    result: result
                })
            }
        )
    }
)

api.post(
    "/deviations",
    helpers.validatePermissions(["admin", "user"]),
    helpers.validateRequestData({
        min_deviation: _.isNumber,
        date_start: isDateValid,
        date_end: isDateValid
    }),
    (req, res, next) => {
        const norm_plot_date = "2016-02-23 20:58:44"

        let date_start = req.body.date_start
            ? formatDate(req.body.date_start)
            : "-infinity"

        let date_end = req.body.date_end
            ? formatDate(req.body.date_end)
            : "infinity"

        let min_deviation = req.body.min_deviation

        let norm_query = `SELECT length, temp FROM t_measurements
            WHERE date = '${norm_plot_date}'`
        let plots_query = `SELECT * FROM t_measurements
            WHERE date >= '${date_start}' AND date <= '${date_end}'`

        async.waterfall([
            (done) => {
                async.parallel({
                    norm_plot: (done) => helpers.makePGQuery(norm_query, done),
                    plots: (done) => helpers.makePGQuery(plots_query, done)
                }, done)
            },
            (result, done) => {
                let norm_plot = result.norm_plot
                let plots = _.groupBy(result.plots, "date")

                let deviations = []

                _.forEach(plots, (plot, date) => {
                    let max_deviation = _.maxBy(plot, v => {
                        let norm_temp = _.find(
                            norm_plot,
                            { length: v.length }
                        ).temp

                        return Math.abs(norm_temp - v.temp)
                    })

                    deviations.push({
                        temp: max_deviation.temp,
                        date: max_deviation.date,
                        norm_temp: _.find(
                            norm_plot,
                            { length: max_deviation.length }
                        ).temp,
                        length: max_deviation.length
                    })
                })

                return done(null, deviations)
            },
            (deviations, done) => {
                return done(null, _.filter(deviations, v =>
                    Math.abs(v.norm_temp - v.temp) >= min_deviation)
                )
            }],
            (err, result) => {
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
        )
    }
)

// exports

module.exports = api
