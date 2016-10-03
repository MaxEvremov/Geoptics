"use strict"

// imports

const _ = require("lodash")
let pg = require("pg")
const moment = require("moment")
const knex = require("knex")({ client: "pg" })
const async = require("async")

const config = require(__base + "config")
const validators = require(__base + "lib/validators")

// заставляем node-pg возвращать даты в исходном виде

let types = pg.types

const TIMESTAMPTZ_OID = 1184
const TIMESTAMP_OID = 1114

let date_parser = (date) => date

types.setTypeParser(TIMESTAMP_OID, date_parser)
types.setTypeParser(TIMESTAMPTZ_OID, date_parser)

// main

let pg_pool = new pg.Pool(config.pg)

module.exports = {}

module.exports.validateRequestData = (fields) => (req, res, next) => {
    let is_get = req.method === "GET"

    let req_values = is_get
        ? req.query
        : req.body

    let are_all_fields_valid = true

    _.forOwn(fields, (value, key) => {
        if(value === true) {
            if(_.isUndefined(req_values[key])) {
                res.json({
                    err: "no_required_field",
                    field: key
                })

                are_all_fields_valid = false
                return false
            }
        }

        if(_.isFunction(value)) {
            let is_valid = value(req_values[key])

            if(!is_valid) {
                res.json({
                    err: "wrong_field_value",
                    field: key
                })

                are_all_fields_valid = false
                return false
            }
        }
    })

    if(are_all_fields_valid) {
        return next()
    }
}

module.exports.validatePermissions = (roles) => (req, res, next) => {
    if(!_.isArray(roles)) {
        roles = [roles]
    }

    if(!req.user) {
        return res.status(401).json({
            err: "no_access"
        })
    }

    if(req.user.role === "owner") {
        return next()
    }

    if(roles.indexOf(req.user.role) === -1) {
        return res.status(401).json({
            err: "no_access"
        })
    }

    return next()
}

module.exports.checkWellAccess = (req, res, next) => {
    let user_id = req.user.id
    let well_id = req.method === "GET"
        ? req.query.well_id
        : req.body.well_id

    if(!user_id || !well_id) {
        return res.jsonCallback("no_access")
    }

    if(!validators.isIDValid(user_id) || !validators.isIDValid(well_id)) {
        return res.jsonCallback("no_access")
    }

    if(req.user.role === "owner") {
        return next()
    }

    let query = `SELECT count(*) FROM well_permissions
        WHERE user_id = ${user_id} AND well_id = ${well_id}`

    module.exports.makePGQuery(
        query,
        (err, result) => {
            if(err || !result) {
                return res.jsonCallback("no_access")
            }

            if(parseInt(result[0].count) === 0) {
                return res.jsonCallback("no_access")
            }

            return next()
        }
    )
}

module.exports.checkSensorAccess = (req, res, next) => {
    let is_get = (req.method === "GET")

    let user_id = req.user.id
    let sensor_ids = is_get
        ? (req.query.sensor_ids || [req.query.sensor_id])
        : (req.body.sensor_ids || [req.body.sensor_id])

    if(!user_id || !sensor_ids) {
        return res.jsonCallback("no_access")
    }

    if(!validators.isIDValid(user_id)) {
        return res.jsonCallback("no_access")
    }

    for(let i = 0; i < sensor_ids.length; i++) {
        if(!validators.isIDValid(sensor_ids[i])) {
            return res.jsonCallback("no_access")
        }
    }

    if(req.user.role === "owner") {
        return next()
    }

    let wells_query = `SELECT well_id FROM well_permissions
        WHERE user_id = ${user_id}
    `

    let sensors_query = `SELECT id, well_id FROM sensors
        WHERE id IN (${sensor_ids.join(", ")})`

    async.parallel(
        {
            wells: (done) => module.exports.makePGQuery(wells_query, done),
            sensors: (done) => module.exports.makePGQuery(sensors_query, done)
        },
        (err, result) => {
            if(err) {
                return res.jsonCallback("no_access")
            }

            let available_well_ids = result.wells.map((w) => w.well_id)
            let sensor_well_ids = result.sensors.map((s) => s.well_id)

            if(!_.every(
                sensor_well_ids,
                (id) => available_well_ids.indexOf(id) !== -1)
            ) {
                return res.jsonCallback("no_access")
            }

            return next()
        }
    )
}

module.exports.makePGQuery = (query, options, done) => {
    if(_.isFunction(options)) {
        done = options
        options = {}
    }

    let enable_query_log = _.isUndefined(options.enable_query_log)
        ? false
        : options.enable_query_log

    if(enable_query_log) {
        console.time(query)
    }

    pg_pool.query(
        query,
        (err, result) => {
            if(enable_query_log) {
                console.timeEnd(query)
            }

            if(err) {
                console.error(err)
                return done("db_err")
            }

            return done(null, result.rows)
        }
    )
}

module.exports.formatDate = (date) => {
    return moment(date).format("YYYY-MM-DD HH:mm:ssZ")
}

module.exports.convertDate = (date, from, to) => {
    var from_moment

    // parse date

    if(from === "moment") {
        from_moment = date
    }

    if(from === "ms") {
        from_moment = moment(Math.round(date), "x", true)
    }

    if(from === "iso8601") {
        from_moment = moment(date, "YYYY-MM-DD HH:mm:ss.SSSSSSZ")
    }

    if(from === "native") {
        from_moment = moment(date)
    }

    // convert date

    if(to === "moment") {
        return from_moment
    }

    if(to === "ms") {
        return from_moment.valueOf()
    }

    if(to === "iso8601") {
        return from_moment.format("YYYY-MM-DD HH:mm:ss.SSSSSSZ")
    }

    if(to === "native") {
        return from_moment.toDate()
    }
}

module.exports.getWell = (req, res, next) => {
    let well_id = req.method === "GET"
        ? req.query.well_id
        : req.body.well_id

    let query = knex("wells")
    .where("id", well_id)
    .select()
    .toString()

    module.exports.makePGQuery(
        query,
        (err, result) => {
            if(err) {
                return res.jsonCallback(err)
            }

            req.well = result[0]
            return next()
        }
    )
}

module.exports.logRequests = (req, res, next) => {
    if(!req.user) {
        return next()
    }

    let log = {
        user_id: req.user.id,
        ip: req.headers["x-real-ip"],
        user_agent: req.get("User-Agent"),
        url: req.originalUrl,
        method: req.method
    }

    if(req.method === "GET") {
        log.request_body = JSON.stringify(req.query)
    }
    else {
        log.request_body = JSON.stringify(req.body)
    }

    let query = knex("logs")
    .insert(log)
    .toString()

    module.exports.makePGQuery(
        query,
        (err, result) => {}
    )

    return next()
}
