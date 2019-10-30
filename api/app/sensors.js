"use strict"

// imports

const express = require("express")
const knex = require("knex")({ client: "pg" })
const _ = require("lodash")
const moment = require("moment")
const async = require("async")

const helpers = require(__base + "lib/helpers")
const validators = require(__base + "lib/validators")
const las = require(__base + "lib/las")

// main

let api = express()

api.get("/update_time_range", (req, res) => {
    const sensor_id = req.query.sensor_id;
    const sql = `
        SELECT type FROM sensors WHERE id = ${sensor_id};
    `
    return helpers.makePGQuery(sql, (err, result) => {
        if (err) {
            return res.jsonCallback(err);
        }
        if (result.length === 0) {
            return res.status(404).end();
        }
        console.log(result);
        let table;
        switch (result[0].type) {
            case 'point': table = "time_measurements"; break;
            case 'distributed': table = "depth_measurements"; break;
            default: return res.jsonCallback(new Error(`Unknown sensor type '${result[0].type}' for sensor ${sensor_id}`));
        }
        const sql = `
            UPDATE sensors SET
                range_min = (SELECT created_at
                    FROM ${table}
                    WHERE sensor_id = ${sensor_id}
                    ORDER BY created_at ASC LIMIT 1),
                range_max = (SELECT created_at
                    FROM ${table}
                    WHERE sensor_id = ${sensor_id}
                    ORDER BY created_at DESC LIMIT 1)
                WHERE id = ${sensor_id};
        `;
        return helpers.makePGQuery(sql, (err, result) => {
            if (err) {
                return res.jsonCallback(err);
            }
            res.status(201).end();
        });
    });
})
// exports

module.exports = api
