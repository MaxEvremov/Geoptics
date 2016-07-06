(function() {

// const

var ZOOM_LOAD_THRESHOLD = 1 * 24 * 60 * 60 * 1000
var DEBOUNCE_DELAY = 500
var POINTS_PER_PLOT = 100

// local state variables

var is_inited = false

var plot_data = [[0, 0]]
var plot_labels = ["X", "Y1"]
var plot_colors = []

var plot_avg = null
var plot_main = null

var plot_avg_prev_min_date = null
var plot_avg_prev_max_date = null

var is_raw_pressure_data

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
            customBars: !is_raw_pressure_data
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
        customBars: false
    })
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

    // не загружать данные давления, если новый диапазон времени полностью находится внутри старого

    // if(plot_avg_prev_min_date && plot_avg_prev_max_date) {
    //     if(min_date >= plot_avg_prev_min_date
    //     && max_date <= plot_avg_prev_max_date) {
    //         return
    //     }
    // }
    //
    // plot_avg_prev_min_date = min_date
    // plot_avg_prev_max_date = max_date

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

            vm.point_box_left(`${e.x}px`)
            vm.point_box_top(`${e.y}px`)

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

                var date_start = helpers.convertDate(plot.date_start, "iso8601", "ms")
                var date_end = helpers.convertDate(plot.date_end, "iso8601", "ms")

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
        }
    })
    plot_main.ready(function(err, graph) {
        vm.selected_plots.subscribe(function(value) {
            var annotations = value

            if(annotations.length === 0) {
                plot_data = [[0, 0]]
                plot_labels = ["X", "Y1"]
                plot_colors = []
            }
            else {
                var selected_plots = vm.selected_plots()

                var descriptions = selected_plots.map(function(v) {
                    return v.description
                })

                plot_labels = ["Length"].concat(descriptions)
                plot_data = _.map(selected_plots[0].data, function(v) {
                    return [v[0]]
                })
                plot_colors = _.map(selected_plots, function(v) {
                    return v.color()
                })

                for(var i = 0; i < selected_plots.length; i++) {
                    var data = selected_plots[i].data

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

            if(annotations.length !== 0) {
                vm.length_annotations.annotations.valueHasMutated()
            }

        })
    })

    is_inited = true
}

// main

var vm = {
    min_zoom_y: ko.observable(),
    max_zoom_y: ko.observable(),

    min_zoom_x: ko.observable(),
    max_zoom_x: ko.observable(),

    selected_date: ko.observable(),

    is_point_box_visible: ko.observable(false),
    point_box_top: ko.observable(0),
    point_box_left: ko.observable(0),

    is_loading_pressure_data: ko.observable(false),
    is_loading_temp_data: ko.observable(false),
    has_data: ko.observable(true),

    is_favorite_saved: ko.observable(false),

    well_id: ko.observable(),
    current_well: null
}

vm.resetPlotAvgState = function() {
    var min_date = helpers.convertDate(plot_avg_init_state[0][0], "native", "ms")
    var max_date = helpers.convertDate(plot_avg_init_state[plot_avg_init_state.length - 1][0], "native", "ms")

    plot_avg.updateOptions({
        dateWindow: [min_date, max_date]
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

                plot_avg_prev_min_date = null
                plot_avg_prev_max_date = null

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

vm.current_mode = ko.observable("normal")

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
        plots: JSON.stringify(_.map(vm.selected_plots(), function(plot) {
            var json = {
                type: plot.type
            }

            if(plot.type === "point") {
                json.date = plot.date
            }

            if(plot.type === "avg") {
                json.date_start = plot.date_start
                json.date_end = plot.date_end
            }

            return json
        }))
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

vm.selected_plots = ko.observableArray()

vm.selected_plots.subscribe(function(value) {
    value.forEach(function(plot, i) {
        plot.color(Plot.COLORS[i])
    })
})

vm.annotations = ko.computed(function() {
    var AVG_Y_AXIS = "Pressure"

    var selected_plots = vm.selected_plots()

    var result = []

    selected_plots.forEach(function(v, i) {
        helpers.createCSSClass(
            `.dygraphDefaultAnnotation.dygraph-annotation-plot-${i + 1}`,
            v.color()
        )
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

vm.annotations.subscribe(redrawAnnotations)

// avg graph params

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
        dateWindow: [min_moment.valueOf(), max_moment.valueOf()],
        isZoomedIgnoreProgrammaticZoom: true
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
        valueRange: [min_zoom, max_zoom],
        isZoomedIgnoreProgrammaticZoom: true
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

vm.adjustRoll = ko.observable()
vm.adjustRoll.subscribe(function(val) {
	plot_avg.adjustRoll(Number(val))
})

vm.plot_main_xAxisRange = ko.observable([0,0])

vm.is_main_plot_visible = ko.computed(function() {
    return vm.selected_plots().length > 0
})

// exports

window.m_site.plots = vm
})()
