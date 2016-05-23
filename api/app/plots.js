"use strict"

// imports

const express = require("express")
const knex = require("knex")({ client: "pg" })
const _ = require("lodash")
const moment = require("moment")
const async = require("async")

const helpers = require(__base + "lib/helpers")
const las = require(__base + "lib/las")

// validators

let isDateValid = (date) => (!date || moment(date).isValid())
let isLengthValid = (length) => (!length || !isNaN(parseFloat(length)))

let formatDate = (date) => moment(date).format("YYYY-MM-DD HH:mm:ss")

// main

let api = express()

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

        // let query = `SELECT * FROM t_measurements
        //     WHERE date in (
        //         SELECT * FROM
        //         json_array_elements_text('${JSON.stringify(dates)}')
        //     )`

        let query = knex.select()
            .from("t_measurements")
            .whereIn("date", dates)
            .toString()

        helpers.makePGQuery(
            query,
            (err, result) => {
                if(err) {
                    return res.json({
                        err: err
                    })
                }

                console.time("filter")

                let data = _.chain(result)
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
)

api.post(
    "/moving_avg",
    helpers.validatePermissions(["admin", "user"]),
    (req, res, next) => {
        const PRECEDING_ROWS = req.body.preceding_rows || 100

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
    "/deviations",
    helpers.validatePermissions(["admin", "user"]),
    helpers.validateRequestData({
        min_deviation: _.isNumber,
        date_start: isDateValid,
        date_end: isDateValid
    }),
    (req, res, next) => {
        const norm_plot_date = "2016-02-23 20:58:44+05"

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

api.get(
    "/las",
    (req, res, next) => {
        let date = req.query.date

        if(!moment(date).isValid()) {
            return res.sendStatus(500)
        }

        let query = `SELECT length, temp FROM t_measurements
            WHERE date = '${formatDate(date)}'`

        helpers.makePGQuery(
            query,
            (err, result) => {
                if(err) {
                    return res.sendStatus(500)
                }

                res.attachment(`${formatDate(date)}.las`)

                las({
                    date: date,
                    length: result.map(v => v.length),
                    temp: result.map(v => v.temp)
                }).pipe(res)
            }
        )
    }
)

// exports

module.exports = api
