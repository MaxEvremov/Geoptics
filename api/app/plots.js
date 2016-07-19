"use strict"

// imports

const express = require("express")
const knex = require("knex")({ client: "pg" })
const _ = require("lodash")
const moment = require("moment")
const async = require("async")

const helpers = require(__base + "lib/helpers")
const validators = require(__base + "lib/validators")
const las = require(__base + "lib/las")

const length_annotations = require(__base + "api/app/length-annotations")

// validators

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

api.use("/length_annotation", length_annotations)

api.post(
    "/init",
    helpers.validateRequestData({
        well_id: isIDValid
    }),
    (req, res, next) => {
        let p_query = `SELECT min(date) AS date from p_measurements
            WHERE well_id = ${req.body.well_id}
            UNION SELECT max(date) from p_measurements
            WHERE well_id = ${req.body.well_id}`

        let t_query = `SELECT min(date) AS date from t_measurements
            WHERE well_id = ${req.body.well_id}
            UNION SELECT max(date) from t_measurements
            WHERE well_id = ${req.body.well_id}`

        let events_query = `SELECT min(date) AS date from timeline_events
            WHERE well_id = ${req.body.well_id}
            UNION SELECT max(date) from timeline_events
            WHERE well_id = ${req.body.well_id}`

        async.parallel(
            [
                (done) => helpers.makePGQuery(p_query, done),
                (done) => helpers.makePGQuery(t_query, done),
                (done) => helpers.makePGQuery(events_query, done)
            ],
            (err, result) => {
                if(err) {
                    return res.jsonCallback(err)
                }

                let min_dates = []
                let max_dates = []

                result.forEach(v => {
                    if(v[0] && v[0].date) {
                        min_dates.push(helpers.convertDate(v[0].date, "iso8601", "moment"))
                    }

                    if(v[1] && v[1].date) {
                        max_dates.push(helpers.convertDate(v[1].date, "iso8601", "moment"))
                    }
                })

                min_dates.sort((a, b) => b.isBefore(a))
                max_dates.sort((a, b) => a.isBefore(b))

                let min_date = helpers.convertDate(min_dates[0], "moment", "iso8601")
                let max_date = helpers.convertDate(max_dates[0], "moment", "iso8601")

                return res.jsonCallback(null, [
                    [min_date, null],
                    [max_date, null]
                ])
            }
        )
    }
)

api.post(
    "/t_measurements",
    helpers.validateRequestData({
        plot: validators.isPlotValid,
        well_id: validators.isIDValid
    }),
    (req, res, next) => {
        let plot = req.body.plot
        let well_id = req.body.well_id

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

                        let plot_result = {
                            type: plot.type,
                            data: result.map(v => [v.length, v.temp])
                        }

                        if(plot.type === "point") {
                            plot_result.date = result[0].date
                        }

                        if(plot.type === "avg") {
                            plot_result.date_start = plot.date_start
                            plot_result.date_end = plot.date_end
                        }

                        return done(null, plot_result)
                    }
                )
            }
        ],
        res.jsonCallback)
    }
)

api.get(
    "/color_temp",
    helpers.validateRequestData({
        date: validators.isISO8601DateValid,
        number: validators.isNaturalNumberValid,
        interval: validators.isNaturalNumberValid
    }),
    helpers.getWell,
    (req, res) => {
        // params

        const OFFSET_STEP = 5

        let number = parseInt(req.query.number)
        let interval = parseInt(req.query.interval)
        let date_ms = helpers.convertDate(req.query.date, "iso8601", "ms")

        let processed = 0

        let updateTaskStatus = (task_id, params, done) => {
            if(!done) {
                done = () => {}
            }

            let query = knex("tasks")
            .where("id", task_id)
            .update(params)
            .toString()

            helpers.makePGQuery(
                query,
                done
            )
        }

        let query = knex("tasks")
        .returning("id")
        .insert({
            total: number,
            user_id: req.user.id
        })
        .toString()

        helpers.makePGQuery(
            query,
            (err, result) => {
                if(err) {
                    return res.jsonCallback(err)
                }

                let task_id = result[0].id
                res.jsonCallback(null, { task_id: task_id })

                let processPlot = (plot, done) => {
                    let query = generatePlotQuery({
                        well: req.well,
                        plot: plot
                    })

                    helpers.makePGQuery(
                        query,
                        (err, result) => {
                            if(err) {
                                return done(err)
                            }

                            plot.data = result.map(v => [v.length, v.temp])
                            processed++

                            updateTaskStatus(
                                task_id,
                                {
                                    processed: processed
                                },
                                (err, result) => {
                                    if(err) {
                                        return done(err)
                                    }

                                    return done(null, plot)
                                }
                            )
                        }
                    )
                }

                let plots = []

                for(let i = 0; i < number; i++) {
                    let date_start = helpers.convertDate(date_ms + interval * i, "ms", "iso8601")
                    let date_end = helpers.convertDate(date_ms + interval * (i + 1), "ms", "iso8601")

                    plots.push({
                        type: "avg",
                        date_start: date_start,
                        date_end: date_end,
                        offset: OFFSET_STEP * i,
                        is_for_color_plot: true
                    })
                }

                async.mapSeries(
                    plots,
                    processPlot,
                    (err, result) => {
                        return updateTaskStatus(
                            task_id,
                            {
                                is_finished: true,
                                result: { err: err, result: result }
                            }
                        )
                    }
                )
            }
        )
    }
)

