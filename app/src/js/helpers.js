"use strict"

var SERVER_URL = ""

if(window.location.hostname == "10.66.80.203") {
    SERVER_URL = "http://10.66.80.132:7778"
}

window.helpers = {}

helpers.makeAJAXRequest = function(url, method, data, done) {
	if(_.isFunction(data) && _.isUndefined(done)) {
		done = data
		data = {}
	}

	var params = {
		url: SERVER_URL + url,
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

	if(method === "get") {
        params.url = params.url + "?" + $.param(data)
	}
    else {
        params.data = JSON.stringify(data)
    }

	$.ajax(params)
}

helpers.createCSSClass = function (name, color) {
	var style = document.createElement("style")
	style.type = "text/css"
	style.innerHTML = name + " { background-color: " + color + " !important; "
	document.getElementsByTagName("head")[0].appendChild(style)
}

helpers.convertDate = function(date, from, to) {
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

    if(from === "jmask") {
        from_moment = moment(date, "DD/MM/YY HH:mm", true)
    }

    // validate

    if(!from_moment.isValid()) {
        throw new Error(date + " is not a valid date for " + from + " format")
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

    if(to === "jmask") {
        return from_moment.format("DD/MM/YY HH:mm")
    }
}

helpers.downloadFileUsingAJAX = function(url, data) {
    var form = $("<form></form>").attr("action", url).attr("method", "post")

    for(var key in data) {
        form.append($("<input></input>").attr("type", "hidden").attr("name", key).attr("value", JSON.stringify(data[key])))
    }

    form.appendTo("body").submit().remove()
}
