"use strict"

// imports

const express = require("express")
const validator = require("validator")
const async = require("async")
const _ = require("lodash")

const helpers = require(__base + "lib/helpers")
const validators = require(__base + "lib/validators")

const Well = require(__base + "models/Well")

// main

let api = express()

api.get(
    "/",
    (req, res, next) => {
        Well.query("select", "id", "name", "well_xml_id")
        .fetchAll()
        .asCallback((err, result) => {
            res.json({
                err: err,
                result: result
            })
        })
    }
)

api.get(
    "/:id/permissions",
    (req, res, next) => {
        let users_subquery = `SELECT id, name FROM users
            WHERE id IN (
                SELECT user_id FROM well_permissions
                WHERE well_id = ${req.params.id}
            )`

        let users_wo_access_subquery = `SELECT id, name FROM users
            WHERE id NOT IN (
                SELECT user_id FROM well_permissions
                WHERE well_id = ${req.params.id}
            )`

        async.parallel({
            users: (done) => helpers.makePGQuery(users_subquery, done),
            users_without_access: (done) => helpers.makePGQuery(users_wo_access_subquery, done)
        }, res.jsonCallback)
    }
)

api.post(
    "/permissions",
    helpers.validateRequestData({
        id: validators.isIDValid,
        users: _.isArray
    }),
    (req, res, next) => {
        let delete_query = `DELETE FROM well_permissions
            WHERE well_id = ${req.body.id}`

        let values = req.body.users
            .map(v => `('${v.id}', ${req.body.id}, true)`)
            .join(",\n")

        let insert_query = `INSERT INTO well_permissions
            (user_id, well_id, has_access) VALUES ${values}`

        async.waterfall([
            (done) => helpers.makePGQuery(delete_query, done),
            (result, done) => helpers.makePGQuery(insert_query, done)
        ], res.jsonCallback)
    }
)

api.get(
    "/:id",
    (req, res, next) => {
        Well.findById(req.params.id, {})
        .asCallback((err, result) => {
            res.json({
                err: err,
                result: result
            })
        })
    }
)

api.post(
    "/",
    helpers.validateRequestData({
        name: true,
        well_xml_id: true
    }),
    (req, res, next) => {
        let id = req.body.id
        let name = req.body.name
        let well_xml_id = req.body.well_xml_id

        let data = {
            name: name,
            well_xml_id: well_xml_id
        }

        let done = (err, result) => {
            res.json({
                err: err
            })
        }

        if(!id) {
            Well.create(data)
            .asCallback(done)
        }
        else {
            Well.update(data, { id: id })
            .asCallback(done)
        }
    }
)

// exports

module.exports = api
