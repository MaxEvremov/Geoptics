"use strict"

var AVG_Y_AXIS = "Pressure"
var HOUR = 60 * 60 * 1000

class Plot {
    constructor(params) {
        this.type = params.type || "point"
        this.date = params.date || null
        this.date_start = params.date_start || null
        this.date_end = params.date_end || null
        this.data = params.data || [[0, 0]]
//        this.color = randomColor({
//            luminosity: "dark",
//            hue: "random",
//            format: "rgb"
//        })       
		this.color = helpers.randomColor2()
    }

    get description() {
        if(this.type === "point") {
            return helpers.formatDate(this.date)
        }

        if(this.type === "avg") {
            return `Усреднение за период от ${helpers.formatDate(this.date_start)} до ${helpers.formatDate(this.date_end)}`
        }
    }

    get fill_color() {
        return this.color
            .replace("rgb", "rgba")
            .replace(")", ", 0.2)")
    }

    getAnnotation(idx) {
        if(this.type === "point") {
            return {
                series: AVG_Y_AXIS,
                x: this.date,
                shortText: idx + 1,
                text: this.description,
                cssClass: `dygraph-annotation-plot-${idx + 1}`,
                color: this.color
            }
        }

        if(this.type === "avg") {
            return {
                series: AVG_Y_AXIS,
                x: this.date_start,
                shortText: idx + 1,
                text: this.description,
                cssClass: `dygraph-annotation-plot-${idx + 1}`,
                color: this.color
            }
        }
    }

    downloadLAS() {
        var date = encodeURIComponent(helpers.formatDate(this.date))
        window.open(`/api/app/plots/las?date=${date}`)
    }

    showOnPlot(plot) {
        var x = this.date

        var file = plot.file_

        var min_date = file[0][0].valueOf()
        var max_date = file[file.length - 1][0].valueOf()

        var zoom_left = (x - HOUR) < min_date
            ? min_date
            : x - HOUR

        var zoom_right = (zoom_left + 2 * HOUR) > max_date
            ? max_date
            : zoom_left + 2 * HOUR

        plot.updateOptions({
            dateWindow: [zoom_left, zoom_right]
        })
    }
}
