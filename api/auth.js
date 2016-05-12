"use strict"

// imports

const express = require("express")
const validator = require("validator")
const passport = require("passport")

const helpers = require("./helpers")

const User = require("../models/User")

// main

let generateAPI = (roles) => {
    let api = express()

    api.get(
        "/init",
        (req, res, next) => {
            res.json({
                err: null,
                result: req.user ? req.user : null
            })
        }
    )

    api.post(
        "/login",
        helpers.validateRequestData({
            email: true,
            password: true
        }),
        (req, res, next) => {
            passport.authenticate("local", (err, user, info) => {
                if(err) {
                    console.error(err)
                    return res.json({
                        err: "db_err"
                    })
                }

                if(!user) {
                    return res.json({
                        err: "not_found"
                    })
                }

                if(roles.indexOf(user.role) === -1 && user.role !== "owner") {
                    return res.json({
                        err: "not_found"
                    })
                }

                req.login(user, (err) => {
                    if(err) {
                        return res.json({
                            err: "db_err"
                        })
                    }

                    return res.json({
                        err: null,
                        result: {
                            email: user.email,
                            name: user.name
                        }
                    })
                })
            })(req, res, next)
        }
    )

    api.post(
        "/logout",
        helpers.validatePermissions(roles),
        (req, res, next) => {
            req.logout()
            res.json({
                err: null
            })
        }
    )

    return api
}

// exports

module.exports = {
    generateAPI: generateAPI
}
