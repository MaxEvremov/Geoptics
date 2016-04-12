"use strict"

const pg = require("pg")
const fs = require("fs")
const path = require("path")
const async = require("async")
const moment = require("moment")

let con_string = "postgres://lwpss:1234@localhost/geopticstest"

let client = null
let release = null

let measurements = null

let getRandomNumber = (min, max) => (Math.random() * (max - min) + min)

let count = 0

async.waterfall(
    [
        (done) => {
            console.log("Connecting to psql...")
            pg.connect(con_string, done)
        },
        (_client, _release, done) => {
            client = _client
            release = _release

            return done()
        },
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

            client.query(
                "BEGIN",
                done
            )
        },
        (result, done) => {
            let i = 0

            console.time("db-query")

            async.whilst(
                () => i < 60,
                (done) => {
                    i++

                    let temp_rand = getRandomNumber(-10, 10)

                    let insertMeasurement = (measurement, done) => {
                        let date = moment(measurement.date)
                            .add(i, "d")
                            .toISOString()

                        client.query(
                            "INSERT INTO measurements (date, length, temp) VALUES($1, $2, $3)",
                            [
                                date,
                                measurement.length,
                                measurement.temp + temp_rand
                            ],
                            (err, result) => {
                                count++
                                return done(err, result)
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
        },
        (result, done) => {
            client.query(
                "COMMIT",
                done
            )
        }
    ],
    (err, result) => {
        if(client) {
            release(client)
        }

        if(err) {
            console.error(err)
            process.exit()
        }

        console.log("Done!")
        console.timeEnd("db-query")
        process.exit()
    }
)

setInterval(
    () => {
        if(count > 0) {
            console.log(count.toString() + "/12240000")
        }
    },
    1000
)
