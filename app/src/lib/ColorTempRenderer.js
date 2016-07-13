"use strict"

class ColorTempRenderer {
    constructor(params) {
        if(!params) {
            params = {}
        }

        this.element = params.element

        var canvas = document.createElement("canvas")
        this.element.appendChild(canvas)

        this._canvas = canvas

        this.plots = params.plots || []

        if(this.plots.length > 0) {
            this._drawPlots()
        }
    }

    _drawPlots() {
        var ctx = this._canvas.getContext("2d")

        var height = this.plots[0].length
        var width = this.plots.length

        this._canvas.height = height
        this._canvas.width = width

        var min_temp = _.min(_.map(this.plots, function(plot) {
            return _.min(plot)
        }))

        var max_temp = _.max(_.map(this.plots, function(plot) {
            return _.max(plot)
        }))

        var diff = max_temp - min_temp

        for(var i = 0; i < width; i++) {
            for(var j = 0; j < height; j++) {
                var t = this.plots[i][j]
                var coeff = (max_temp - t) / diff

                ctx.fillStyle = ColorTempRenderer._getColorFromScale(coeff)
                ctx.fillRect(i, j, 1, 1)
            }
        }

        this._canvas.style.width = `${this.element.clientWidth}px`
        this._canvas.style.height = `${this.element.clientHeight}px`
    }

    update(plots) {
        this.plots = plots
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
