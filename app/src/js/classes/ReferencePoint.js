"use strict"

class ReferencePoint {
    constructor(params) {
        this.temp = ko.observable(params.temp || null)
        this.length = ko.observable(params.length || null)
    }
}
