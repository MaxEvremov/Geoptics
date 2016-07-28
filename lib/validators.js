"use strict"

const moment = require("moment")

module.exports.isIDValid = module.exports.isNaturalNumberValid = (id) => {
    id = parseInt(id)
    return Number.isInteger(id) && id > 0
}

module.exports.isNumberValid = (number) => {
    number = parseFloat(number)
    return isFinite(number)
}

module.exports.isPlotValid = (plot) => {
    if(!plot.type) {
        return false
    }

    if(plot.type === "avg"
    && (!plot.date_start || !plot.date_end)) {
        return false
    }

    if(plot.type === "point" && !plot.date) {
        return false
    }

    return true
}

module.exports.isISO8601DateValid = (date) => moment(date, "YYYY-MM-DD HH:mm:ssZ", true).isValid()