api.get(
    "/las",
    helpers.validateRequestData({
        plot: validators.isPlotValid
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

                let file_name = plot.type === "avg"
                    ? `${plot.date_start}-${plot.date_end}`
                    : `${plot.date}`

                res.attachment(`${file_name}.las`)

                las({
                    is_multiple: false,
                    date: file_name,
                    length: result.map(v => v.length),
                    temp: result.map(v => v.temp)
                }).pipe(res)
            }
        )
    }
)


api.get(
    "/las_multiple",
    helpers.validateRequestData({
        plots: (plots) => {
            return _.isArray(plots)
                && _.every(plots, validators.isPlotValid)
        }
    }),
    (req, res, next) => {
        let plots = req.query.plots

        let current_date = moment().format("DD_MM_YYYY_HH_mm_ss")

        helpers.makePGQuery(
            knex("wells")
            .where("id", req.query.well_id)
            .select("name")
            .toString(),
            (err, result) => {
                if(err) {
                    return res.sendStatus(500)
                }

                let well_name = result[0].name

                async.map(
                    plots,
                    (plot, done) => {
                        let query = generatePlotQuery({
                            plot: plot,
                            well: { id: req.query.well_id },
                            ignore_min_length: true
                        })

                        helpers.makePGQuery(
                            query,
                            (err, result) => {
                                if(err) {
                                    return done(err)
                                }

                                plot.length = result.map(v => v.length)
                                plot.temp = result.map(v => v.temp)
                                plot.name = plot.type === "avg"
                                    ? `${plot.date_start}-${plot.date_end}`
                                    : `${plot.date}`

                                return done(null, plot)
                            }
                        )
                    },
                    (err, results) => {
                        if(err) {
                            return res.sendStatus(500)
                        }

                        let params = {
                            is_multiple: true,
                            length: results[0].length,
                            plots: results
                        }

                        res.attachment(`${well_name}_${current_date}.las`)

                        las(params).pipe(res)
                    }
                )
            }
        )
    }
)

api.get(
    "/p_measurements",
    helpers.validateRequestData({
        well_id: validators.isIDValid,
        date_start: validators.isISO8601DateValid,
        date_end: validators.isISO8601DateValid
    }),
    (req, res) => {
        const POINTS_PER_PLOT = 1000
        const LOAD_RAW_DATA_THRESHOLD = 1 * 24 * 60 * 60 * 1000

        let well_id = req.query.well_id
        let date_start = req.query.date_start
        let date_end = req.query.date_end

        let date_diff = helpers.convertDate(date_end, "iso8601", "ms")
            - helpers.convertDate(date_start, "iso8601", "ms")

        if(date_diff < LOAD_RAW_DATA_THRESHOLD) {
            let query = `SELECT date, pressure
                FROM p_measurements
                WHERE well_id = ${well_id}
                AND date >= '${date_start}'
                AND date <= '${date_end}'
                ORDER BY date`

            helpers.makePGQuery(
                query,
                (err, result) => {
                    if(err) {
                        return res.jsonCallback(err)
                    }

                    return res.jsonCallback(null, {
                        is_raw: true,
                        data: result.map(v => [
                            v.date,
                            v.pressure
                        ])
                    })
                }
            )

            return
        }

        let interval = Math.floor(date_diff / POINTS_PER_PLOT)

        let query = `
            WITH params AS (
               SELECT '${date_start}'::timestamptz AS _min
                     ,'${date_end}'::timestamptz AS _max
                     ,'${interval} milliseconds'::interval AS _interval
               )
              ,ts AS (SELECT generate_series(_min, _max, _interval) AS t_min FROM params)
              ,timeframe AS (
               SELECT t_min
                     ,lead(t_min, 1, _max) OVER (ORDER BY t_min) AS t_max
               FROM ts, params
               )
            SELECT t.t_min::timestamptz(0)
                  ,t.t_max
                  ,min(p.pressure) AS the_min
                  ,max(p.pressure) AS the_max
                  ,avg(p.pressure) AS the_avg
            FROM timeframe t
            LEFT JOIN p_measurements p ON p.date >= t.t_min
                                          AND p.date <  t.t_max
            WHERE p.well_id = ${well_id}
            GROUP BY 1, 2
            ORDER BY 1
        `

        helpers.makePGQuery(
            query,
            (err, result) => {
                if(err) {
                    return res.jsonCallback(err)
                }

                return res.jsonCallback(null, {
                    is_raw: false,
                    data: result.map(v => [
                        v.t_min,
                        [v.the_min, v.the_avg, v.the_max]
                    ])
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

api.get(
    "/task_status",
    helpers.validateRequestData({
        id: validators.isIDValid
    }),
    (req, res) => {
        let query = knex("tasks")
        .where({
            id: req.query.id,
            user_id: req.user.id
        })
        .select()
        .toString()

        helpers.makePGQuery(
            query,
            (err, result) => {
                if(err) {
                    return res.jsonCallback(err)
                }

                let status = result[0]

                if(!status.is_finished) {
                    return res.jsonCallback(null, {
                        is_finished: status.is_finished,
                        processed: status.processed,
                        total: status.total
                    })
                }

                let delete_query = knex("tasks")
                .where({
                    id: req.query.id,
                    user_id: req.user.id
                })
                .delete()
                .toString()

                helpers.makePGQuery(
                    delete_query,
                    (err, result) => {
                        return res.jsonCallback(null, {
                            is_finished: status.is_finished,
                            result: status.result
                        })
                    }
                )
            }
        )
    }
)

// exports

module.exports = api
