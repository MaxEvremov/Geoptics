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
		this.color = ko.observable(params.color || "rgb(0, 0, 0)")
    }

    static get COLORS() {
        return ["rgb(0, 0, 0)", "rgb(1, 0, 103)", "rgb(213, 255, 0)", "rgb(255, 0, 86)", "rgb(158, 0, 142)", "rgb(14, 76, 161)", "rgb(255, 229, 2)", "rgb(0, 95, 57)", "rgb(0, 255, 0)", "rgb(149, 0, 58)", "rgb(255, 147, 126)", "rgb(164, 36, 0)", "rgb(0, 21, 68)", "rgb(145, 208, 203)", "rgb(98, 14, 0)", "rgb(107, 104, 130)", "rgb(0, 0, 255)", "rgb(0, 125, 181)", "rgb(106, 130, 108)", "rgb(0, 174, 126)", "rgb(194, 140, 159)", "rgb(190, 153, 112)", "rgb(0, 143, 156)", "rgb(95, 173, 78)", "rgb(255, 0, 0)", "rgb(255, 0, 246)", "rgb(255, 2, 157)", "rgb(104, 61, 59)", "rgb(255, 116, 163)", "rgb(150, 138, 232)", "rgb(152, 255, 82)", "rgb(167, 87, 64)", "rgb(1, 255, 254)", "rgb(255, 238, 232)", "rgb(254, 137, 0)", "rgb(189, 198, 255)", "rgb(1, 208, 255)", "rgb(187, 136, 0)", "rgb(117, 68, 177)", "rgb(165, 255, 210)", "rgb(255, 166, 254)", "rgb(119, 77, 0)", "rgb(122, 71, 130)", "rgb(38, 52, 0)", "rgb(0, 71, 84)", "rgb(67, 0, 44)", "rgb(181, 0, 255)", "rgb(255, 177, 103)", "rgb(255, 219, 102)", "rgb(144, 251, 146)", "rgb(126, 45, 210)", "rgb(189, 211, 147)", "rgb(229, 111, 254)", "rgb(222, 255, 116)", "rgb(0, 255, 120)", "rgb(0, 155, 255)", "rgb(0, 100, 1)", "rgb(0, 118, 255)", "rgb(133, 169, 0)", "rgb(0, 185, 23)", "rgb(120, 130, 49)", "rgb(0, 255, 198)", "rgb(255, 110, 65)", "rgb(232, 94, 190)"]
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
        return this.color()
            .replace("rgb", "rgba")
            .replace(")", ", 0.2)")
    }

    getAnnotation(idx) {
        if(this.type === "point") {
            return {
                series: AVG_Y_AXIS,
                x: helpers.convertDate(this.date, "iso8601", "ms"),
                shortText: idx + 1,
                text: this.description,
                cssClass: `dygraph-annotation-plot-${idx + 1}`,
                color: this.color
            }
        }

        if(this.type === "avg") {
            return {
                series: AVG_Y_AXIS,
                x: helpers.convertDate(this.date_start, "iso8601", "ms"),
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
                date: this.date,
                date_start: this.date_start,
                date_end: this.date_end
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
