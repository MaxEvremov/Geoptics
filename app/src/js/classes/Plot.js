"use strict"

var AVG_Y_AXIS = "Pressure"
var HOUR = 60 * 60 * 1000

class Plot {
    constructor(params) {
        var self = this

        this.type = params.type || "point"
        this.sensor_id = params.sensor_id || null
        this.well_id = params.well_id || null
        this.name = ko.observable()

        this.date = params.date || null
        this.date_start = params.date_start || null
        this.date_end = params.date_end || null

        if(params.name) {
            this.name(params.name)
        }
        else {
            this.generateName()
        }

        this.date_ms = params.date
            ? helpers.convertDate(params.date, "iso8601", "ms")
            : null

        this.date_start_ms = params.date_start
            ? helpers.convertDate(params.date_start, "iso8601", "ms")
            : null
        this.date_end_ms = params.date_end
            ? helpers.convertDate(params.date_end, "iso8601", "ms")
            : null

        // это лужа говна
        // сделать нормально, если еще раз попадется на глаза

        if(params.data) {
            this._data = params.data
        }
        else if(params._data) {
            this._data = params._data
        }
        else {
            this._data = [[0, 0]]
        }

		this.color = ko.observable(params.color || "rgb(0, 0, 0)")
        this.offset = params.offset || 0
        this.opacity = params.opacity || 1

        this.is_for_color_plot = params.is_for_color_plot || false

        this.is_loading = ko.observable(false)
    }

