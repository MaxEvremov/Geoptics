"use strict"

// imports

const express = require("express")
const knex = require("knex")({ client: "pg" })
const _ = require("lodash")

const helpers = require(__base + "lib/helpers")
const validators = require(__base + "lib/validators")

// main

let api = express()

api.get(
    "/",
    (req, res) => {
        let query = knex("length_annotations")
        .where("well_id", req.query.well_id)
        .select(
            "id",
            "name",
            "texture_id",
            "y1",
            "y2"
        )
        .toString()

        helpers.makePGQuery(
            query,
            res.jsonCallback
        )
    }
)

api.post(
    "/:id",
    helpers.validateRequestData({
        name: true,
        texture_id: validators.isIDValid,
        y1: _.isNumber,
        y2: _.isNumber
    }),
    (req, res) => {
        let query = knex("length_annotations")
        .where("id", req.params.id)
        .update(req.body)
        .toString()

        helpers.makePGQuery(
            query,
            res.jsonCallback
        )
    }
)

api.post(
    "/",
    helpers.validateRequestData({
        name: true,
        texture_id: validators.isIDValid,
        y1: _.isNumber,
        y2: _.isNumber
    }),
    (req, res) => {
        let query = knex("length_annotations")
        .insert(req.body)
        .toString()

        helpers.makePGQuery(
            query,
            res.jsonCallback
        )
    }
)

api.delete(
    "/:id",
    (req, res) => {
        let query = knex("length_annotations")
        .where("id", req.params.id)
        .delete()
        .toString()

        helpers.makePGQuery(
            query,
            res.jsonCallback
        )
    }
)

// exports

module.exports = api
