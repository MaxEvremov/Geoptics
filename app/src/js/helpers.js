"use strict"

import $ from "jquery"

export let makeAJAXRequest = (url, method, data, done) => {
    $.ajax({
        url: url,
        type: method,
        data: JSON.stringify(data),
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
    })
}
