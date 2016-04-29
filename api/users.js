"use strict"

// imports

const express = require("express")
const validator = require("validator")

const helpers = require("./helpers")

const User = require("../models/User")

// main

let api = express()

api.get(
    "/",
    (req, res, next) => {
        User.query("select", "id", "name", "email")
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
        User.findById(req.params.id, {})
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
        email: validator.isEmail,
        password: true
    }),
    (req, res, next) => {
        let id = req.body.id
        let name = req.body.name
        let email = req.body.email
        let password = req.body.password

        let data = {
            name: name,
            email: email,
            password: password
        }

        let done = (err, result) => {
            res.json({
                err: err
            })
        }

        if(!id) {
            User.create(data)
            .asCallback(done)
        }
        else {
            User.update(data, { id: id })
            .asCallback(done)
        }
    }
)

// exports

module.exports = api
