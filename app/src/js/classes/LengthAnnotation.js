"use strict"

class LengthAnnotation {
    constructor(params) {
        if(!params) {
            params = {}
        }

        this.id = params.id || null
        this.well_id = params.well_id || null
        this.short_text = ko.observable(params.short_text || null)
        this.length = ko.observable(params.length || null)
        this.description = ko.observable(params.description || null)
    }

    getAnnotation(series) {
        return {
            series: series,
            x: this.length(),
            shortText: this.short_text(),
            text: this.description(),
            attachAtBottom: true,
            cssClass: "dygraph-annotation-length"
        }
    }
}
