"use strict"


var SERVER_URL = ""
if (window.location.hostname == "10.66.80.203") SERVER_URL = "http://10.66.80.132:7778"//admin@geoptics.com 123456

window.helpers = {}
helpers.makeAJAXRequest = function (url, method, data, done) {
	//export var makeAJAXRequest = function(url, method, data, done) {

	if (_.isFunction(data) && _.isUndefined(done)) {
		done = data
		data = {}
	}

	var params = {

		url: SERVER_URL + url,
		//       url: url,

		type: method,
		dataType: "JSON",
		contentType: "application/json",
		success: function (answer, code) {
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
		error: function () {
			return done("network_err")
		}
	}

	if (method !== "get") {
		params.data = JSON.stringify(data)
	}

	$.ajax(params)

}

helpers.formatDate = function(date) {
    return "<span class='formatDate'>"+moment(date).format('DD/MM/YY hh:mm')+"</span>"
    return moment(date).format('DD/MM/YY hh:mm')
//    return moment(date).format("YYYY-MM-DD HH:mm:ssZ")
}

helpers.createCSSClass = function(name, color) {
    var style = document.createElement("style")
    style.type = "text/css"
    style.innerHTML = `${name} { background-color: ${color} !important; }`
    document.getElementsByTagName("head")[0].appendChild(style)
}

