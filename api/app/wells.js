"use strict"

// imports

const express = require("express")
const knex = require("knex")({ client: "pg" })
const _ = require("lodash")
const async = require("async")

const helpers = require(__base + "lib/helpers")
const validators = require(__base + "lib/validators")

// main

let api = express()

api.post(
    "/reference_point",
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
    (req, res) => {
        let query = `SELECT
            min_length
            FROM wells WHERE id = ${req.query.well_id}`

        helpers.makePGQuery(
            query,
            function(err, result) {
                if(err) {
                    return res.jsonCallback(err)
                }

                return res.jsonCallback(null, result[0])
            }
        )
    }
)

api.get(
    "/reference_point",
    (req, res) => {
        let query = `SELECT
            reference_length AS length,
            reference_temp AS temp
            FROM wells WHERE id = ${req.query.well_id}`

        helpers.makePGQuery(
            query,
            function(err, result) {
                if(err) {
                    return res.jsonCallback(err)
                }

                return res.jsonCallback(null, result[0])
            }
        )
    }
)

api.delete(
    "/reference_point",
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
