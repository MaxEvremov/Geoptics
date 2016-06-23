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
let isIDValid = (id) => {
    id = parseInt(id)
    return Number.isInteger(id) && id > 0
}
let isPlotValid = (plot) => {
    if(!plot.type) {
        return false
    }

    if(plot.type === "avg"
    && (!plot.date_start || !plot.date_end)) {
        return false
    }

    if(plot.type === "point" && !plot.date) {
        return false
    }

    return true
}
let isISO8601DateValid = (date) => moment(date, "YYYY-MM-DD HH:mm:ssZ", true).isValid()

// helpers

let formatDate = (date) => moment(date).format("YYYY-MM-DD HH:mm:ssZ")

let generatePlotQuery = (params) => {
    let has_reference_point = params.well.reference_length
        && params.well.reference_temp

    if(params.plot.type === "avg") {
        return `
            ${has_reference_point
                ? `WITH rdiff AS (
                    SELECT avg(t.temp) - ${params.well.reference_temp} AS val
                    FROM t_measurements AS t
                    WHERE
                        t.well_id = ${params.well.id}
                        AND t.length::numeric = ${params.well.reference_length}
                        AND t.date >= '${params.plot.date_start}'
                        AND t.date <= '${params.plot.date_end}'
                )`
                : ""
            }
            SELECT
                t.length AS length,
                ${has_reference_point
                    ? "avg(t.temp) - (SELECT val FROM rdiff) AS temp"
                    : "avg(t.temp) AS temp"
                }
            FROM t_measurements AS t
            WHERE
                t.well_id = ${params.well.id}
                AND t.date >= '${params.plot.date_start}'
                AND t.date <= '${params.plot.date_end}'
                ${params.ignore_min_length
                    ? ""
                    : `AND t.length >= ${params.well.min_length}`
                }
            GROUP BY t.length
            ORDER BY length DESC
            `
    }
    else if(params.plot.type === "point") {
        return `
            WITH vars AS (
                SELECT date AS nearest_date
                FROM t_measurements
                WHERE date <= '${params.plot.date}' AND well_id = ${params.well.id}
                ORDER BY date DESC
                LIMIT 1
            )
            ${has_reference_point
                ? `,
                rdiff AS (
                    SELECT t.temp - ${params.well.reference_temp} AS val
                    FROM t_measurements AS t
                    WHERE
                        t.well_id = ${params.well.id}
                        AND t.length::numeric = ${params.well.reference_length}
                        AND t.date = (SELECT nearest_date FROM vars)
                )`
                : ""
            }
            SELECT
                t.length AS length,
                ${has_reference_point
                    ? "t.temp - (SELECT val FROM rdiff) AS temp"
                    : "t.temp AS temp"
                },
                t.date AS date
            FROM t_measurements AS t
            WHERE
                t.date = (SELECT nearest_date FROM vars)
                AND t.well_id = ${params.well.id}
                ${params.ignore_min_length
                    ? ""
                    : `AND t.length >= ${params.well.min_length}`
                }
            ORDER BY length DESC`
    }
}

// main

let api = express()

api.post(
    "/init",
    helpers.validateRequestData({
        well_id: isIDValid
    }),
    (req, res, next) => {
        let query = `SELECT min(date) AS date from p_measurements
            WHERE well_id = ${req.body.well_id}
            UNION SELECT max(date) from p_measurements
            WHERE well_id = ${req.body.well_id}
            UNION SELECT date from timeline_events
            WHERE well_id = ${req.body.well_id}
            ORDER BY date`

        helpers.makePGQuery(
            query,
            (err, result) => {
                result = result.map(v => [v.date, null])
                return res.jsonCallback(err, result)
            }
        )
    }
)

