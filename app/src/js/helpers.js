"use strict"

var SERVER_URL = ""

if(window.location.hostname == "10.66.80.203") {
    SERVER_URL = "http://10.66.80.132:7778"
}

window.helpers = {}
helpers.makeAJAXRequest = function (url, method, data, done) {
	if (_.isFunction(data) && _.isUndefined(done)) {
		done = data
		data = {}
	}

	var params = {
		url: SERVER_URL + url,
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

helpers.formatDate = function (date) {
	return moment(date).format('DD/MM/YY hh:mm')
}

helpers.formatDateHTML = function (date) {
	return "<span class='formatDate'>" + moment(date).format('DD/MM/YY hh:mm') + "</span>"
}

helpers.createCSSClass = function (name, color) {
	var style = document.createElement("style")
	style.type = "text/css"
	style.innerHTML = `${name} { background-color: ${color} !important; }`
	document.getElementsByTagName("head")[0].appendChild(style)
}

helpers.randomColor2 = function () {
	var curcolor = [
        "#dd4b39",
        "#f39c12",
        "#0073b7",
        "#00a65a",
        "#001f3f",
        "#3d9970",
        "#01ff70",
        "#00c0ef",
        "#ff851b",
        "#f012be",
        "#3c8dbc",
        "#605ca8",
        "#d81b60"][m_site.plots.selected_plots().length]

	return helpers.Hex2RGB(curcolor)
}

helpers.Hex2RGB = function(hex) {
	if (hex.lastIndexOf('#') > -1) {
		hex = hex.replace(/#/, '0x');
	} else {
		hex = '0x' + hex;
	}
	var r = hex >> 16;
	var g = (hex & 0x00FF00) >> 8;
	var b = hex & 0x0000FF;
	return `rgb(${r}, ${g}, ${b})`;
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
