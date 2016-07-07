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
        this.well_id = params.well_id || null
    }

    load(params, done) {
        var self = this

        if(_.isFunction(params)) {
            done = params
            params = {}
        }

        var ignore_min_length = _.isUndefined(params.ignore_min_length)
            ? false
            : params.ignore_min_length

        helpers.makeAJAXRequest(
            "/api/app/plots/t_measurements",
            "post",
            {
                plot: {
                    type: this.type,
                    date: this.date,
                    date_start: this.date_start,
                    date_end: this.date_end
                },
                well_id: this.well_id,
                ignore_min_length: ignore_min_length
            },
            function(err, result) {
                if(err) {
                    return done(err)
                }

                if(self.type === "point") {
                    self.date = result.date
                }

                self.data = result.data
                return done(null, result)
            }
        )
    }

    static get COLORS() {
        return [
            "rgb(221,75,57)",
            "rgb(243,156,18)",
            "rgb(0,115,183)",
            "rgb(0,166,90)",
            "rgb(0,31,63)",
            "rgb(61,153,112)",
            "rgb(1,255,112)",
            "rgb(0,192,239)",
            "rgb(255,133,27)",
            "rgb(240,18,190)",
            "rgb(60,141,188)",
            "rgb(96,92,168)",
            "rgb(216,27,96)"
        ]
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
            well_id: this.well_id
        })

        window.open(`/api/app/plots/las?${query}`)
    }

    showOnPlot(plot) {
        var zoom_left
        var zoom_right

        var file = plot.file_

        var min_date = helpers.convertDate(file[0][0], "native", "ms")
        var max_date = helpers.convertDate(file[file.length - 1][0], "native", "ms")


        if(this.type === "point") {
            var x = helpers.convertDate(this.date, "iso8601", "ms")

            zoom_left = (x - HOUR) < min_date
                ? min_date
                : x - HOUR

            zoom_right = (zoom_left + 2 * HOUR) > max_date
                ? max_date
                : zoom_left + 2 * HOUR
        }

        if(this.type === "avg") {
            var date_start = helpers.convertDate(this.date_start, "iso8601", "ms")
            var date_end = helpers.convertDate(this.date_end, "iso8601", "ms")

            zoom_left = (date_start - HOUR) < min_date
                ? min_date
                : date_start - HOUR

            zoom_right = (date_end + HOUR) > max_date
                ? max_date
                : date_end + HOUR
        }

        plot.updateOptions({
            dateWindow: [zoom_left, zoom_right],
            isZoomedIgnoreProgrammaticZoom: false
        })
    }

    static downloadPlotsAsLAS(plots, well_id) {
        plots = ko.mapping.toJS(plots)
        var param_plots = []

        plots.forEach(function(plot) {
            if(plot.type === "avg") {
                param_plots.push(_.pick(plot, ["type", "date_start", "date_end"]))
            }

            if(plot.type === "point") {
                param_plots.push(_.pick(plot, ["type", "date"]))
            }
        })

        var query = $.param({
            plots: param_plots,
            well_id: well_id
        })

        window.open(`/api/app/plots/las_multiple?${query}`)
    }
}
