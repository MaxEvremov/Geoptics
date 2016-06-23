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
        var query = $.param({
            plot: {
                type: this.type,
                date: helpers.convertDate(this.date, "ms", "iso8601"),
                date_start: helpers.convertDate(this.date_start, "ms", "iso8601"),
                date_end: helpers.convertDate(this.date_end, "ms", "iso8601")
            },
            well_id: m_site.state.current_well.id
        })

        window.open(`/api/app/plots/las?${query}`)
    }

    showOnPlot(plot) {
        var zoom_left
        var zoom_right

        var file = plot.file_

        var min_date = file[0][0].valueOf()
        var max_date = file[file.length - 1][0].valueOf()

        if(this.type === "point") {
            var x = this.date

            zoom_left = (x - HOUR) < min_date
                ? min_date
                : x - HOUR

            zoom_right = (zoom_left + 2 * HOUR) > max_date
                ? max_date
                : zoom_left + 2 * HOUR
        }

        if(this.type === "avg") {
            var date_start = this.date_start
            var date_end = this.date_end

            zoom_left = (date_start - HOUR) < min_date
                ? min_date
                : date_start - HOUR

            zoom_right = (date_end + HOUR) > max_date
                ? max_date
                : date_end + HOUR
        }

        plot.updateOptions({
            dateWindow: [zoom_left, zoom_right]
        })
    }
}
