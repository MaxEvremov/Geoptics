"use strict"

window.LengthAnnotation = (function() {
    var self = function(params) {
        if(!params) {
            params = {}
        }

        this.id = params.id || null
        this.well_id = params.well_id || null

        this.y1 = ko.observable(params.y1 || null)
        this.y2 = ko.observable(params.y2 || null)
        this.texture_id = ko.observable(params.texture_id || null)
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

        this.texture_img = ko.computed(function() {
            var id = self.texture_id()

            if(!id) {
                return null
            }

            var texture = _.find(m_site.state.textures(), function(texture) {
                return texture.id === id
            })

            if(!texture) {
                return null
            }

            return "url(/data/" + texture.img + ")"
        })
        this.style["background-image"] = this.texture_img

        this.texture_name = ko.computed(function() {
            var id = self.texture_id()

            if(!id) {
                return null
            }

            var texture = _.find(m_site.state.textures(), function(texture) {
                return texture.id === id
            })

            if(!texture) {
                return null
            }

            return texture.name
        })
    }

    return self
})()
