"use strict"

// imports

const express = require("express")
const knex = require("knex")({ client: "pg" })
const _ = require("lodash")
const async = require("async")

const helpers = require(__base + "lib/helpers")
const validators = require(__base + "lib/validators")

// const

const POINTS_PER_PLOT = 200

// main

let api = express()

api.get(
    "/init",
    (req, res, next) => {
        let well_id = req.query.well_id

        let depth_sensors
        let time_sensors

        async.waterfall(
            [
                (done) => {
                    let sensors_query = `SELECT id, name, type
                        FROM sensors WHERE well_id = ${well_id}`

                    helpers.makePGQuery(
                        sensors_query,
                        done
                    )
                },
                (sensors, done) => {
                    depth_sensors = sensors.filter(
                        (s) => s.type === "distributed"
                    )

                    time_sensors = sensors.filter(
                        (s) => s.type === "point"
                    )

                    let queries = []

                    if (depth_sensors.length > 0) {
                        let depth_sensor_ids = depth_sensors
                            .map((s) => s.id)
                            .join(", ")

                        let depth_query = `SELECT min(created_at) AS created_at from depth_measurements
                            WHERE sensor_id IN (${depth_sensor_ids})
                            UNION SELECT max(created_at) from depth_measurements
                            WHERE sensor_id IN (${depth_sensor_ids})`

                        queries.push((done) => helpers.makePGQuery(depth_query, done))
                    }

                    if (time_sensors.length > 0) {
                        let time_sensor_ids = time_sensors
                            .map((s) => s.id)
                            .join(", ")

                        let time_query = `SELECT min(created_at) AS created_at from time_measurements
                            WHERE sensor_id IN (${time_sensor_ids})
                            UNION SELECT max(created_at) from time_measurements
                            WHERE sensor_id IN (${time_sensor_ids})`

                        queries.push((done) => helpers.makePGQuery(time_query, done))
                    }

                    let events_query = `SELECT min(ts) AS created_at from timeline_events
                        WHERE well_id = ${well_id}
                        UNION SELECT max(ts) from timeline_events
                        WHERE well_id = ${well_id}`

                    queries.push((done) => helpers.makePGQuery(events_query, done))

                    async.parallel(
                        queries,
                        done
                    )
                },
                (result, done) => {
                    let min_dates = []
                    let max_dates = []

                    result.forEach(v => {
                        if (v[0] && v[0].created_at) {
                            min_dates.push(helpers.convertDate(v[0].created_at, "iso8601", "moment"))
                        }

                        if (v[1] && v[1].created_at) {
                            max_dates.push(helpers.convertDate(v[1].created_at, "iso8601", "moment"))
                        }
                    })

                    min_dates.sort((a, b) => b.isBefore(a))
                    max_dates.sort((a, b) => a.isBefore(b))

                    let min_date = helpers.convertDate(min_dates[0], "moment", "iso8601")
                    let max_date = helpers.convertDate(max_dates[0], "moment", "iso8601")

                    return done(
                        null, {
                            date_range: [min_date, max_date],
                            depth_sensors: depth_sensors,
                            time_sensors: time_sensors
                        }
                    )
                }
            ],
            res.jsonCallback
        )
    }
)

