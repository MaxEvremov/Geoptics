"use strict"

// imports

const express = require("express")

const helpers = require(__base + "lib/helpers")

// main

let createCRUD = (Model, fields, validators) => {
    let api = express()

    api.get(
        "/",
        (req, res, next) => {
            Model.findAll()
            .asCallback(res.jsonCallback)
        }
    )

    api.get(
        "/:id",
        (req, res, next) => {
            Model.findById(req.params.id, {})
            .asCallback(res.jsonCallback)
        }
    )

    api.post(
        "/",
        helpers.validateRequestData(validators),
        (req, res, next) => {
            Model.create(req.body)
            .asCallback(res.jsonCallback)
        }
    )

    api.post(
        "/:id",
        (req, res, next) => {
            let id = req.params.id

            Model.update(req.body, { id: id })
            .asCallback(res.jsonCallback)
        }
    )

    api.delete(
        "/:id",
        (req, res, next) => {
            let id = req.params.id

            Model.destroy({ id: id })
            .asCallback(res.jsonCallback)
        }
    )

    return api
}

// exports

module.exports = createCRUD
