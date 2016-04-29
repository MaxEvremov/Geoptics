"use strict"

const pg = require("pg").native
const fs = require("fs")
const path = require("path")
const async = require("async")
const moment = require("moment")

let con_string = "postgres://lwpss:1234@localhost/geoptics"

let client = null
let release = null

let measurements = null

let getRandomNumber = (min, max) => (Math.random() * (max - min) + min)

let count = 0

async.waterfall(
    [
        (done) => {
            console.log("Parsing measurements...")
            fs.readFile(
                path.join(process.cwd(), "measurements.json"),
                done
            )
        },
        async.asyncify(JSON.parse),
        (_measurements, done) => {
            measurements = _measurements

            let i = 0

            console.time("db-query")

            async.whilst(
                () => i < 365 * 3,
                (done) => {
                    i++
                    console.log("i", i)

                    let insertMeasurement = (measurement, done) => {
                        let date = moment(measurement.date)
                            .add(i, "d")
                            .toISOString()

                        pg.connect(
                            con_string,
                            (err, client, release) => {
                                client.query(
                                    "INSERT INTO t_measurements (date, length, temp) VALUES($1, $2, $3)",
                                    [
                                        date,
                                        measurement.length,
                                        measurement.temp
                                    ],
                                    (err, result) => {
                                        count++
                                        release()
                                        return done(err, result)
                                    }
                                )
                            }
                        )
                    }

                    async.each(
                        measurements,
                        insertMeasurement,
                        done
                    )
                },
                done
            )
        }
    ],
    (err, result) => {
        if(err) {
            console.error(err)
            process.exit()
        }

        console.log("Done!")
        console.timeEnd("db-query")
        process.exit()
    }
)

let total = 204000 * 3 * 365

setInterval(
    () => {
        if(count > 0) {
            console.log(`${count.toString()} / ${total.toString()}`)
        }
    },
    1000
)
