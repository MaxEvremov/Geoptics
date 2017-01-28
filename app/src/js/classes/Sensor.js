"use strict"

window.Sensor = (function() {
    var self = function(params) {
        if(!params) {
            params = {}
        }

        this.id = params.id || null
        this.well_id = params.well_id || null
        this.name = params.name || ""
    }

    return self
})()

window.TimeSensor = (function() {
    var self = function(params) {
        window.Sensor.call(this, params)

        this.is_active = ko.observable(_.isUndefined(params.is_active)
            ? true
            : params.is_active
        )
    }

    self.prototype.getMeasurements = function(params, done) {
        helpers.makeAJAXRequest(
            "/api/app/plots/time_measurements",
            "get",
            {
                sensor_id: this.id,
                date_start: params.date_start,
                date_end: params.date_end
            },
            function(err, result) {
                if(err) {
                    return done(err)
                }

                for(var i = 0; i < result.data.length; i++) {
                    result.data[i][0] = helpers.convertDate(result.data[i][0], "iso8601", "native")
                }

                return done(null, result)
            }
        )
    }

    return self
})()
