"use strict"

class ReferencePoint {
    constructor(params) {
        if(_.isUndefined(params)) {
            params = {}
        }

        this.temp = ko.observable(params.temp || null)
        this.length = ko.observable(params.length || null)
    }
}
