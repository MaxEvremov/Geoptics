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
let isIDValid = (id) => Number.isInteger(id) && id > 0

let formatDate = (date) => moment(date).format("YYYY-MM-DD HH:mm:ss")

// main

let api = express()

api.post(
    "/measurements",
    helpers.validateRequestData({
        dates: true,
        well_id: isIDValid
    }),
    (req, res, next) => {
        let dates = req.body.dates
        let well_id = req.body.well_id

        if(!_.isArray(dates)) {
            dates = [dates]
        }

        let measurements = []

        async.each(
            dates,
            (date, done) => {
                let query = `
                    WITH vars AS (
                        SELECT date AS nearest_date
                        FROM t_measurements
                        WHERE date <= '${date}' AND well_id = ${well_id}
                        ORDER BY date DESC
                        LIMIT 1
                    ),
                    rpoint AS (
                        SELECT
                            reference_temp AS temp,
                            reference_length AS length
                        FROM wells
                        WHERE id = ${well_id}
                    ),
                    rdiff AS (
                        SELECT t.temp - (SELECT temp FROM rpoint) AS val
                        FROM t_measurements AS t
                        WHERE
                            t.well_id = ${well_id}
                            AND t.length = (SELECT length FROM rpoint)
                            AND t.date = (SELECT nearest_date FROM vars)
                    )
                    SELECT
                        t.length AS length,
                        t.temp - (SELECT val FROM rdiff) AS temp,
                        t.date AS date
                    FROM t_measurements AS t
                    WHERE
                        t.date = (SELECT nearest_date FROM vars)
                        AND t.well_id = ${well_id}`

                helpers.makePGQuery(
                    query,
                    (err, result) => {
                        if(err) {
                            return done(err)
                        }

                        measurements = measurements.concat(result)
                        return done(null)
                    }
                )
            },
            (err) => {
                if(err) {
                    return res.json({
                        err: err
                    })
                }

                console.time("filter")

                let data = _.chain(measurements)
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
    "/deviations",
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

api.get(
    "/p_measurements",
    (req, res, next) => {
        let query = `SELECT
                p_measurements.date AS date,
                p_measurements.pressure AS pressure
            FROM p_measurements
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
                    .map(v => [new Date(v.date), v.pressure])
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
    "/reference_point",
    helpers.validateRequestData({
        well_id: isIDValid,
        date: (date) => moment(date).isValid(),
        length: _.isNumber,
        temp: _.isNumber
    }),
    (req, res) => {
        let query = `UPDATE wells
            SET reference_date = '${req.body.date}',
                reference_temp = ${req.body.temp},
                reference_length = ${req.body.length}
            WHERE id = ${req.body.well_id}
            `

        helpers.makePGQuery(
            query,
            (err, result) => {
                if(err) {
                    return res.json({
                        err: err
                    })
                }

                return res.json({
                    err: null
                })
            }
        )
    }
)

// exports

module.exports = api
