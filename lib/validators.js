"use strict"

const moment = require("moment")

module.exports.isDateValid = (date) => (!date || moment(date).isValid())
module.exports.isLengthValid = (length) => (!length || !isNaN(parseFloat(length)))
module.exports.isIDValid = (id) => {
    id = parseInt(id)
    return Number.isInteger(id) && id > 0
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
