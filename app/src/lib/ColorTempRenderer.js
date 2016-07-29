"use strict"

class ColorTempRenderer {
    constructor(params) {
        var prev_plot_idx = null

        var self = this

        if(!params) {
            params = {}
        }

        this.element = params.element
        this.plots = params.plots || []
        this.length_scale = params.length_scale

        this.selectedPlotCallback = params.selectedPlotCallback || function() {}

        // create elements

        var canvas = document.createElement("canvas")
        this.element.appendChild(canvas)
        this._canvas = canvas

        var legend_name = document.createElement("div")
        legend_name.className = "color-renderer-legend-name"
        legend_name.style.visibility = "hidden"
        this.element.appendChild(legend_name)
        this._legend_name = legend_name

        var legend_length = document.createElement("div")
        legend_length.className = "color-renderer-legend-length"
        legend_length.style.visibility = "hidden"
        this.element.appendChild(legend_length)
        this._legend_length = legend_length

        var legend_value = document.createElement("div")
        legend_value.className = "color-renderer-legend-value"
        legend_value.style.visibility = "hidden"
        this.element.appendChild(legend_value)
        this._legend_value = legend_value

        // add event listeners

        this.element.addEventListener("mouseenter", function(e) {
            self._legend_name.style.visibility = "visible"
            self._legend_length.style.visibility = "visible"
            self._legend_value.style.visibility = "visible"
        })

        this.element.addEventListener("mouseleave", function(e) {
            self._legend_name.style.visibility = "hidden"
            self._legend_length.style.visibility = "hidden"
            self._legend_value.style.visibility = "hidden"

            self.selectedPlotCallback(null)
        })

        this.element.addEventListener("mousemove", function(e) {
            var width = ColorTempRenderer._parsePxVal(self._canvas.style.width)
            var height = ColorTempRenderer._parsePxVal(self._canvas.style.height)

            var rel_x = e.layerX / width
            var rel_y = e.layerY / height

            var plot_idx = Math.floor(rel_x * self.plots.length)
            var value_idx = Math.floor(rel_y * self.length_scale.length)

            self._legend_name.innerText = self.plots[plot_idx].name

            if(value_idx < self.length_scale.length) {
                self._legend_length.innerText = `${self.length_scale[value_idx]} м`

                self._legend_value.innerText = self.plots[plot_idx].data[value_idx].toFixed(3)
            }

            if(prev_plot_idx !== plot_idx) {
                self.selectedPlotCallback(plot_idx)
                prev_plot_idx = plot_idx
            }
        })

        // draw plots

        if(this.plots.length > 0) {
            this._drawPlots()
        }
    }

    _drawPlots() {
        if(this.plots.length === 0) {
            return
        }

        var ctx = this._canvas.getContext("2d")

        var height = this.length_scale.length
        var width = this.plots.length

        this._canvas.height = height
        this._canvas.width = width

        var min_temp = _.min(_.map(this.plots, function(plot) {
            return _.min(plot.data)
        }))

        var max_temp = _.max(_.map(this.plots, function(plot) {
            return _.max(plot.data)
        }))

        var diff = max_temp - min_temp

        for(var i = 0; i < width; i++) {
            for(var j = 0; j < height; j++) {
                var t = this.plots[i].data[j]
                var coeff = (t - min_temp) / diff

                ctx.fillStyle = ColorTempRenderer._getColorFromScale(coeff)
                ctx.fillRect(i, j, 1, 1)
            }
        }

        this._canvas.style.width = `${this.element.clientWidth}px`
        this._canvas.style.height = `${this.element.clientHeight}px`
    }

    update(plots, length_scale) {
        this.plots = plots
        this.length_scale = length_scale

        this._drawPlots()
    }

    clear() {
        var ctx = this._canvas.getContext("2d")

        this.plots = []
        ctx.clearRect(0, 0, this._canvas.width, this._canvas.height)
    }
}

ColorTempRenderer._COLOR_SCALE = [
    [0, [0, 0, 131]],
    [0.125, [0, 60, 170]],
    [0.375, [5, 255, 255]],
    [0.625, [255, 255, 0]],
    [0.875, [250, 0, 0]],
    [1, [128, 0, 0]]
]

ColorTempRenderer._getColorFromScale = function(coeff) {
    var scale = this._COLOR_SCALE

    if(coeff === 0) {
        var r = scale[0][1][0]
        var g = scale[0][1][1]
        var b = scale[0][1][2]

        return `rgb(${r}, ${g}, ${b})`
    }

    if(coeff === 1) {
        var last_i = scale.length - 1

        var r = scale[last_i][1][0]
        var g = scale[last_i][1][1]
        var b = scale[last_i][1][2]

        return `rgb(${r}, ${g}, ${b})`
    }

    for(var k = 0; k < scale.length; k++) {
        var cur_s = scale[k]
        var next_s = scale[k + 1]

        if(coeff >= cur_s[0] && coeff < next_s[0]) {
            var rel_coeff = 1 - (next_s[0] - coeff) / (next_s[0] - cur_s[0])

            var r = Math.round(cur_s[1][0] + (next_s[1][0] - cur_s[1][0]) * rel_coeff)
            var g = Math.round(cur_s[1][1] + (next_s[1][1] - cur_s[1][1]) * rel_coeff)
            var b = Math.round(cur_s[1][2] + (next_s[1][2] - cur_s[1][2]) * rel_coeff)

            return `rgb(${r}, ${g}, ${b})`
        }
    }
}

ColorTempRenderer._parsePxVal = function(value) {
    value = value.replace("px", "")
    return parseFloat(value)
}
