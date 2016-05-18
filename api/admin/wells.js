"use strict"

// imports

const express = require("express")
const validator = require("validator")

const helpers = require(__base + "lib/helpers")

const Well = require(__base + "models/Well")

// main

let api = express()

api.get(
    "/",
    (req, res, next) => {
        Well.query("select", "id", "name")
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
        name: true
    }),
    (req, res, next) => {
        let id = req.body.id
        let name = req.body.name

        let data = {
            name: name
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