    generateName() {
        if(this.type === "point") {
            this.name(helpers.convertDate(this.date, "iso8601", "jmask"))
        }

        if(this.type === "avg") {
            var date_start = helpers.convertDate(this.date_start, "iso8601", "jmask")
            var date_end = helpers.convertDate(this.date_end, "iso8601", "jmask")

            this.name(`Усреднение (${date_start} - ${date_end})`)
        }
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
            "/api/app/plots/depth_measurements",
            "get",
            {
                plot: {
                    type: this.type,
                    date: this.date,
                    date_start: this.date_start,
                    date_end: this.date_end
                },
                sensor_id: this.sensor_id,
                well_id: this.well_id,
                ignore_min_length: ignore_min_length
            },
            function(err, result) {
                if(err) {
                    return done(err)
                }

                if(self.type === "point") {
                    self.date = result.date
                    self.date_ms = helpers.convertDate(self.date, "iso8601", "ms")
                    self.generateName()
                }

                self._data = result.data
                return done(null, result)
            }
        )
    }

    get fill_color() {
        return this.color()
            .replace("rgb", "rgba")
            .replace(")", ", 0.2)")
    }

    get dygraph_color() {
        return this.color()
            .replace("rgb", "rgba")
            .replace(")", `, ${this.opacity})`)
    }

    get data() {
        var self = this
        var data = _.cloneDeep(self._data)
            .sort(function(a, b) {
                if(a[0] > b[0]) {
                    return -1
                }

                if(a[0] < b[0]) {
                    return 1
                }

                return 0
            })

        if(self.offset === 0) {
            return data
        }

        return _.map(data, function(value) {
            value[1] += self.offset
            return value
        })
    }

    getAnnotation(series, idx) {
        if(this.type === "point") {
            return {
                series: series,
                x: this.date_ms,
                shortText: idx + 1,
                text: this.description,
                cssClass: `dygraph-annotation-plot-${idx % Plot.COLORS.length + 1}`,
                color: this.color()
            }
        }

        if(this.type === "avg") {
            return {
                series: series,
                x: this.date_start_ms,
                shortText: idx + 1,
                text: this.description,
                cssClass: `dygraph-annotation-plot-${idx % Plot.COLORS.length + 1}`,
                color: this.color()
            }
        }
    }

    getColorPlotData(i, min_length, max_length) {
        var data = _.cloneDeep(this._data)

        if(_.isNumber(min_length) && _.isNumber(max_length)) {
            if(min_length > max_length) {
                var min = min_length
                min_length = max_length
                max_length = min
            }

            data = _.filter(data, function(v) {
                return v[0] >= min_length && v[0] <= max_length
            })
        }

        data.sort(function(a, b) {
            if(a[0] > b[0]) {
                return 1
            }

            if(a[0] < b[0]) {
                return -1
            }

            return 0
        })

        return {
            name: this.name(),
            data: _.map(data, function(v) {
                return v[1]
            })
        }
    }

    getLengthScale(min_length, max_length) {
        var data = _.cloneDeep(this._data)

        if(_.isNumber(min_length) && _.isNumber(max_length)) {
            if(min_length > max_length) {
                var min = min_length
                min_length = max_length
                max_length = min
            }

            data = _.filter(data, function(v) {
                return v[0] >= min_length && v[0] <= max_length
            })
        }

        data.sort(function(a, b) {
            if(a[0] > b[0]) {
                return 1
            }

            if(a[0] < b[0]) {
                return -1
            }

            return 0
        })

        return _.map(data, function(v) {
            return v[0]
        })
    }

    downloadLAS() {
        var data = _.cloneDeep(this._data)

        data.sort(function(a, b) {
            if(a[0] > b[0]) {
                return 1
            }

            if(a[0] < b[0]) {
                return -1
            }

            return 0
        })

        helpers.downloadFileUsingAJAX(
            "/api/app/las",
            {
                depth: data.map(function(v) {
                    return v[0]
                }),
                plots: [{
                    name: this.description,
                    data: data.map(function(v) {
                        return v[1]
                    })
                }]
            }
        )
    }

    showOnPlot(plot) {
        var zoom_left
        var zoom_right

        var file = plot.file_

        var min_date = helpers.convertDate(file[0][0], "native", "ms")
        var max_date = helpers.convertDate(file[file.length - 1][0], "native", "ms")

        if(this.type === "point") {
            var x = this.date_ms

            zoom_left = (x - HOUR) < min_date
                ? min_date
                : x - HOUR

            zoom_right = (zoom_left + 2 * HOUR) > max_date
                ? max_date
                : zoom_left + 2 * HOUR
        }

        if(this.type === "avg") {
            var date_start = this.date_start_ms
            var date_end = this.date_end_ms

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

        m_site.plots.drawAvgPlot()
    }

    rename() {
        var name = this.name()

        var input = prompt("Переименовать график", name)

        if(!input) {
            return
        }

        this.name(input)
    }

    static downloadPlotsAsLAS(plots) {
        plots.forEach(function(plot) {
            plot._data.sort(function(a, b) {
                if(a[0] > b[0]) {
                    return 1
                }

                if(a[0] < b[0]) {
                    return -1
                }

                return 0
            })
        })

        helpers.downloadFileUsingAJAX(
            "/api/app/las",
            {
                depth: plots[0]._data.map(function(v) {
                    return v[0]
                }),
                plots: plots.map(function(plot) {
                    return {
                        name: plot.description,
                        data: plot._data.map(function(v) {
                            return v[1]
                        })
                    }
                })
            }
        )
    }

    static getPlotsForColorTempRenderer(params, done) {
        helpers.makeAJAXRequest(
            "/api/app/plots/color_temp",
            "get",
            {
                date: params.date,
                number: params.number,
                interval: params.interval,
                well_id: params.well_id,
                sensor_id: params.sensor_id,
                period: params.period
            },
            function(err, result) {
                if(err) {
                    return done(err)
                }

                return done(null, result.task_id)
            }
        )
    }

    toJSON() {
        var self = this

        return _.pick(ko.mapping.toJS(self), [
            "type",
            "sensor_id",
            "well_id",
            "date",
            "date_start",
            "date_end",
            "_data",
            "offset",
            "is_for_color_plot",
            "name"
        ])
    }
}

Plot.COLORS = [
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

Plot.TIME_UNITS = [
    { name: "мин.", unit: "m" },
    { name: "ч.", unit: "h" },
    { name: "дн.", unit: "d" }
]
