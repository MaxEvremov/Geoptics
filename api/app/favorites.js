"use strict"

// imports

const express = require("express")
const validator = require("validator")
const knex = require("knex")({ client: "pg" })

const helpers = require(__base + "lib/helpers")
const config = require(__base + "config")

// main

let api = express()

api.post(
    "/",
    (req, res, next) => {
        let favorite = req.body
        favorite.user_id = req.user.id

        let query = knex("favorites")
        .insert(favorite)
        .toString()

        helpers.makePGQuery(
            query,
            res.jsonCallback
        )
    }
)

api.get(
    "/",
    (req, res, next) => {
        let query = knex("favorites")
        .where("user_id", req.user.id)
        .select(
            "id",
            "name",
            "created_at",
            "well_id",
            "plots"
        )
        .toString()

        helpers.makePGQuery(
            query,
            res.jsonCallback
        )
    }
)

api.delete(
    "/:id",
    (req, res, next) => {
        let query = knex("favorites")
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
