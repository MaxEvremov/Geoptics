"use strict"

// imports

const express = require("express")
const validator = require("validator")
const knex = require("knex")

const helpers = require(__base + "lib/helpers")
const config = require(__base + "config")

const Favorite = require(__base + "models/Favorite")

let knex_client = knex({
    client: "pg"
})

// main

let api = express()

api.post(
    "/",
    (req, res, next) => {
        let favorite = req.body
        favorite.user_id = req.user.id

        let query = knex_client("favorites")
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
        let query = knex_client("favorites")
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

// exports

module.exports = api
