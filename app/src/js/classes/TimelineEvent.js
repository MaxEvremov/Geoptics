"use strict"

class TimelineEvent {
    constructor(params) {
        if(!params) {
            params = {}
        }

        this.id = params.id || null
        this.well_id = params.well_id || null
        this.short_text = ko.observable(params.short_text || null)
        this.date = params.date || null
        this.description = ko.observable(params.description || null)

        this.jmask_date = ko.observable(params.date
            ? helpers.convertDate(params.date, "iso8601", "jmask")
            : null
        )
    }

    getAnnotation() {
        return {
            series: AVG_Y_AXIS,
            x: helpers.convertDate(this.date, "iso8601", "ms"),
            shortText: this.short_text(),
            text: this.description(),
            attachAtBottom: true,
            cssClass: "dygraph-annotation-event"
        }
    }
}
