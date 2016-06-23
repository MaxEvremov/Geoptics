"use strict"

class ReferencePoint {
    constructor(params) {
        this.date = ko.observable(params.date || null)
        this.temp = ko.observable(params.temp || null)
        this.length = ko.observable(params.length || null)
    }
}
