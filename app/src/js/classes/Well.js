"use strict"

class Well {
    constructor(params) {
        this.id = params.id || null
        this.name = params.name || null
        this.well_xml_id = params.well_xml_id || null
    }

    setReferencePoint(params, done) {
        helpers.makeAJAXRequest(
            "/api/app/plots/reference_point",
            "post",
            {
                date: params.date,
                temp: params.temp,
                length: params.length,
                well_id: this.id
            },
            done
        )
    }

    getReferencePoint(done) {
        helpers.makeAJAXRequest(
            "/api/app/plots/reference_point",
            "get",
            {
                well_id: this.id
            },
            function(err, result) {
                if(err) {
                    return done(err)
                }

                return done(null, new ReferencePoint(result))
            }
        )
    }

    getMinLength(done) {
        helpers.makeAJAXRequest(
            "/api/app/plots/min_length",
            "get",
            {
                well_id: this.id
            },
            done
        )
    }

    setMinLength(params, done) {
        helpers.makeAJAXRequest(
            "/api/app/plots/min_length",
            "post",
            {
                min_length: params.min_length,
                well_id: this.id
            },
            done
        )
    }

    addOrUpdateTimelineEvent(params, done) {
        helpers.makeAJAXRequest(
            "/api/app/plots/timeline_event",
            "post",
            {
                short_text: params.short_text,
                description: params.description,
                date: params.date,
                well_id: this.id,
                id: params.id
            },
            done
        )
    }

    getTimelineEvents(done) {
        helpers.makeAJAXRequest(
            "/api/app/plots/timeline_events",
            "post",
            {
                well_id: this.id
            },
            done
        )
    }

    removeTimelineEvent(params, done) {
        helpers.makeAJAXRequest(
            "/api/app/plots/timeline_event",
            "delete",
            {
                well_id: this.id,
                id: params.id
            },
            done
        )
    }

    addOrUpdateLengthAnnotation(params, done) {
        helpers.makeAJAXRequest(
            "/api/app/plots/length_annotation",
            "post",
            {
                short_text: params.short_text,
                description: params.description,
                length: params.length,
                well_id: this.id,
                id: params.id
            },
            done
        )
    }

    removeLengthAnnotation(params, done) {
        helpers.makeAJAXRequest(
            "/api/app/plots/length_annotation",
            "delete",
            {
                well_id: this.id,
                id: params.id
            },
            done
        )
    }

    getLengthAnnotations(done) {
        helpers.makeAJAXRequest(
            "/api/app/plots/length_annotations",
            "post",
            {
                well_id: this.id
            },
            done
        )
    }

    getTempMeasurements(params, done) {
        helpers.makeAJAXRequest(
            "/api/app/plots/measurements",
            "post",
            {
                plots: params.plots,
                well_id: this.id,
                ignore_min_length: params.ignore_min_length
            },
            done
        )
    }

    init(done) {
        helpers.makeAJAXRequest(
            "/api/app/plots/init",
            "post",
            {
                well_id: this.id
            },
            function(err, result) {
                if(err) {
                    return done(err)
                }

                for(var i = 0; i < result.length; i++) {
                    result[i][0] = helpers.convertDate(result[i][0], "iso8601", "native")
                }

                return done(null, result)
            }
        )
    }

    getPressureMeasurements(params, done) {
        helpers.makeAJAXRequest(
            "/api/app/plots/p_measurements",
            "post",
            {
                well_id: this.id,
                date_start: params.date_start,
                date_end: params.date_end
            },
            function(err, result) {
                if(err) {
                    return done(err)
                }

                for(var i = 0; i < result.length; i++) {
                    result[i][0] = helpers.convertDate(result[i][0], "iso8601", "native")
                }

                return done(null, result)
            }
        )
    }
}