api.get(
    "/time_measurements",
    helpers.checkSensorAccess,
    helpers.validateRequestData({
        date_start: validators.isISO8601DateValid,
        date_end: validators.isISO8601DateValid
    }),
    (req, res) => {

        const LOAD_RAW_DATA_THRESHOLD = 6 * 60 * 60 * 1000

        let sensor_ids = req.query.sensor_ids.map((id) => id.toString())
        let date_start = req.query.date_start
        let date_end = req.query.date_end

        let date_diff = helpers.convertDate(date_end, "iso8601", "ms") -
            helpers.convertDate(date_start, "iso8601", "ms")

        if (date_diff < LOAD_RAW_DATA_THRESHOLD) {
            let query = `SELECT created_at, val, sensor_id
                FROM time_measurements
                WHERE sensor_id IN (${sensor_ids.join(", ")})
                AND created_at >= '${date_start}'
                AND created_at <= '${date_end}'
                ORDER BY created_at`

            return helpers.makePGQuery(
                query,
                (err, result) => {
                    if (err) {
                        return res.jsonCallback(err)
                    }

                    if (sensor_ids.length === 1) {
                        return res.jsonCallback(
                            null, {
                                is_raw: true,
                                data: result.map((row) => [row.created_at, parseFloat(row.val)])
                            }
                        )
                    }

                    let nulls = []
                    for (let i = 0; i < sensor_ids.length; i++) {
                        nulls.push(null)
                    }

                    let data = _.uniq(result.map((row) => row.created_at))
                        .map((row) => {
                            row = [row]
                            return row.concat(nulls)
                        })

                    result.forEach((row) => {
                        let i = data.findIndex((r) => r[0] === row.created_at)
                        let j = sensor_ids.indexOf(row.sensor_id.toString()) + 1

                        data[i][j] = parseFloat(row.val)
                    })

                    return res.jsonCallback(null, {
                        is_raw: true,
                        data: data
                    })
                }
            )
        }

        let interval = Math.floor(date_diff / POINTS_PER_PLOT)

        let processSensor = (sensor_id, done) => {
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
                      ,min(p.val) AS the_min
                      ,max(p.val) AS the_max
                      ,avg(p.val) AS the_avg
                FROM timeframe t
                LEFT JOIN time_measurements p ON p.created_at >= t.t_min
                                              AND p.created_at < ${date_diff < 1000 * 60 * 30 ? "t.t_max" : "t.t_min + time '00:30'" }
                                              AND p.sensor_id = ${sensor_id}
                GROUP BY 1, 2
                ORDER BY 1
            `

            helpers.makePGQuery(
                query,
                done
            )
        }

        async.map(
            sensor_ids,
            processSensor,
            (err, result) => {
                if (err) {
                    return res.jsonCallback(err)
                }

                let nulls = []
                for (let i = 0; i < sensor_ids.length; i++) {
                    nulls.push(null)
                }

                let data = []

                result.forEach((sensor) => {
                    data = data.concat(sensor.map((row) => row.t_min))
                })

                data = _.uniq(data)
                    .map((row) => {
                        row = [row]
                        return row.concat(nulls)
                    })

                result.forEach((sensor, idx) => {
                    sensor.forEach((row) => {
                        let i = data.findIndex((r) => r[0] === row.t_min)
                        let j = idx + 1

                        data[i][j] = [parseFloat(row.the_min), parseFloat(row.the_avg), parseFloat(row.the_max)]
                    })
                })

                data.sort((a, b) => {
                    a = helpers.convertDate(a[0], "iso8601", "moment")
                    b = helpers.convertDate(b[0], "iso8601", "moment")

                    return a.isAfter(b) ?
                        1 :
                        a.isBefore(b) ?
                        -1 :
                        0
                })

                return res.jsonCallback(null, {
                    is_raw: false,
                    data: data
                })
            }
        )
    }
)

api.post(
    "/reference_point",
    helpers.validatePermissions(["admin"]),
    helpers.validateRequestData({
        length: _.isNumber,
        temp: _.isNumber
    }),
    (req, res) => {
        let query = `UPDATE wells
            SET reference_temp = ${req.body.temp},
                reference_length = ${req.body.length}
            WHERE id = ${req.body.well_id}
            `

        helpers.makePGQuery(
            query,
            res.jsonCallback
        )
    }
)

api.get(
    "/min_length",
    helpers.validatePermissions(["admin"]),
    (req, res) => {
        let query = `SELECT
            min_length
            FROM wells WHERE id = ${req.query.well_id}`

        helpers.makePGQuery(
            query,
            function (err, result) {
                if (err) {
                    return res.jsonCallback(err)
                }

                return res.jsonCallback(null, result[0])
            }
        )
    }
)

api.get(
    "/reference_point",
    helpers.validatePermissions(["admin"]),
    (req, res) => {
        let query = `SELECT
            reference_length AS length,
            reference_temp AS temp
            FROM wells WHERE id = ${req.query.well_id}`

        helpers.makePGQuery(
            query,
            function (err, result) {
                if (err) {
                    return res.jsonCallback(err)
                }

                return res.jsonCallback(null, result[0])
            }
        )
    }
)

api.delete(
    "/reference_point",
    helpers.validatePermissions(["admin"]),
    (req, res) => {
        let query = knex("wells")
            .where("id", req.body.well_id)
            .update({
                reference_length: null,
                reference_temp: null
            })
            .toString()

        helpers.makePGQuery(
            query,
            res.jsonCallback
        )
    }
)

api.post(
    "/min_length",
    helpers.validatePermissions(["admin"]),
    helpers.validateRequestData({
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

// exports

module.exports = api
