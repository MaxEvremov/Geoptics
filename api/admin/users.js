"use strict"

// imports

const express = require("express")
const validator = require("validator")

const helpers = require(__base + "lib/helpers")

const User = require(__base + "models/User")

// main

let api = express()

api.get(
    "/",
    (req, res, next) => {
        User.query("select", "id", "name", "email", "role")
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
        password: true,
        role: true
    }),
    (req, res, next) => {
        let id = req.body.id
        let name = req.body.name
        let email = req.body.email
        let password = req.body.password
        let role = req.body.role

        let data = {
            name: name,
            email: email,
            role: role,
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
