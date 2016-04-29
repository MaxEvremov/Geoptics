"use strict"

import $ from "jquery"
import _ from "lodash"

export let makeAJAXRequest = (url, method, data, done) => {
    if(_.isFunction(data) && _.isUndefined(done)) {
        done = data
        data = {}
    }

    let params = {
        url: url,
        type: method,
        dataType: "JSON",
        contentType: "application/json",
        success: (answer, code) => {
            let err = answer.err
            let result = answer.result

            if(err) {
                return done(err)
            }

            return done(null, result)
        },
        error: () => {
            return done("network_err")
        }
    }

    if(method !== "get") {
        params.data = JSON.stringify(data)
    }

    $.ajax(params)
}
