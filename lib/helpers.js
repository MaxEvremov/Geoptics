"use strict"

// imports

const _ = require("lodash")
const pg = require("pg").native
const moment = require("moment")

const config = require(__base + "config")

// main

module.exports = {}

module.exports.validateRequestData = (fields) => (req, res, next) => {
    let are_all_fields_valid = true

    _.forOwn(fields, (value, key) => {
        if(value === true) {
            if(_.isUndefined(req.body[key])) {
                res.json({
                    err: "no_required_field",
                    field: key
                })

                are_all_fields_valid = false
                return false
            }
        }

        if(_.isFunction(value)) {
            let is_valid = value(req.body[key])

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

module.exports.makePGQuery = (query, done) => {
    console.time(query)
    pg.connect(
        config.postgres_con,
        (err, client, release) => {
            if(err) {
                console.timeEnd(query)
                console.error(err)

                if(client) {
                    release(client)
                }

                return done("db_err")
            }

            client.query(
                query,
                (err, result) => {
                    console.timeEnd(query)
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
