"use strict"

const express = require("express")

const helpers = require(__base + "lib/helpers")

let api = express()

api.get(
    "/init",
    (req, res, next) => {
        if(!req.user) {
            return res.jsonCallback(null, {
                user: null,
                wells: []
            })
        }

        let query = `SELECT
                id,
                name,
                well_xml_id,
                has_p_sensor,
                has_t_sensor
            FROM wells
            WHERE id IN (
                SELECT well_id FROM well_permissions
                WHERE user_id = ${req.user.id}
            )
            ORDER BY name`

        helpers.makePGQuery(
            query,
            (err, result) => {
                if(err) {
                    return res.jsonCallback(err)
                }

                return res.jsonCallback(null, {
                    user: req.user,
                    wells: result
                })
            }
        )
    }
)

module.exports = api
