"use strict"

window.ReferencePoint = (function() {
    var self = function(params) {
        if(_.isUndefined(params)) {
            params = {}
        }

        this.temp = ko.observable(params.temp || null)
        this.length = ko.observable(params.length || null)
    }

    return self
})()
