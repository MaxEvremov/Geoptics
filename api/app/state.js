"use strict"

const express = require("express")
const knex = require("knex")({ client: "pg" })
const async = require("async")

const helpers = require(__base + "lib/helpers")

let api = express()

api.get(
    "/init",
    (req, res, next) => {
        if(!req.user) {
            return res.jsonCallback(null, {
                user: null,
                wells: [],
                textures: []
            })
        }

        let wells_query = `SELECT
                id,
                name,
                well_xml_id
            FROM wells
            WHERE id IN (
                SELECT well_id FROM well_permissions
                WHERE user_id = ${req.user.id}
            )
            ORDER BY name`

        let textures_query = knex("textures")
        .select("id", "name", "img")
        .toString()

        async.parallel(
            {
                wells: (done) => helpers.makePGQuery(wells_query, done),
                textures: (done) => helpers.makePGQuery(textures_query, done)
            },
            (err, result) => {
                if(err) {
                    return res.jsonCallback(err)
                }

                return res.jsonCallback(null, {
                    user: req.user,
                    wells: result.wells,
                    textures: result.textures
                })
            }
        )
    }
)

module.exports = api
