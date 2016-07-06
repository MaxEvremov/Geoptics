"use strict"

class LengthAnnotation {
    constructor(params) {
        if(!params) {
            params = {}
        }

        this.id = params.id || null
        this.well_id = params.well_id || null

        this.y1 = ko.observable(params.y1 || null)
        this.y2 = ko.observable(params.y2 || null)
        this.css_class = ko.observable(params.css_class || null)
        this.name = ko.observable(params.name || null)

        var self = this

        this.style = {}
        this.style.top = ko.computed(function() {
            var x_range = m_site.plots.plot_main_xAxisRange()

            return (self.y1() - x_range[1]) / (x_range[0] - x_range[1]) * 100 + "%"
        })
        this.style.height = ko.computed(function() {
            var x_range = m_site.plots.plot_main_xAxisRange()

            return ((self.y2() - self.y1()) / (x_range[0] - x_range[1])) * 100 + "%"
        })
    }

    get texture_name() {
        var self = this

        return _.find(LengthAnnotation.TEXTURES, function(v) {
            return v.css_class === self.css_class()
        }).name
    }
}

LengthAnnotation.TEXTURES = [
    { name: "Доломит", css_class: "dolomite" },
    { name: "Приток скважной жидкости", css_class: "leftdraught" },
    { name: "Перлитные структуры", css_class: "perlite" }
]
