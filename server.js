"use strict"

const express = require("express")
const pg = require("pg").native
const bodyParser = require("body-parser")
const compression = require("compression")
const moment = require("moment")
const _ = require("lodash")
const knex = require("knex")({ client: "pg" })

const config = require("./config")

let app = express()
let api = express()

let isDateValid = (date) => (!date || moment(date).isValid())
let isLengthValid = (length) => (!length || !isNaN(parseFloat(length)))

api.post(
    "/measurements",
    (req, res, next) => {
        let date_start = req.body.date_start
        let date_end = req.body.date_end

        let length_start = req.body.length_start
        let length_end = req.body.length_end

        let avg = !!req.body.avg

        if(!isDateValid(date_start) || !isDateValid(date_end)) {
            return res.json({
                err: "invalid_date"
            })
        }

        if(!isLengthValid(length_start) || !isLengthValid(length_end)) {
            return res.json({
                err: "invalid_length"
            })
        }

        let select = avg
            ? "avg(temp) as temp, length"
            : "to_char(date, 'DD-MM-YYYY HH24:MI:SS') as date, length, temp"

        let query = knex.select(
            knex.raw(select)
        )
        .from("measurements")

        let is_first_condition = true

        let addConditionToClause = (c) => {
            if(!c.value) {
                return
            }

            if(is_first_condition) {
                query.where(c.field, c.op, c.value)
            }
            else {
                query.andWhere(c.field, c.op, c.value)
            }
        }

        [
            {
                field: "date",
                op: ">=",
                value: date_start
            },
            {
                field: "date",
                op: "<=",
                value: date_end
            },
            {
                field: "length",
                op: ">=",
                value: parseFloat(length_start)
            },
            {
                field: "length",
                op: "<=",
                value: parseFloat(length_end)
            }
        ].forEach(addConditionToClause)

        if(avg) {
            query.groupBy("length").orderBy("length")
        }

        console.log(query.toString())

        let getMeasurements = (err, client, release) => {
            if(err) {
                console.error(err)

                if(client) {
                    release(client)
                }

                return res.json({
                    err: "db_err"
                })
            }

            console.time("query")

            client.query(
                query.toString(),
                (err, result) => {
                    console.timeEnd("query")
                    if(err) {
                        console.error(err)

                        if(client) {
                            release(client)
                        }

                        return res.json({
                            err: "db_err"
                        })
                    }

                    release()

                    console.time("filter")

                    let data = _.chain(result.rows)
                        .groupBy("length")
                        .map((row, key) => {
                            let result = [parseFloat(key)]
                            _.each(row, v => result.push(v.temp))
                            return result
                        })
                        .sortBy(v => v[0])
                        .value()

                    let total = data[0].length - 1
                    let colors = []

                    for(let i = 0; i < total; i++) {
                        colors.push(`rgba(${Math.floor(i / total * 255)},0,${255 - Math.floor(i / total * 255)}, 0.2)`)
                    }

                    console.timeEnd("filter")

                    return res.json({
                        err: null,
                        result: {
                            data: data,
                            colors: colors
                        }
                    })
                }
            )
        }

        pg.connect(
            config.postgres_con,
            getMeasurements
        )
    }
)

app.use(bodyParser.json())
app.use(compression())

app.use("/api", api)
app.use("/static", express.static("static/build"))

app.listen(config.port)
console.log("Server running on port", config.port)
