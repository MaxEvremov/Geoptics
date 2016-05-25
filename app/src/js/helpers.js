"use strict"

import $ from "jquery"
import _ from "lodash"

// const SERVER_URL = "http://10.66.80.132:7777"

export let makeAJAXRequest = (url, method, data, done) => {
	if (_.isFunction(data) && _.isUndefined(done)) {
		done = data
		data = {}
	}

	let params = {
		// url: SERVER_URL + url,
        url: url,
		type: method,
		dataType: "JSON",
		contentType: "application/json",
		success: (answer, code) => {
			let err = answer.err
			let result = answer.result

			if (err) {
				return done(err)
			}

			return done(null, result)
		},
        xhrFields: {
            withCredentials: true
        },
		error: () => {
			return done("network_err")
		}
	}

	if (method !== "get") {
		params.data = JSON.stringify(data)
	}

	$.ajax(params)
}
