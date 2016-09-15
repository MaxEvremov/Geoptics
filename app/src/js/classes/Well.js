"use strict"

class Well {
    constructor(params) {
        if(_.isUndefined(params)) {
            params = {}
        }

        this.id = params.id || null
        this.name = params.name || null
        this.well_xml_id = params.well_xml_id || null

        this.date_range = params.date_range || []
        this.depth_sensors = ko.observableArray(params.depth_sensors || [])
        this.time_sensors = ko.observableArray(params.time_sensors || [])

        var self = this

        this.active_time_sensors = ko.computed(function() {
            return self.time_sensors().filter(function(s) {
                return s.is_active()
            })
        })

        this.has_active_time_sensors = ko.computed(function() {
            return self.active_time_sensors().length !== 0
        })
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
                ts: params.ts,
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
                texture_id: params.texture_id,
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
            "/api/app/wells/init",
            "get",
            {
                well_id: this.id
            },
            function(err, result) {
                if(err) {
                    return done(err)
                }

                self.date_range = result.date_range.map(function(date) {
                    return helpers.convertDate(date, "iso8601", "native")
                })

                self.depth_sensors.removeAll()
                result.depth_sensors.forEach(function(s) {
                    self.depth_sensors.push(s)
                })

                self.time_sensors.removeAll()
                result.time_sensors.forEach(function(s) {
                    self.time_sensors.push(new TimeSensor(s))
                })

                return done(null)
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

    loadTimeMeasurements(params, done) {
        var active_time_sensors = this.time_sensors().filter(function(s) {
            return s.is_active()
        })

        var ids = active_time_sensors.map(function(s) {
            return s.id
        })

        if(ids.length === 0) {
            return done(null)
        }

        helpers.makeAJAXRequest(
            "/api/app/wells/time_measurements",
            "get",
            {
                well_id: this.id,
                sensor_ids: ids,
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
