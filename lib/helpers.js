"use strict"

// imports

const _ = require("lodash")
let pg = require("pg")
const moment = require("moment")

let types = pg.types

const TIMESTAMPTZ_OID = 1184
const TIMESTAMP_OID = 1114

let date_parser = (date) => date

types.setTypeParser(TIMESTAMP_OID, date_parser)
types.setTypeParser(TIMESTAMPTZ_OID, date_parser)

const config = require(__base + "config")

// main

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
                if(is_get) {
                    res.sendStatus(500)
                }
                else {
                    res.json({
                        err: "no_required_field",
                        field: key
                    })
                }

                are_all_fields_valid = false
                return false
            }
        }

        if(_.isFunction(value)) {
            let is_valid = value(req_values[key])

            if(!is_valid) {
                if(is_get) {
                    res.sendStatus(500)
                }
                else {
                    res.json({
                        err: "wrong_field_value",
                        field: key
                    })
                }

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

module.exports.makePGQuery = (query, options, done) => {
    if(_.isFunction(options)) {
        done = options
        options = {}
    }

    let enable_query_log = _.isUndefined(options.enable_query_log)
        ? true
        : options.enable_query_log

    if(enable_query_log) {
        console.time(query)
    }

    pg.connect(
        config.postgres_con,
        (err, client, release) => {
            if(err) {
                if(enable_query_log) {
                    console.timeEnd(query)
                }

                console.error(err)

                if(client) {
                    release(client)
                }

                return done("db_err")
            }

            client.query(
                query,
                (err, result) => {
                    if(enable_query_log) {
                        console.timeEnd(query)
                    }

                    if(err) {
                        console.error(err)

                        if(client) {
                            release(client)
                        }

                        return done("db_err")
                    }

                    release()

                    return done(null, result.rows)
                }
            )
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
        from_moment = moment(date, "YYYY-MM-DD HH:mm:ssZ", true)
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
        return from_moment.format("YYYY-MM-DD HH:mm:ssZ")
    }

    if(to === "native") {
        return from_moment.toDate()
    }
}
