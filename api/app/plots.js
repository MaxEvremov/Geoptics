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
        well_id: isIDValid,
        is_setting_min_length: _.isBoolean
    }),
    (req, res, next) => {
        let dates = req.body.dates
        let well_id = req.body.well_id

        if(!_.isArray(dates)) {
            dates = [dates]
        }

        async.waterfall([
            (done) => {
                let well_query = `
                    SELECT
                        reference_temp,
                        reference_length,
                        min_length
                    FROM wells
                    WHERE id = ${well_id}
                `

                helpers.makePGQuery(
                    well_query,
                    done
                )
            },
            (well_query_result, done) => {
                let well = well_query_result[0]
                let has_reference_point = !!well.reference_temp
                    && !!well.reference_length

                let measurements = []

                async.each(
                    dates,
                    (date, done) => {
                        let query_with_rdiff = `
                            WITH vars AS (
                                SELECT date AS nearest_date
                                FROM t_measurements
                                WHERE date <= '${date}' AND well_id = ${well_id}
                                ORDER BY date DESC
                                LIMIT 1
                            ),
                            rdiff AS (
                                SELECT t.temp - ${well.reference_temp} AS val
                                FROM t_measurements AS t
                                WHERE
                                    t.well_id = ${well_id}
                                    AND t.length::numeric = ${well.reference_length}
                                    AND t.date = (SELECT nearest_date FROM vars)
                            )
                            SELECT
                                t.length AS length,
                                t.temp - (SELECT val FROM rdiff) AS temp,
                                t.date AS date
                            FROM t_measurements AS t
                            WHERE
                                t.date = (SELECT nearest_date FROM vars)
                                AND t.well_id = ${well_id}
                                ${req.body.is_setting_min_length
                                    ? "" :
                                    `AND t.length >= ${well.min_length}`
                                }
                            ORDER BY length DESC`

                        let query_wo_rdiff = `
                            WITH vars AS (
                                SELECT date AS nearest_date
                                FROM t_measurements
                                WHERE date <= '${date}' AND well_id = ${well_id}
                                ORDER BY date DESC
                                LIMIT 1
                            )
                            SELECT
                                t.length AS length,
                                t.temp AS temp,
                                t.date AS date
                            FROM t_measurements AS t
                            WHERE
                                t.date = (SELECT nearest_date FROM vars)
                                AND t.well_id = ${well_id}
                                ${req.body.is_setting_min_length
                                    ? "" :
                                    `AND t.length >= ${well.min_length}`
                                }
                            ORDER BY length DESC`

                        helpers.makePGQuery(
                            has_reference_point
                                ? query_with_rdiff
                                : query_wo_rdiff,
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
                            return done(err)
                        }

                        return done(null, measurements)
                    }
                )
            },
            (measurements, done) => {
                console.time("filter")

                let result = _.chain(measurements)
                    .groupBy("date")
                    .map((row, key) => {
                        let values = _.chain(row)
                            .map(v => [v.length, v.temp])
                            .value()

                        return {
                            date: moment(key).valueOf(),
                            values: values
                        }
                    })
                    .value()

                console.timeEnd("filter")

                return done(null, result)
            }
        ],
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
        })
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
        const norm_plot_date = "2016-02-24 01:58:44+05"

        let date_start = req.body.date_start
            ? formatDate(req.body.date_start)
            : "-infinity"

        let date_end = req.body.date_end
            ? formatDate(req.body.date_end)
            : "infinity"

        let min_deviation = req.body.min_deviation

        let norm_query = `SELECT length, temp FROM t_measurements
            WHERE date = '${norm_plot_date}'`
        let plots_query = `SELECT length, temp, date FROM t_measurements
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

                if(norm_plot.length === 0) {
                    return res.json({
                        err: "norm_plot_not_found"
                    })
                }

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
            WHERE date = '${date}'`

        helpers.makePGQuery(
            query,
            (err, result) => {
                if(err) {
                    return res.sendStatus(500)
                }

                res.attachment(`${date}.las`)

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

api.post(
    "/min_length",
    helpers.validateRequestData({
        well_id: isIDValid,
        min_length: (length) => _.isNumber(length) && length >= 0
    }),
    (req, res) => {
        let query = `UPDATE wells
            SET min_length = ${req.body.min_length}
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

api.post(
    "/timeline_event",
    helpers.validateRequestData({
        well_id: isIDValid,
        short_text: true,
        description: true,
        date: (date) => moment(date, "YYYY-MM-DD HH:mm:ssZ").isValid()
    }),
    (req, res) => {
        let query = `INSERT INTO timeline_events
            (well_id, short_text, description, date)
            VALUES (
                ${req.body.well_id},
                '${req.body.short_text}',
                '${req.body.description}',
                '${req.body.date}'
            )`

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

api.post(
    "/timeline_events",
    helpers.validateRequestData({
        well_id: isIDValid
    }),
    (req, res) => {
        let query = `SELECT short_text, description, date
            FROM timeline_events
            WHERE well_id = ${req.body.well_id}`

        helpers.makePGQuery(
            query,
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

api.post(
    "/length_annotation",
    helpers.validateRequestData({
        well_id: isIDValid,
        short_text: true,
        description: true,
        length: (length) => _.isNumber(length) && length >= 0
    }),
    (req, res) => {
        let query = `INSERT INTO length_annotations
            (well_id, short_text, description, length)
            VALUES (
                ${req.body.well_id},
                '${req.body.short_text}',
                '${req.body.description}',
                '${req.body.length}'
            )`

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

api.post(
    "/length_annotations",
    helpers.validateRequestData({
        well_id: isIDValid
    }),
    (req, res) => {
        let query = `SELECT short_text, description, length
            FROM length_annotations
            WHERE well_id = ${req.body.well_id}`

        helpers.makePGQuery(
            query,
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
