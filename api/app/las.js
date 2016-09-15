"use strict"

// imports

const express = require("express")
const knex = require("knex")({ client: "pg" })
const _ = require("lodash")
const moment = require("moment")
const async = require("async")
const speakingurl = require("speakingurl")

const helpers = require(__base + "lib/helpers")
const validators = require(__base + "lib/validators")
const las = require(__base + "lib/las")

// main

let api = express()

api.post(
    "/",
    (req, res, next) => {
        let plots = JSON.parse(req.body.plots)
        let depth = JSON.parse(req.body.depth)

        let file_name = `${moment().format("DD_MM_YYYY_HH_mm_ss")}.las`

        plots.forEach((plot) => {
            plot.name = speakingurl(plot.name, { separator: "_" })
        })

        res.setHeader("Content-Type", "application/octet-stream")
        res.setHeader("Content-Disposition", `attachment; filename="${file_name}"`)

        las({
            plots: plots,
            depth: depth
        }).pipe(res)
    }
)

// exports

module.exports = api
