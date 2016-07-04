"use strict"

const express = require("express")

const helpers = require(__base + "lib/helpers")

let api = express()

api.get(
    "/init",
    (req, res, next) => {
        return res.jsonCallback(null, {
            user: req.user
        })
    }
)

module.exports = api
