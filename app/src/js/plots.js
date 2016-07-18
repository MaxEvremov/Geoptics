(function() {

// const

var ZOOM_LOAD_THRESHOLD = 1 * 24 * 60 * 60 * 1000
var DEBOUNCE_DELAY = 500
var POINTS_PER_PLOT = 100
var POLL_INTERVAL = 2 * 1000

// local state variables

var is_inited = false

var plot_data = [[0, 0]]
var plot_labels = ["X", "Y1"]
var plot_colors = []

var plot_avg = null
var plot_main = null

var is_raw_pressure_data

var prev_min_date = null
var prev_max_date = null

// helper methods

var loadPressureData = _.debounce(function(params) {
    vm.is_loading_pressure_data(true)

    vm.current_well.getPressureMeasurements(params, function(err, result) {
        if(err) {
            vm.is_loading_pressure_data(false)
            return console.error(err)
        }

        is_raw_pressure_data = result.is_raw

        plot_avg.updateOptions({
            file: result.data,
            errorBars: !is_raw_pressure_data,
            customBars: !is_raw_pressure_data,
            labelsShowZeroValues: true
        })

        vm.is_loading_pressure_data(false)
        redrawAnnotations()
    })
}, DEBOUNCE_DELAY)

var generateEmptyPoints = function(params) {
    var min_date = params.min_date
    var max_date = params.max_date

    var step = (max_date - min_date) / POINTS_PER_PLOT
    var file = []

    for(var i = 0; i < POINTS_PER_PLOT + 1; i++) {
        file.push([helpers.convertDate(min_date + i * step, "ms", "native"), 0])
    }

    plot_avg.updateOptions({
        file: file,
        errorBars: false,
        customBars: false,
        labelsShowZeroValues: false
    })

    redrawAnnotations()
}

var drawAvgPlot = function() {
    if(vm.is_loading_pressure_data()) {
        return
    }

    // обновление инпутов зума

    var x_range = plot_avg.xAxisRange()
    var y_range = plot_avg.yAxisRange()

    var min_date = x_range[0]
    var max_date = x_range[1]

    vm.min_zoom_x(helpers.convertDate(min_date, "ms", "jmask"))
    vm.max_zoom_x(helpers.convertDate(max_date, "ms", "jmask"))

    vm.min_zoom_y(y_range[0][0])
    vm.max_zoom_y(y_range[0][1])

    // обновление данных в графике давления

    if(!vm.current_well.has_p_sensor) {
        generateEmptyPoints({
            min_date: min_date,
            max_date: max_date
        })

        return
    }

    if(prev_min_date && prev_min_date === min_date
    && prev_max_date && prev_max_date === max_date) {
        return
    }

    prev_min_date = min_date
    prev_max_date = max_date

    loadPressureData({
        date_start: helpers.convertDate(min_date, "ms", "iso8601"),
        date_end: helpers.convertDate(max_date, "ms", "iso8601")
    })
}

var init = function() {
    plot_avg = dygraph_pressure.init(drawAvgPlot)

    plot_avg.updateOptions({
        clickCallback: function(e, x, points) {
            var selected_date = helpers.convertDate(points[0].xval, "ms", "iso8601")

            if(vm.current_mode() === "timeline_event") {
                var date = helpers.convertDate(selected_date, "iso8601", "jmask")

                vm.timeline_events.current_event().jmask_date(date)
                return
            }

            vm.selected_date(selected_date)

            vm.point_box_left(`${e.clientX}px`)
            vm.point_box_top(`${e.clientY}px`)

            vm.is_point_box_visible(true)
        },
        underlayCallback: function(canvas, area, g) {
            var selected_avg_plots = _.filter(
                vm.selected_plots(),
                function(plot) { return plot.type === "avg" }
            )

            var value_range = g.yAxisRanges()

            var bottom = value_range[0]
            var top = value_range[1]

            for(var i = 0; i < selected_avg_plots.length; i++) {
                var plot = selected_avg_plots[i]

                var date_start = plot.date_start_ms
                var date_end = plot.date_end_ms

                var bottom_left = g.toDomCoords(date_start, bottom)
                var top_right = g.toDomCoords(date_end, top)

                var left = bottom_left[0]
                var right = top_right[0]

                canvas.fillStyle = plot.fill_color
                canvas.fillRect(left, area.y, right - left, area.h)
            }
        }
    })

    vm.plot_avg = plot_avg

    plot_main = dygraph_main.init()
    var line = $("#dygraph_container .line")[0]

    vm.plot_main = plot_main

	var mainDrawCallback = vm.plot_main.getOption("drawCallback")

    plot_main.updateOptions({
        drawCallback: function(e, x, points) {
			mainDrawCallback()
			vm.plot_main_xAxisRange(plot_main.xAxisRange())

            if(vm.current_mode() !== "color") {
                return
            }

            var x_range = plot_main.xAxisRange()

            var plots = _.map(vm.selected_plots(), function(plot, i) {
                return plot.getColorPlotData(i, x_range[0], x_range[1])
            })

            if(plots.length === 0) {
                return
            }

            var length_scale = vm.selected_plots()[0].getLengthScale(x_range[0], x_range[1])

            vm.renderer.update(plots, length_scale)
		},
        clickCallback: function(e, x, points) {
            var mode = vm.current_mode()

            if(mode === "reference_point") {
                var point = points[0]

                vm.reference_point.point().length(point.xval)
                vm.reference_point.point().temp(point.yval)
            }

            if(mode === "min_length") {
                var point = points[0]

                var x = point.canvasx

                line.style.visibility = "visible"
                line.style.left = x + "px"

                vm.min_length.value(point.xval)
            }
        },
        valueFormatter: function(val, opts, series, dygraph, row, col) {
            if(series === "Length") {
                return val
            }

            var plot = vm.selected_plots()[parseInt(series) - 1]
            return val - plot.offset
        }
    })
    plot_main.ready(function(err, graph) {
        vm.selected_plots.subscribe(function(value) {
            var selected_plots = value

            if(selected_plots.length === 0) {
                plot_data = [[0, 0]]
                plot_labels = ["X", "Y1"]
                plot_colors = []
            }
            else {
                plot_labels = ["Length"]

                var length_data = _.find(selected_plots, function(plot) {
                    return plot.data.length > 0
                }).data

                plot_data = _.map(length_data, function(v) {
                    return [v[0]]
                })
                plot_colors = _.map(selected_plots, function(v) {
                    return v.color()
                })

                for(var i = 0; i < selected_plots.length; i++) {
                    plot_labels.push((i + 1).toString())

                    var data = selected_plots[i].data.length === 0
                        ? [[0, 0]]
                        : selected_plots[i].data

                    for(var j = 0; j < data.length; j++) {
                        plot_data[j].push(data[j][1])
                    }
                }
            }

            plot_main.updateOptions({
                file: plot_data,
                labels: plot_labels,
                colors: plot_colors
            })

            if(selected_plots.length !== 0) {
                vm.length_annotations.annotations.valueHasMutated()
            }
        })
    })

    var renderer = new ColorTempRenderer({
        element: document.getElementById("renderer_div")
    })

    vm.renderer = renderer

    is_inited = true
}

var getAvgTempPlot = function(date_start, date_end) {
    var plot = new Plot({
        type: "avg",
        date_start: date_start,
        date_end: date_end,
        well_id: vm.current_well.id
    })

    vm.is_point_box_visible(false)
    vm.selected_date(null)

    vm.is_loading_temp_data(true)

    plot.load(function(err, result) {
        vm.is_loading_temp_data(false)

        if(err) {
            return console.error(err)
        }

        vm.selected_plots.push(plot)
    })
}

var redrawAnnotations = function() {
    var file = plot_avg.file_

    vm.annotations().forEach(function(annotation) {
        var date = helpers.convertDate(annotation.x, "ms", "native")
        var file_element = is_raw_pressure_data
            ? [date, null]
            : [date, [null, null, null]]

        var index = _.sortedIndexBy(file, file_element, function(v) {
            return v[0]
        })

        if(file[index]) {
            var found_date = helpers.convertDate(file[index][0], "native", "ms")

            if(found_date === annotation.x) {
                return
            }
        }

        file.splice(index, 0, file_element)
    })

    plot_avg.updateOptions({
        file: file,
        customBars: !is_raw_pressure_data,
        errorBars: !is_raw_pressure_data
    })

    plot_avg.setAnnotations(vm.annotations())
}

// observables

var vm = {}

vm.min_zoom_y = ko.observable()
vm.max_zoom_y = ko.observable()

vm.min_zoom_x = ko.observable()
vm.max_zoom_x = ko.observable()

vm.selected_date = ko.observable()

vm.is_point_box_visible = ko.observable(false)
vm.is_color_temp_box_visible = ko.observable(false)
vm.point_box_top = ko.observable(0)
vm.point_box_left = ko.observable(0)

vm.is_loading_pressure_data = ko.observable(false)
vm.is_loading_temp_data = ko.observable(false)
vm.has_data = ko.observable(true)

vm.is_favorite_saved = ko.observable(false)

vm.well_id = ko.observable()
vm.current_well = null

vm.color_temp_number = ko.observable()
vm.color_temp_interval = ko.observable()
vm.color_temp_unit = ko.observable()

vm.selected_plots = ko.observableArray()

vm.processed = ko.observable()
vm.total = ko.observable()

vm.plot_main_xAxisRange = ko.observable([0,0])
vm.adjustRoll = ko.observable()
vm.current_mode = ko.observable("normal")

// methods

vm.drawAvgPlot = drawAvgPlot

vm.resetPlotAvgState = function() {
    var min_date = helpers.convertDate(plot_avg_init_state[0][0], "native", "ms")
    var max_date = helpers.convertDate(plot_avg_init_state[plot_avg_init_state.length - 1][0], "native", "ms")

    plot_avg.updateOptions({
        dateWindow: [min_date, max_date],
        valueRange: [null, null]
    })

    drawAvgPlot()
    redrawAnnotations()
}

vm.getNearestTempPlot = function() {
    var date = vm.selected_date()

    var plot = new Plot({
        type: "point",
        date: date,
        well_id: vm.current_well.id
    })

    vm.is_point_box_visible(false)
    vm.selected_date(null)

    vm.is_loading_temp_data(true)

    plot.load(function(err, result) {
        vm.is_loading_temp_data(false)

        if(err) {
            return console.error(err)
        }

        if(result.type === "point") {
            var plot_ts = helpers.convertDate(result.date, "iso8601", "ms")

            if(_.find(vm.selected_plots(), { date: plot_ts })) {
                return
            }
        }

        if(result.data.length === 0) {
            return
        }

        vm.selected_plots.push(plot)
    })
}

vm.getAvgTempPlot = function(length, units) {
    var duration_ms = moment.duration(length, units).asMilliseconds()

    var date_start = vm.selected_date()

    var date_start_ms = helpers.convertDate(date_start, "iso8601", "ms")
    var date_end_ms = date_start_ms + duration_ms

    var date_end = helpers.convertDate(date_end_ms, "ms", "iso8601")

    getAvgTempPlot(date_start, date_end)
}

vm.getAvgTempPlotForVisibleRange = function() {
    var x_range = vm.plot_avg.xAxisRange()

    var date_start = helpers.convertDate(x_range[0], "ms", "iso8601")
    var date_end = helpers.convertDate(x_range[1], "ms", "iso8601")

    getAvgTempPlot(date_start, date_end)
}

vm.hidePointBox = function(data, e) {
    vm.is_point_box_visible(false)
}

vm.afterShow = function() {
    if(!is_inited) {
        setTimeout(function() { init() }, 0)
    }

    setTimeout(function() {
        vm.well_id(pager.page.route[1])

        vm.plot_avg.ready(function() {
            vm.has_data(true)

            var current_well = _.find(m_site.state.wells(), function(well) {
                return well.id == vm.well_id()
            })

            if(!current_well) {
                return console.error("well not found")
            }

            vm.current_well = current_well

            vm.selected_plots.removeAll()

            is_raw_pressure_data = true

            vm.is_loading_pressure_data(true)
            vm.current_well.init(function(err, result) {
                if(err) {
                    vm.is_loading_pressure_data(false)
                    return console.error(err)
                }

                vm.current_mode("normal")

                if(result.length === 0) {
                    return vm.has_data(false)
                }

                plot_avg_init_state = result

                vm.plot_avg.updateOptions({
                    file: result,
                    errorBars: false,
                    customBars: false
                })

                vm.is_loading_pressure_data(false)

                vm.timeline_events.getAll()
                vm.length_annotations.getAll()

                vm.plot_avg.resetZoom()

                drawAvgPlot()
            })
        })
    }, 0)

    if(plot_avg) {
        setTimeout(function() { plot_avg.resize(), 0 })
    }

    if(plot_main) {
        setTimeout(function() { plot_main.resize(), 0 })
    }
}

vm.removePoint = function(data, event) {
    vm.selected_plots.remove(function(item) {
        return item == data
    })
}

vm.showPoint = function(data, event) {
    data.showOnPlot(plot_avg)
}

vm.saveFavorite = function() {
    var name = prompt("Введите название закладки", "")

    var favorite = new Favorite({
        name: name,
        well_id: vm.current_well.id,
        plots: vm.selected_plots()
    })

    favorite.save(function(err, result) {
        if(err) {
            return console.error(err)
        }

        vm.is_favorite_saved(true)
        m_site.favorites.loadAll()

        setTimeout(function() {
            vm.is_favorite_saved(false)
        }, 5000)
    })
}

// computed observables

vm.annotations = ko.computed(function() {
    var AVG_Y_AXIS = "Pressure"

    var selected_plots = vm.selected_plots()

    var result = []

    selected_plots.forEach(function(v, i) {
        result.push(v.getAnnotation(i))
    })

    if(vm.timeline_events) {
        var timeline_events = vm.timeline_events.events()

        timeline_events.forEach(function(v) {
            result.push(v.getAnnotation())
        })
    }

    return result
})

vm.updateZoomX = function(data, e) {
    if(e.keyCode != 13 && e.which != 13) {
        return true
    }

    var min_moment = helpers.convertDate(vm.min_zoom_x(), "jmask", "moment")
    var max_moment = helpers.convertDate(vm.max_zoom_x(), "jmask", "moment")

    if(!min_moment.isValid() || !max_moment.isValid()) {
        return
    }

    plot_avg.updateOptions({
        dateWindow: [min_moment.valueOf(), max_moment.valueOf()]
    })

    drawAvgPlot()
}

vm.updateZoomY = function(data, e) {
    if(e.keyCode != 13 && e.which != 13) {
        return true
    }

    var min_zoom = parseFloat(vm.min_zoom_y())
    var max_zoom = parseFloat(vm.max_zoom_y())

    plot_avg.updateOptions({
        valueRange: [min_zoom, max_zoom]
    })
}

vm.resetAvgPlotZoom = function() {
    plot_avg.resetZoom()
	vm.min_zoom_y(null)
	vm.max_zoom_y(null)
    plot_avg.updateOptions({
        valueRange: [null, null]
    })
}
vm.adjustRoll.subscribe(function(val) {
	plot_avg.adjustRoll(Number(val))
})

vm.is_main_plot_visible = ko.computed(function() {
    return vm.selected_plots().length > 0
})

vm.downloadAllAsLAS = function() {
    Plot.downloadPlotsAsLAS(vm.selected_plots(), vm.current_well.id)
}

vm.removeAllPlots = function() {
    vm.selected_plots.removeAll()
}

vm.openColorTempBox = function() {
    vm.color_temp_number(null)
    vm.color_temp_interval(null)
    vm.color_temp_unit(null)

    vm.is_point_box_visible(false)
    vm.is_color_temp_box_visible(true)
}

vm.closeColorTempBox = function() {
    vm.is_color_temp_box_visible(false)
    vm.is_point_box_visible(true)
}

vm.renderColorTemp = function() {
    var number = parseInt(vm.color_temp_number())
    var interval = parseInt(vm.color_temp_interval())
    var unit = vm.color_temp_unit()

    vm.is_color_temp_box_visible(false)
    vm.is_loading_temp_data(true)

    Plot.getPlotsForColorTempRenderer(
        {
            date: vm.selected_date(),
            number: number,
            interval: moment.duration(interval, unit).asMilliseconds(),
            well_id: vm.current_well.id
        },
        function(err, task_id) {
            if(err) {
                vm.is_loading_temp_data(false)
                return console.error(err)
            }

            var checkTaskStatus = function() {
                helpers.makeAJAXRequest(
                    "/api/app/plots/task_status",
                    "get",
                    {
                        id: task_id,
                        well_id: vm.current_well.id
                    },
                    function(err, result) {
                        if(err) {
                            return console.error(err)
                        }

                        if(!result.is_finished) {
                            vm.processed(result.processed)
                            vm.total(result.total)

                            return setTimeout(checkTaskStatus, POLL_INTERVAL)
                        }

                        if(result.result.err) {
                            return console.error(result.result.err)
                        }

                        vm.current_mode("color")

                        vm.selected_plots.removeAll()

                        // лол
                        var plots = _.map(result.result.result, function(plot) {
                            return new Plot(plot)
                        })

                        vm.selected_plots(plots)

                        vm.is_loading_temp_data(false)
                        vm.processed(null)
                        vm.total(null)
                    }
                )
            }

            checkTaskStatus()
        }
    )
}

vm.cancelColorMode = function() {
    vm.selected_plots.removeAll()
    vm.current_mode("normal")
}

// subscribes

vm.selected_plots.subscribe(function(value) {
    if(vm.current_mode() !== "color") {
        return
    }

    var plots = _.filter(value, function(plot) {
        return plot.is_for_color_plot
    })

    if(plots.length === 0) {
        return vm.renderer.clear()
    }

    var length_scale = plots[0].getLengthScale()

    plots = _.map(plots, function(plot, i) {
        return plot.getColorPlotData(i)
    })

    vm.renderer.update(plots, length_scale)
})

vm.selected_plots.subscribe(function(value) {
    value.forEach(function(plot, i) {
        plot.color(Plot.COLORS[i % Plot.COLORS.length])
    })
})

vm.selected_plots.subscribe(function(value) {
    if(value.length === 0) {
        vm.plot_main.resetZoom()
    }
})

vm.annotations.subscribe(redrawAnnotations)

// exports

window.m_site.plots = vm
})()
