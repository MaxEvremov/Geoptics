"use strict"

// imports

const express = require("express")
const validator = require("validator")
const async = require("async")
const _ = require("lodash")

const helpers = require(__base + "lib/helpers")
const validators = require(__base + "lib/validators")
const CRUD = require(__base + "api/admin/CRUD")

const Well = require(__base + "models/Well")

// main

let api = CRUD(
    Well,
    ["id", "name", "well_xml_id"],
    {
        name: true,
        well_xml_id: true
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
    "/:id/permissions",
    helpers.validateRequestData({
        users: _.isArray
    }),
    (req, res, next) => {
        let delete_query = `DELETE FROM well_permissions
            WHERE well_id = ${req.params.id}`

        let values = req.body.users
            .map(v => `('${v.id}', ${req.params.id}, true)`)
            .join(",\n")

        let insert_query = `INSERT INTO well_permissions
            (user_id, well_id, has_access) VALUES ${values}`

        async.waterfall([
            (done) => helpers.makePGQuery(delete_query, done),
            (result, done) => helpers.makePGQuery(insert_query, done)
        ], res.jsonCallback)
    }
)

// exports

module.exports = api
