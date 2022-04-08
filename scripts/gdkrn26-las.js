"use strict"

// imports

global.__base = __dirname + "/../"

const _ = require("lodash")
const moment = require("moment")
const async = require("async")
const fs = require("fs")

const helpers = require(__base + "lib/helpers")
const las = require(__base + "lib/las")

// main

let query = `SELECT distinct(depth) FROM depth_measurements WHERE sensor_id = 8 AND depth >= 72.667 ORDER BY depth ASC`

console.log("Querying depth scale...")
helpers.makePGQuery(
    query,
    (err, result) => {
        let depth = result.map((v) => parseFloat(v.depth))

        let query = `SELECT distinct(created_at) FROM depth_measurements WHERE sensor_id = 8 ORDER BY created_at ASC`

        console.log("Querying dates...")
        helpers.makePGQuery(
            query,
            (err, result) => {
                let dates = result.map((v) => v.created_at)
                let total = dates.length

                console.log(`Found ${total} dates`)
                console.log("Querying plots...")

                let current = 0

                setInterval(() => {
                    console.log(`${current}/${total}`)
                }, 1000)

                async.eachSeries(
                    dates,
                    (date, done) => {
                        let query = `WITH vars AS (
                            SELECT created_at AS nearest_date FROM ((SELECT created_at FROM depth_measurements
                            WHERE created_at <= '${date}' AND sensor_id = 8
                            ORDER BY created_at DESC
                            LIMIT 1)
                            UNION (SELECT created_at FROM depth_measurements
                            WHERE created_at >= '${date}' AND sensor_id = 8
                            ORDER BY created_at ASC
                            LIMIT 1)) AS d
                            ORDER BY abs(extract(epoch from '${date}'::timestamptz) - extract(epoch from d.created_at::timestamptz)) ASC
                            LIMIT 1
                        ),
                        rdiff AS (
                            SELECT t.val - 32.444 AS val
                            FROM depth_measurements AS t
                            WHERE
                                t.sensor_id = 8
                                AND t.depth::numeric = 1011.124
                                AND t.created_at = (SELECT nearest_date FROM vars)
                        )
                        SELECT
                            t.depth - 72.667 AS depth,
                            t.val - (SELECT val FROM rdiff) AS val,
                            t.created_at AS created_at
                        FROM depth_measurements AS t
                        WHERE
                            t.created_at = (SELECT nearest_date FROM vars)
                            AND t.sensor_id = 8
                            AND t.depth >= 72.667
                        ORDER BY depth ASC`

                        helpers.makePGQuery(
                            query,
                            (err, result) => {
                                if(err) {
                                    return done(err)
                                }

                                las(
                                    {
                                        plots: [{
                                            num: "01",
                                            data: result.map((v) => parseFloat(v.val)),
                                            description: moment(date).format("DD_MM_YYYY_HH_mm_ss")
                                        }],
                                        depth: depth
                                    },
                                    (err, result) => {
                                        if(err) {
                                            return done(err)
                                        }

                                        result = result.replace(/\n/g, "\r\n")
                                        result = result.replace("~ASCII", `~ASCII 01`)

                                        current++

                                        fs.writeFile(`${__base}gdkrn26/${moment(date).format("DD_MM_YYYY_HH_mm_ss")}.las`, result, done)
                                    }
                                )
                            }
                        )
                    },
                    (err) => {
                        if(err) {
                            return console.log("Error", err)
                        }

                        console.log("Success!")
                        process.exit()
                    }
                )
            }
        )
    }
)
