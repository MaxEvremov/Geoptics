"use strict"

// imports

const express = require("express")
const validator = require("validator")

const helpers = require(__base + "lib/helpers")

const Favorite = require(__base + "models/Favorite")

// main

let api = express()

api.post(
    "/",
    (req, res, next) => {
        let favorite = req.body
        favorite.user_id = req.user.id

        Favorite.create(favorite)
        .asCallback(res.jsonCallback)
    }
)

api.get(
    "/",
    (req, res, next) => {
        Favorite.findAll()
        .asCallback(res.jsonCallback)
    }
)

// exports

module.exports = api
