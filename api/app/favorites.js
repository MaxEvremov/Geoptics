"use strict"

// imports

const express = require("express")
const validator = require("validator")

const helpers = require("../helpers")

const Favorite = require("../../models/Favorite")

// main

let api = express()

api.post(
    "/",
    (req, res, next) => {
        Favorite.create(req.body)
        .asCallback((err, result) => {
            res.json({
                err: err,
                result: result
            })
        })
    }
)

api.get(
    "/",
    (req, res, next) => {
        Favorite.findAll()
        .asCallback((err, result) => {
            res.json({
                err: err,
                result: result
            })
        })
    }
)

// exports

module.exports = api
