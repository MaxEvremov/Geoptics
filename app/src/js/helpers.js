"use strict"

window.helpers = {}

helpers.makeAJAXRequest = function(url, method, data, done) {
	if (_.isFunction(data) && _.isUndefined(done)) {
		done = data
		data = {}
	}

	var params = {
        url: url,
		type: method,
		dataType: "JSON",
		contentType: "application/json",
		success: function(answer, code) {
			var err = answer.err
			var result = answer.result

			if (err) {
				return done(err)
			}

			return done(null, result)
		},
        xhrFields: {
            withCredentials: true
        },
		error: function() {
			return done("network_err")
		}
	}

	if (method !== "get") {
		params.data = JSON.stringify(data)
	}

	$.ajax(params)
}

helpers.formatDate = function(date) {
    return moment(date).format("YYYY-MM-DD HH:mm:ssZ")
}

helpers.createCSSClass = function(name, color) {
    var style = document.createElement("style")
    style.type = "text/css"
    style.innerHTML = `${name} { color: ${color} !important; }`
    document.getElementsByTagName("head")[0].appendChild(style)
}