api.post(
    "/measurements",
    helpers.validateRequestData({
        plots: (plots) => {
            if(!_.isArray(plots)) {
                plots = [plots]
            }

            for(let i = 0; i < plots.length; i++) {
                if(!isPlotValid(plots[i])) {
                    return false
                }
            }

            return true
        },
        well_id: isIDValid
    }),
    (req, res, next) => {
        let plots = req.body.plots
        let well_id = req.body.well_id

        if(!_.isArray(plots)) {
            plots = [plots]
        }

        async.waterfall([
            (done) => {
                let well_query = `
                    SELECT
                        reference_temp,
                        reference_length,
                        min_length,
                        id
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

                let measurements = []

                async.each(
                    plots,
                    (plot, done) => {
                        let query = generatePlotQuery({
                            plot: plot,
                            well: well,
                            ignore_min_length: req.body.ignore_min_length
                        })

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
                            date: key,
                            values: values
                        }
                    })
                    .value()

                console.timeEnd("filter")

                return done(null, result)
            }
        ],
        res.jsonCallback)
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
            res.jsonCallback
        )
    }
)

api.get(
    "/las",
    (req, res, next) => {
        console.log(req.query)
        next()
    },
    helpers.validateRequestData({
        plot: isPlotValid,
        well_id: isIDValid
    }),
    (req, res, next) => {
        let plot = req.query.plot

        let query = generatePlotQuery({
            plot: plot,
            well: { id: req.query.well_id },
            ignore_min_length: true
        })

        helpers.makePGQuery(
            query,
            (err, result) => {
                if(err) {
                    return res.sendStatus(500)
                }

                let date = plot.type === "avg"
                    ? `${plot.date_start}-${plot.date_end}`
                    : `${plot.date}`

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

                result = result.map(v => [
                    helpers.convertDate(v.date, "native", "iso8601"),
                    v.pressure
                ])

                return res.json({
                    err: null,
                    result: result
                })
            }
        )
    }
)

api.post(
    "/p_measurements",
    helpers.validateRequestData({
        well_id: isIDValid,
        date_start: (date) => moment(date, "YYYY-MM-DD HH:mm:ssZ", true).isValid(),
        date_end: (date) => moment(date, "YYYY-MM-DD HH:mm:ssZ", true).isValid()
    }),
    (req, res) => {
        let query = `SELECT date, pressure FROM p_measurements
            WHERE well_id = ${req.body.well_id}
            AND date >= '${req.body.date_start}'
            AND date <= '${req.body.date_end}'
            ORDER BY date`

        helpers.makePGQuery(
            query,
            (err, result) => {
                if(err) {
                    return res.jsonCallback(err)
                }

                result = result.map(v => [
                    helpers.convertDate(v.date, "native", "iso8601"),
                    v.pressure
                ])

                return res.jsonCallback(null, result)
            }
        )
    }
)

api.post(
    "/reference_point",
    helpers.validateRequestData({
        well_id: isIDValid,
        date: isISO8601DateValid,
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
            res.jsonCallback
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
            res.jsonCallback
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
        let query

        if(req.body.id) {
            if(!isIDValid(req.body.id)) {
                return res.jsonCallback("err")
            }

            query = `UPDATE timeline_events SET
                short_text = '${req.body.short_text}',
                description = '${req.body.description}',
                date = '${req.body.date}'
                WHERE id = ${req.body.id}
                AND well_id = ${req.body.well_id}
                `
        }
        else {
            query = `INSERT INTO timeline_events
                (well_id, short_text, description, date)
                VALUES (
                    ${req.body.well_id},
                    '${req.body.short_text}',
                    '${req.body.description}',
                    '${req.body.date}'
                )`
        }

        helpers.makePGQuery(
            query,
            res.jsonCallback
        )
    }
)

api.delete(
    "/timeline_event",
    helpers.validateRequestData({
        well_id: isIDValid,
        id: isIDValid
    }),
    function(req, res) {
        let query = `DELETE FROM timeline_events
            WHERE well_id = ${req.body.well_id}
            AND id = ${req.body.id}`

        helpers.makePGQuery(
            query,
            res.jsonCallback
        )
    }
)

api.post(
    "/timeline_events",
    helpers.validateRequestData({
        well_id: isIDValid
    }),
    (req, res) => {
        let query = `SELECT id, short_text, description, date
            FROM timeline_events
            WHERE well_id = ${req.body.well_id}`

        helpers.makePGQuery(
            query,
            res.jsonCallback
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
        let query

        if(req.body.id) {
            if(!isIDValid(req.body.id)) {
                return res.jsonCallback("err")
            }

            query = `UPDATE length_annotations SET
                short_text = '${req.body.short_text}',
                description = '${req.body.description}',
                length = ${req.body.length}
                WHERE id = ${req.body.id}
                AND well_id = ${req.body.well_id}
                `
        }
        else {
            query = `INSERT INTO length_annotations
                (well_id, short_text, description, length)
                VALUES (
                    ${req.body.well_id},
                    '${req.body.short_text}',
                    '${req.body.description}',
                    ${req.body.length}
                )`
        }

        helpers.makePGQuery(
            query,
            res.jsonCallback
        )
    }
)

api.delete(
    "/length_annotation",
    helpers.validateRequestData({
        well_id: isIDValid,
        id: isIDValid
    }),
    function(req, res) {
        let query = `DELETE FROM length_annotations
            WHERE well_id = ${req.body.well_id}
            AND id = ${req.body.id}`

        helpers.makePGQuery(
            query,
            res.jsonCallback
        )
    }
)

api.post(
    "/length_annotations",
    helpers.validateRequestData({
        well_id: isIDValid
    }),
    (req, res) => {
        let query = `SELECT short_text, description, length, id
            FROM length_annotations
            WHERE well_id = ${req.body.well_id}`

        helpers.makePGQuery(
            query,
            res.jsonCallback
        )
    }
)

// exports

module.exports = api
