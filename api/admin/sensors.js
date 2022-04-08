"use strict"

// imports

const express = require("express")
const validator = require("validator")
const async = require("async")
const _ = require("lodash")
const knex = require("knex")({ client: "pg" })

const helpers = require(__base + "lib/helpers")
const validators = require(__base + "lib/validators")
const CRUD = require(__base + "api/admin/CRUD")

const Sensor = require(__base + "models/Sensor")

// main

let api = express()

api.get(
    "/wells",
    function(req, res) {
        let query = knex.column(["id", "name"])
        .select()
        .from("wells")
        .toString()

        helpers.makePGQuery(
            query,
            res.jsonCallback
        )
    }
)

api.use(CRUD(
    Sensor,
    [
        "name",
        "type",
        "well_id",
        "depth",
        "xml_id",
        "xml_tag"
    ],
    {
        name: true,
        xml_id: true,
        well_id: validators.isIDValid,
        type: true,
        xml_tag: true
    }
))

// exports

module.exports = api
