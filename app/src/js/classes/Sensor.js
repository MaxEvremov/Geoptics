"use strict"

class Sensor {
    constructor(params) {
        if(!params) {
            params = {}
        }

        this.id = params.id || null
        this.well_id = params.well_id || null
        this.name = params.name || ""
    }
}

class TimeSensor extends Sensor {
    constructor(params) {
        super(params)

        this.is_active = ko.observable(_.isUndefined(params.is_active)
            ? true
            : params.is_active
        )
    }

    getMeasurements(params, done) {
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
}
