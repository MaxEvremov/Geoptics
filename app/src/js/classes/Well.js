"use strict"

class Well {
    constructor(params) {
        if(_.isUndefined(params)) {
            params = {}
        }

        this.id = params.id || null
        this.name = params.name || null
        this.well_xml_id = params.well_xml_id || null
        this.has_p_sensor = _.isUndefined(params.has_p_sensor)
            ? false
            : params.has_p_sensor
        this.has_t_sensor = _.isUndefined(params.has_t_sensor)
            ? false
            : params.has_t_sensor
    }

    setReferencePoint(params, done) {
        helpers.makeAJAXRequest(
            "/api/app/wells/reference_point",
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
            "/api/app/wells/reference_point",
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

    deleteReferencePoint(done) {
        helpers.makeAJAXRequest(
            "/api/app/wells/reference_point",
            "delete",
            {
                well_id: this.id
            },
            done
        )
    }

    getMinLength(done) {
        helpers.makeAJAXRequest(
            "/api/app/wells/min_length",
            "get",
            {
                well_id: this.id
            },
            done
        )
    }

    setMinLength(params, done) {
        helpers.makeAJAXRequest(
            "/api/app/wells/min_length",
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
        var url = "/api/app/plots/length_annotation"

        if(params.id) {
            url += `/${params.id}`
        }

        helpers.makeAJAXRequest(
            url,
            "post",
            {
                y1: params.y1,
                y2: params.y2,
                name: params.name,
                css_class: params.css_class,
                well_id: this.id
            },
            done
        )
    }

    removeLengthAnnotation(params, done) {
        helpers.makeAJAXRequest(
            `/api/app/plots/length_annotation/${params.id}`,
            "delete",
            {
                well_id: this.id
            },
            done
        )
    }

    getLengthAnnotations(done) {
        helpers.makeAJAXRequest(
            "/api/app/plots/length_annotation",
            "get",
            {
                well_id: this.id
            },
            done
        )
    }

    init(done) {
        var self = this

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
            "get",
            {
                well_id: this.id,
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
