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

// helpers

let generatePlotQuery = (params) => {
    console.log(params)

    let has_reference_point = params.well.reference_length
        && params.well.reference_temp
    let ignore_min_length = (params.ignore_min_length === "true")

    if(params.plot.type === "avg") {
        return `
            ${has_reference_point
                ? `WITH rdiff AS (
                    SELECT avg(t.val) - ${params.well.reference_temp} AS val
                    FROM depth_measurements AS t
                    WHERE
                        t.sensor_id = ${params.sensor_id}
                        AND t.depth::numeric = ${params.well.reference_length}
                        AND t.created_at >= '${params.plot.date_start}'
                        AND t.created_at <= '${params.plot.date_end}'
                )`
                : ""
            }
            SELECT
                t.depth AS depth,
                ${has_reference_point
                    ? "avg(t.val) - (SELECT val FROM rdiff) AS val"
                    : "avg(t.val) AS val"
                }
            FROM depth_measurements AS t
            WHERE
                t.sensor_id = ${params.sensor_id}
                AND t.created_at >= '${params.plot.date_start}'
                AND t.created_at <= '${params.plot.date_end}'
                ${ignore_min_length || !params.well.min_length
                    ? ""
                    : `AND t.depth >= ${params.well.min_length}`
                }
            GROUP BY t.depth
            ORDER BY depth DESC
            `
    }
    else if(params.plot.type === "point") {
        return `
            WITH vars AS (
                SELECT created_at AS nearest_date FROM ((SELECT created_at FROM depth_measurements
                WHERE created_at <= '${params.plot.date}' AND sensor_id = ${params.sensor_id}
                ORDER BY created_at DESC
                LIMIT 1)
                UNION (SELECT created_at FROM depth_measurements
                WHERE created_at >= '${params.plot.date}' AND sensor_id = ${params.sensor_id}
                ORDER BY created_at ASC
                LIMIT 1)) AS d
                ORDER BY abs(extract(epoch from '${params.plot.date}'::timestamptz) - extract(epoch from d.created_at::timestamptz)) ASC
                LIMIT 1
            )
            ${has_reference_point
                ? `,
                rdiff AS (
                    SELECT t.val - ${params.well.reference_temp} AS val
                    FROM depth_measurements AS t
                    WHERE
                        t.sensor_id = ${params.sensor_id}
                        AND t.depth::numeric = ${params.well.reference_length}
                        AND t.created_at = (SELECT nearest_date FROM vars)
                )`
                : ""
            }
            SELECT
                t.depth AS depth,
                ${has_reference_point
                    ? "t.val - (SELECT val FROM rdiff) AS val"
                    : "t.val AS val"
                },
                t.created_at AS created_at
            FROM depth_measurements AS t
            WHERE
                t.created_at = (SELECT nearest_date FROM vars)
                AND t.sensor_id = ${params.sensor_id}
                ${ignore_min_length || !params.well.min_length
                    ? ""
                    : `AND t.depth >= ${params.well.min_length}`
                }
            ORDER BY depth DESC`
    }
}

// main

let api = express()

api.use("/length_annotation", length_annotations)

api.get(
    "/depth_measurements",
    helpers.checkSensorAccess,
    helpers.validateRequestData({
        plot: validators.isPlotValid,
        well_id: validators.isIDValid,
        sensor_id: validators.isIDValid
    }),
    helpers.getWell,
    (req, res, next) => {
        let plot = req.query.plot
        let well_id = req.query.well_id
        let sensor_id = req.query.sensor_id

        async.waterfall([
            (done) => {
                let query = generatePlotQuery({
                    plot: plot,
                    well: req.well,
                    ignore_min_length: req.query.ignore_min_length,
                    sensor_id: sensor_id
                })

                console.log(query)

                helpers.makePGQuery(
                    query,
                    (err, result) => {
                        if(err) {
                            return done(err)
                        }

                        if(result.length === 0) {
                            return done(null, [])
                        }

                        let plot_result = {
                            type: plot.type,
                            data: result.map(v =>
                                [parseFloat(v.depth), parseFloat(v.val)]
                            )
                        }

                        if(plot.type === "point") {
                            plot_result.date = result[0].created_at
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
    helpers.checkSensorAccess,
    helpers.validateRequestData({
        date: validators.isISO8601DateValid,
        number: validators.isNaturalNumberValid,
        interval: validators.isNumberValid
    }),
    helpers.getWell,
    (req, res) => {
        // params

        const OFFSET_STEP = 5

        let number = parseInt(req.query.number)
        let interval = parseFloat(req.query.interval)
        let period = parseFloat(req.query.period)
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
                        plot: plot,
                        sensor_id: req.query.sensor_id
                    })

                    helpers.makePGQuery(
                        query,
                        (err, result) => {
                            if(err) {
                                return done(err)
                            }

                            plot.data = result.map(v =>
                                [parseFloat(v.depth), parseFloat(v.val)]
                            )
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
                    let date_start_ms = date_ms + interval * i
                    let date_end_ms = date_start_ms + period

                    let date_start = helpers.convertDate(date_start_ms, "ms", "iso8601")
                    let date_end = helpers.convertDate(date_end_ms, "ms", "iso8601")

                    plots.push({
                        type: "avg",
                        date_start: date_start,
                        date_end: date_end
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

api.post(
    "/timeline_event",
    helpers.validateRequestData({
        well_id: validators.isIDValid,
        short_text: true,
        description: true,
        ts: (ts) => moment(ts, "YYYY-MM-DD HH:mm:ssZ").isValid()
    }),
    (req, res) => {
        let query

        if(req.body.id) {
            if(!validators.isIDValid(req.body.id)) {
                return res.jsonCallback("err")
            }

            query = `UPDATE timeline_events SET
                short_text = '${req.body.short_text}',
                description = '${req.body.description}',
                ts = '${req.body.ts}'
                WHERE id = ${req.body.id}
                AND well_id = ${req.body.well_id}
                `
        }
        else {
            query = `INSERT INTO timeline_events
                (well_id, short_text, description, ts)
                VALUES (
                    ${req.body.well_id},
                    '${req.body.short_text}',
                    '${req.body.description}',
                    '${req.body.ts}'
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
        well_id: validators.isIDValid,
        id: validators.isIDValid
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
        well_id: validators.isIDValid
    }),
    (req, res) => {
        let query = `SELECT id, short_text, description, ts
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
