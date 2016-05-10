"use strict"

// imports

const _ = require("lodash")

// main

module.exports = {
    validateRequestData: fields => (req, res, next) => {
        let is_valid = true

        _.forOwn(fields, (value, key) => {
            if(value === true) {
                if(!req.body[key]) {
                    res.json({
                        err: "no_required_field",
                        field: key
                    })

                    is_valid = false
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

                    is_valid = false
                    return false
                }
            }
        })

        if(is_valid) {
            return next()
        }
    }
}
