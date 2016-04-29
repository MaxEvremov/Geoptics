"use strict"

const express = require("express")
const knex = require("knex")({ client: "pg" })
const _ = require("lodash")
const moment = require("moment")
const pg = require("pg").native

const config = require("../config")

let api = express()

let isDateValid = (date) => (!date || moment(date).isValid())
let isLengthValid = (length) => (!length || !isNaN(parseFloat(length)))

api.post(
    "/init",
    (req, res, next) => {
        let query = knex.select(knex.raw("avg(temp) as temp, date"))
            .from("t_measurements")
            .groupBy("date")
            .orderBy("date")

        pg.connect(
            config.postgres_con,
            (err, client, release) => {
                if(err) {
                    console.error(err)

                    if(client) {
                        release(client)
                    }

                    return res.json({
                        err: "db_err"
                    })
                }

                client.query(
                    query.toString(),
                    (err, result) => {
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

                        let data = _.chain(result.rows)
                            .map(v => [new Date(v.date), v.temp])
                            .value()

                        return res.json({
                            err: null,
                            result: {
                                data: data
                            }
                        })
                    }
                )
            }
        )
    }
)

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
        .from("t_measurements")

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
                value: moment(date_start).format("YYYY-MM-DD HH:mm:ss")
            },
            {
                field: "date",
                op: "<=",
                value: moment(date_end).format("YYYY-MM-DD HH:mm:ss")
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

                    console.timeEnd("filter")

                    return res.json({
                        err: null,
                        result: {
                            data: data
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

module.exports = api
