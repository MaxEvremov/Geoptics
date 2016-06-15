"use strict"

class Well {
    constructor(params) {
        this.id = params.id || null
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

    addLengthAnnotation(params, done) {
        helpers.makeAJAXRequest(
            "/api/app/plots/length_annotation",
            "post",
            {
                short_text: params.short_text,
                description: params.description,
                length: params.length,
                well_id: this.id
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
}
