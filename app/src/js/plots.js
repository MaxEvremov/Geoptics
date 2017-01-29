(function() {

// const

var ZOOM_LOAD_THRESHOLD = 1 * 24 * 60 * 60 * 1000
var DEBOUNCE_DELAY = 500
var POINTS_PER_PLOT = 100
var OFFSET_STEP = 5

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

var prev_min_y = null
var prev_max_y = null

var time_plot_labels = []
var sensors_have_changed = true

// helper methods

var loadPressureData = _.debounce(function(params) {
    vm.is_loading_pressure_data(true)

    vm.current_well().loadTimeMeasurements(params, function(err, result) {
        if(err) {
            vm.is_loading_pressure_data(false)
            return console.error(err)
        }

        is_raw_pressure_data = result.is_raw

        plot_avg.updateOptions({
            file: result.data,
            labels: time_plot_labels,
            errorBars: !is_raw_pressure_data,
            customBars: !is_raw_pressure_data,
            labelsShowZeroValues: true
        })

        vm.is_loading_pressure_data(false)
        redrawAnnotations()

        var y_range = plot_avg.yAxisRange()

        vm.min_zoom_y(y_range[0].toFixed(2))
        vm.max_zoom_y(y_range[1].toFixed(2))

        sensors_have_changed = false
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
        labels: time_plot_labels,
        errorBars: false,
        customBars: false,
        labelsShowZeroValues: false
    })

    redrawAnnotations()

    sensors_have_changed = false
}

var drawAvgPlot = function(is_history_action) {
    is_history_action = _.isUndefined(is_history_action)
        ? false
        : is_history_action

    if(vm.is_loading_pressure_data()) {
        return
    }

    // обновление инпутов зума

    var x_range = plot_avg.xAxisRange()
    var y_range = plot_avg.yAxisRange()

    var min_date = x_range[0]
    var max_date = x_range[1]

    vm.min_zoom_y(y_range[0].toFixed(2))
    vm.max_zoom_y(y_range[1].toFixed(2))

    vm.min_zoom_x(helpers.convertDate(min_date, "ms", "jmask"))
    vm.max_zoom_x(helpers.convertDate(max_date, "ms", "jmask"))

    // обновление данных в графике давления

    if(!vm.current_well().has_active_time_sensors()) {
        if(prev_min_date && prev_max_date && !is_history_action && !sensors_have_changed) {
            m_site.zoom_history.addUndoItem([
                [prev_min_date, prev_max_date],
                y_range
            ])
        }

        prev_min_date = min_date
        prev_max_date = max_date

        prev_min_y = y_range[0]
        prev_max_y = y_range[1]

        generateEmptyPoints({
            min_date: min_date,
            max_date: max_date
        })

        return
    }

    if(prev_min_date && prev_min_date === min_date
    && prev_max_date && prev_max_date === max_date
    && !sensors_have_changed) {
        if(!is_history_action) {
            m_site.zoom_history.addUndoItem([
                [prev_min_date, prev_max_date],
                [prev_min_y, prev_max_y]
            ])
        }

        return
    }

    if(prev_min_date && prev_max_date && !is_history_action && !sensors_have_changed) {
        m_site.zoom_history.addUndoItem([
            [prev_min_date, prev_max_date],
            y_range
        ])
    }

    prev_min_date = min_date
    prev_max_date = max_date

    prev_min_y = y_range[0]
    prev_max_y = y_range[1]

    loadPressureData({
        date_start: helpers.convertDate(min_date, "ms", "iso8601"),
        date_end: helpers.convertDate(max_date, "ms", "iso8601")
    })
}

var updateTempPlotColors = function() {
    var plot_colors = _.map(vm.selected_plots(), function(v) {
        return v.dygraph_color
    })

    plot_main.updateOptions({
        colors: plot_colors
    })
}

var init = function() {
    plot_avg = dygraph_pressure.init(drawAvgPlot)

    plot_avg.updateOptions({
        clickCallback: function(e, x, points) {
            var x = e.layerX
            var date = Math.round(plot_avg.toDataXCoord(x))

            var selected_date = helpers.convertDate(date, "ms", "jmask")

            if(vm.current_mode() === "timeline_event") {
                vm.timeline_events.current_event().jmask_date(selected_date)
                return
            }

            vm.point_box.selected_date(selected_date)

            vm.point_box.left(e.clientX + "px")
            vm.point_box.top(e.clientY + "px")

            vm.point_box.is_visible(true)
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
        showRoller: true,
        drawCallback: function(e, x, points) {
			mainDrawCallback()
			vm.plot_main_xAxisRange(plot_main.xAxisRange())

            if(!vm.is_color_plot_visible()) {
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
            return (val - plot.offset).toFixed(3)
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
                    return v.dygraph_color
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
        element: document.getElementById("renderer_div"),
        selectedPlotCallback: function(plot_idx) {
            var is_plot_selected = !isNaN(parseInt(plot_idx))

            for(var i = 0; i < vm.selected_plots().length; i++) {
                vm.selected_plots()[i].opacity = is_plot_selected ? 0.1 : 1
            }

            if(is_plot_selected) {
                vm.selected_plots()[plot_idx].opacity = 1
            }

            updateTempPlotColors()
        }
    })

    vm.renderer = renderer

    is_inited = true
}

var redrawAnnotations = function() {
    var file = plot_avg.file_

    vm.annotations().forEach(function(annotation) {
        var date = helpers.convertDate(annotation.x, "ms", "native")
        var file_element = [date]

        for(var i = 0; i < vm.current_well().active_time_sensors().length; i++) {
            file_element.push(is_raw_pressure_data
                ? null
                : [null, null, null]
            )
        }

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

vm.is_loading_pressure_data = ko.observable(false)
vm.is_loading_temp_data = ko.observable(false)
vm.has_data = ko.observable(true)

vm.is_plots_menu_visible = ko.observable(false)
vm.is_plot_menu_visible = ko.observable(false)
vm.is_color_plot_visible = ko.observable(false)

vm.is_favorite_saved = ko.observable(false)

vm.well_id = ko.observable()
vm.current_well = ko.observable(new Well())
vm.selected_depth_sensor = ko.observable()
vm.selected_plot = ko.observable()

vm.plot_menu_top = ko.observable()
vm.plot_menu_left = ko.observable()

vm.selected_plots = ko.observableArray()

vm.processed = ko.observable()
vm.total = ko.observable()

vm.plot_main_xAxisRange = ko.observable([0,0])
vm.adjustRoll = ko.observable()
vm.current_mode = ko.observable("normal")

vm.is_loading_favorite = false

// methods

vm.drawAvgPlot = drawAvgPlot

vm.hideBoxes = function() {
    vm.point_box.hide()
    vm.is_plots_menu_visible(false)
    vm.is_plot_menu_visible(false)
}

vm.showPlotMenu = function(data, e) {
    vm.selected_plot(data)

    vm.plot_menu_left((e.clientX - 200).toString() + "px")
    vm.plot_menu_top(e.clientY + "px")

    vm.is_plot_menu_visible(true)
}

vm.togglePlotsMenu = function() {
    vm.is_plots_menu_visible(!vm.is_plots_menu_visible())
}

vm.resetPlotAvgState = function() {
    var min_date = helpers.convertDate(vm.current_well().date_range[0], "native", "ms")
    var max_date = helpers.convertDate(vm.current_well().date_range[1], "native", "ms")

    plot_avg.updateOptions({
        dateWindow: [min_date, max_date],
        valueRange: [null, null]
    })

    drawAvgPlot()
    redrawAnnotations()

    vm.point_box.hide()
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

            vm.current_well(current_well)

            m_site.zoom_history.clear()
            vm.selected_plots.removeAll()

            is_raw_pressure_data = true

            vm.is_loading_pressure_data(true)
            vm.current_well().init(function(err, result) {
                if(err) {
                    vm.is_loading_pressure_data(false)
                    return console.error(err)
                }

                vm.current_mode("normal")

                var date_range = vm.current_well().date_range

                var min_date = helpers.convertDate(date_range[0], "native", "ms")
                var max_date = helpers.convertDate(date_range[1], "native", "ms")

                if(!vm.is_loading_favorite) {
                    vm.plot_avg.updateOptions({
                        file: [[date_range[0], null], [date_range[1], null]],
                        dateWindow: [min_date, max_date],
                        errorBars: false,
                        customBars: false
                    })
                }
                else {
                    vm.is_loading_favorite = false
                }

                vm.is_loading_pressure_data(false)

                vm.timeline_events.getAll()
                vm.length_annotations.getAll()

                prev_min_date = null
                prev_max_date = null

                var updateTimePlotLabels = function() {
                    var sensors = vm.current_well().active_time_sensors()

                    if(sensors.length === 0) {
                        time_plot_labels = ["Date", "Pressure"]
                        return
                    }

                    var sensor_names = sensors.map(function(sensor) {
                        return sensor.name
                    })

                    time_plot_labels = ["Date"].concat(sensor_names)
                }

                updateTimePlotLabels()
                drawAvgPlot()

                vm.current_well().active_time_sensors.subscribe(function() {
                    sensors_have_changed = true

                    updateTimePlotLabels()
                    drawAvgPlot()
                })
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

    if(!name) {
        return
    }

    var state = {
        plots: vm.selected_plots(),

        plot_avg_x_range: vm.plot_avg.xAxisRange(),
        plot_avg_y_range: vm.plot_avg.yAxisRange(),

        plot_main_x_range: vm.plot_main.xAxisRange(),
        plot_main_y_range: vm.plot_main.yAxisRange(),

        active_time_sensors: vm.current_well().active_time_sensors().map(function(sensor) {
            return sensor.id
        })
    }

    var favorite = new Favorite({
        name: name,
        well_id: vm.current_well().id,
        state: state
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
    if(!vm.current_well()) {
        return
    }

    var series = vm.current_well().active_time_sensors().length === 0
        ? "Pressure"
        : vm.current_well().active_time_sensors()[0].name

    var selected_plots = vm.selected_plots()
    var result = []

    selected_plots.forEach(function(v, i) {
        result.push(v.getAnnotation(series, i))
    })

    if(vm.timeline_events) {
        var timeline_events = vm.timeline_events.events()

        timeline_events.forEach(function(v) {
            result.push(v.getAnnotation(series))
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

    var min_zoom = parseFloat(vm.min_zoom_y()).toFixed(2)
    var max_zoom = parseFloat(vm.max_zoom_y()).toFixed(2)

    plot_avg.updateOptions({
        valueRange: [min_zoom, max_zoom]
    })

    vm.min_zoom_y(min_zoom)
    vm.max_zoom_y(max_zoom)
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
    Plot.downloadPlotsAsLAS(vm.selected_plots())
}

vm.removeAllPlots = function() {
    vm.selected_plots.removeAll()
}

vm.cancelColorMode = function() {
    vm.selected_plots.removeAll()
    vm.current_mode("normal")
}

// subscribes

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

vm.is_color_plot_visible.subscribe(function(value) {
    if(value) {
        vm.selected_plots().forEach(function(plot, i) {
            plot.offset = i * 5
        })

        var plots = vm.selected_plots()
        var length_scale = plots[0].getLengthScale()

        plots = _.map(plots, function(plot, i) {
            return plot.getColorPlotData(i)
        })

        setTimeout(function() {
            vm.renderer.update(plots, length_scale)
            vm.selected_plots.valueHasMutated()
        }, 0)
    }
    else {
        vm.selected_plots().forEach(function(plot, i) {
            plot.offset = 0
        })

        vm.renderer.clear()
        vm.selected_plots.valueHasMutated()
    }
})

// exports

window.m_site.plots = vm
})()
