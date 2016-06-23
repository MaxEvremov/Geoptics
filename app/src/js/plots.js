(function() {

// init

var is_inited = false

var plot_data = [[0, 0]]
var plot_labels = ["X", "Y1"]
var plot_colors = []

var plot_avg = null
var plot_main = null

var current_well = m_site.state.current_well

var getTimelineEvents = function() {
    current_well.getTimelineEvents(function(err, result) {
        if(err) {
            return console.error(err)
        }

        vm.timeline_events(result || [])
    })
}

var queue = async.queue(
    function(plot, done) {
        var mode = vm.current_mode()

        current_well.getTempMeasurements(
            {
                plots: plot,
                ignore_min_length: mode === "min_length"
            },
            function(err, result) {
                if(err) {
                    return done(err)
                }

                var answer_plot = result[0]

                if(mode === "reference_point") {
                    var date = answer_plot.date

                    vm.reference_date(answer_plot.date)

                    var plot_labels = ["Length", answer_plot.date]

                    plot_main.updateOptions({
                        file: answer_plot.values,
                        labels: plot_labels
                    })

                    return done()
                }

                if(mode === "timeline_event") {
                    return done()
                }

                if(plot.type === "point") {
                    var plot_ts = helpers.convertDate(answer_plot.date, "iso8601", "ms")

                    if(_.find(vm.selected_plots(), { date: plot_ts })) {
                        return done()
                    }
                }

                var selected_plot = new Plot({
                    type: plot.type,
                    data: answer_plot.values
                })

                if(selected_plot.type === "point") {
                    selected_plot.date = helpers.convertDate(answer_plot.date, "iso8601", "ms")
                }

                if(selected_plot.type === "avg") {
                    selected_plot.date_start = helpers.convertDate(plot.date_start, "iso8601", "ms")
                    selected_plot.date_end = helpers.convertDate(plot.date_end, "iso8601", "ms")
                }

                vm.selected_plots.push(selected_plot)

                return done()
            }
        )
    },
    1
)

var plot_avg_prev_min_date = null
var plot_avg_prev_max_date = null

var ZOOM_LOAD_THRESHOLD = 1 * 24 * 60 * 60 * 1000
var DEBOUNCE_DELAY = 500

var loadPressureData = _.debounce(function(params) {
    vm.is_loading_pressure_data(true)

    current_well.getPressureMeasurements(params, function(err, result) {
        if(err) {
            vm.is_loading_pressure_data(false)
            return console.error(err)
        }

        plot_avg.updateOptions({
            file: result,
            valueRange: [null, null]
        })

        vm.is_loading_pressure_data(false)
        redrawAnnotations()
    })
}, DEBOUNCE_DELAY)

var POINTS_PER_PLOT = 100

var generateEmptyPoints = function(params) {
    var min_date = params.min_date
    var max_date = params.max_date

    var step = (max_date - min_date) / POINTS_PER_PLOT
    var file = []

    for(var i = 0; i < POINTS_PER_PLOT + 1; i++) {
        file.push([helpers.convertDate(min_date + i * step, "ms", "native"), 1])
    }

    plot_avg.updateOptions({
        file: file
    })
}

var drawAvgPlot = function() {
    if(vm.is_loading_pressure_data()) {
        return
    }

    var x_range = plot_avg.xAxisRange()
    var y_range = plot_avg.yAxisRange()

    var min_date = x_range[0]
    var max_date = x_range[1]

    vm.min_zoom_x(helpers.convertDate(min_date, "ms", "iso8601"))
    vm.max_zoom_x(helpers.convertDate(max_date, "ms", "iso8601"))

    vm.min_zoom_y(y_range[0][0])
    vm.max_zoom_y(y_range[0][1])

    if(max_date - min_date > ZOOM_LOAD_THRESHOLD) {
        generateEmptyPoints({
            min_date: min_date,
            max_date: max_date
        })

        return
    }

    if(plot_avg_prev_min_date && plot_avg_prev_max_date) {
        if(min_date >= plot_avg_prev_min_date
        && max_date <= plot_avg_prev_max_date) {
            return
        }
    }

    plot_avg_prev_min_date = min_date
    plot_avg_prev_max_date = max_date

    loadPressureData({
        date_start: helpers.convertDate(min_date, "ms", "iso8601"),
        date_end: helpers.convertDate(max_date, "ms", "iso8601")
    })
}

var init = function() {
    var plot_avg_interaction_model = _.cloneDeep(Dygraph.Interaction.defaultModel)

    plot_avg_interaction_model.dblclick = function() {}

    plot_avg = new Dygraph(
        $("#dygraph_avg_container")[0],
        [[0, 0]],
        {
            height: 150,
            labels: ["Date", "Pressure"],
            connectSeparatedPoints: true,
            clickCallback: function(e, x, points) {
                if(vm.current_mode() === "timeline_event") {
                    var selected_date = helpers.convertDate(points[0].xval, "ms", "iso8601")
                    vm.timeline_event_date(selected_date)
                    return
                }

                var selected_date = points[0].xval

                vm.selected_date(selected_date)

                vm.point_box_left(`${e.x}px`)
                vm.point_box_top(`${e.y}px`)

                vm.is_point_box_visible(true)
            },
            zoomCallback: drawAvgPlot,
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

                    var bottom_left = g.toDomCoords(plot.date_start, bottom)
                    var top_right = g.toDomCoords(plot.date_end, top)

                    var left = bottom_left[0]
                    var right = top_right[0]

                    canvas.fillStyle = plot.fill_color
                    canvas.fillRect(left, area.y, right - left, area.h)
                }
            },
            interactionModel: plot_avg_interaction_model
        }
    )
    vm.plot_avg = plot_avg

    plot_avg.ready(function() {
        current_well.init(function(err, result) {
            if(err) {
                return console.error(err)
            }

            plot_avg_init_state = result

            plot_avg.updateOptions({
                file: result
            })

            getTimelineEvents()
            getLengthAnnotations()

            plot_avg.resetZoom()

            drawAvgPlot()
        })
    })

    plot_main = dygraph_main.init()
    var line = $("#dygraph_container .line")[0]

    vm.plot_main = plot_main

    plot_main.updateOptions({
        clickCallback: function(e, x, points) {
            var mode = vm.current_mode()

            if(mode === "reference_point") {
                var point = points[0]

                vm.reference_length(point.xval)
                vm.reference_temp(point.yval)
            }

            if(mode === "min_length") {
                var point = points[0]

                var x = point.canvasx

                line.style.visibility = "visible"
                line.style.left = x + "px"

                vm.min_length(point.xval)
            }

            if(mode === "length_annotation") {
                var point = points[0]

                vm.length_annotation_length(point.xval)
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
                vm.length_annotations.valueHasMutated()
            }
        })
    })

    is_inited = true
}

// main

var vm = {
    min_deviation: ko.observable(0),

    min_zoom_y: ko.observable(),
    max_zoom_y: ko.observable(),

    min_zoom_x: ko.observable(),
    max_zoom_x: ko.observable(),

    deviations: ko.observableArray(),
    timeline_events: ko.observableArray(),

    selected_date: ko.observable(),

    is_point_box_visible: ko.observable(false),
    point_box_top: ko.observable(0),
    point_box_left: ko.observable(0),

    is_loading_pressure_data: ko.observable(false)
}

vm.resetPlotAvgState = function() {
    plot_avg.updateOptions({
        file: plot_avg_init_state
    })

    plot_avg.resetZoom()
    redrawAnnotations()
}

vm.getNearestTempPlot = function() {
    var date = vm.selected_date()

    var plot = new Plot({
        type: "point",
        date: helpers.convertDate(date, "ms", "iso8601")
    })

    vm.is_point_box_visible(false)
    vm.selected_date(null)

    queue.push(plot, function(err) {
        if(err) {
            console.error(err)
        }
    })
}

vm.getAvgHourTempPlot = function() {
    var HOUR = 60 * 60 * 1000

    var date = vm.selected_date()

    var plot = new Plot({
        type: "avg",
        date_start: helpers.convertDate(date, "ms", "iso8601"),
        date_end: helpers.convertDate(date + HOUR, "ms", "iso8601")
    })

    vm.is_point_box_visible(false)
    vm.selected_date(null)

    queue.push(plot, function(err) {
        if(err) {
            console.error(err)
        }
    })
}

vm.hidePointBox = function(data, e) {
    vm.is_point_box_visible(false)
}

vm.afterShow = function() {
    if(!is_inited) {
        init()
    }

    if(plot_avg) {
        setTimeout(function() { plot_avg.resize(), 0 })
    }

    if(plot_main) {
        setTimeout(function() { plot_main.resize(), 0 })
    }
}

vm.are_settings_enabled = ko.observable(false)
vm.toggleSettings = function() {
    vm.are_settings_enabled(!vm.are_settings_enabled())
}

var clearModeData = function(mode) {
    if(mode === "reference_point") {
        vm.reference_date(null)
        vm.reference_temp(null)
        vm.reference_length(null)

        vm.selected_plots.removeAll()

        plot_main.updateOptions({
            file: [[0, 0]],
            labels: ["X", "Y1"]
        })
    }

    if(mode === "min_length") {
        $("#dygraph_container .line")[0].style.visibility = "hidden"
        vm.min_length(null)
        vm.selected_plots.removeAll()
    }

    if(mode === "timeline_event") {
        vm.timeline_event_date(null)
        vm.timeline_event_short_text(null)
        vm.timeline_event_description(null)
    }

    if(mode === "length_annotation") {
        vm.length_annotation_length(null)
        vm.length_annotation_short_text(null)
        vm.length_annotation_description(null)
    }
}

vm.current_mode = ko.observable("normal")

vm.current_mode.subscribe(clearModeData)
vm.current_mode.subscribe(clearModeData, null, "beforeChange")

vm.returnToNormalMode = function() {
    vm.current_mode("normal")
}

// reference_point

vm.editReferencePoint = function() {
    vm.current_mode("reference_point")
}

vm.reference_date = ko.observable()
vm.reference_temp = ko.observable()
vm.reference_length = ko.observable()

vm.saveReferencePoint = function() {
    current_well.setReferencePoint(
        {
            date: vm.reference_date(),
            temp: vm.reference_temp(),
            length: vm.reference_length()
        },
        function(err, result) {
            if(err) {
                return console.error(err)
            }

            vm.current_mode("normal")
        }
    )
}

// min_length

vm.min_length = ko.observable(0)

vm.setMinLength = function() {
    vm.current_mode("min_length")
}

vm.saveMinLength = function() {
    current_well.setMinLength(
        {
            min_length: vm.min_length()
        },
        function(err, result) {
            if(err) {
                return console.error(err)
            }

            vm.current_mode("normal")
        }
    )
}

// timeline_event

vm.timeline_event_short_text = ko.observable()
vm.timeline_event_description = ko.observable()
vm.timeline_event_date = ko.observable()

vm.current_timeline_event = ko.observable()
vm.is_editing_timeline_event = ko.observable(false)

vm.editTimelineEvents = function() {
    vm.current_mode("timeline_event")
}

vm.addTimelineEvent = function() {
    vm.is_editing_timeline_event(true)
}

vm.editTimelineEvent = function(data, event) {
    vm.current_timeline_event(data.id)

    vm.timeline_event_short_text(data.short_text)
    vm.timeline_event_description(data.description)
    vm.timeline_event_date(helpers.convertDate(data.date, "iso8601", "jmask"))

    vm.is_editing_timeline_event(true)
}

vm.cancelEditingTimelineEvent = function() {
    vm.current_timeline_event(null)

    vm.timeline_event_short_text(null)
    vm.timeline_event_date(null)
    vm.timeline_event_description(null)

    vm.is_editing_timeline_event(false)
}

vm.saveTimelineEvent = function() {
    current_well.addOrUpdateTimelineEvent(
        {
            short_text: vm.timeline_event_short_text(),
            description: vm.timeline_event_description(),
            date: helpers.convertDate(vm.timeline_event_date(), "jmask", "iso8601"),
            id: vm.current_timeline_event()
        },
        function(err, result) {
            if(err) {
                return console.error(err)
            }

            vm.current_timeline_event(null)
            vm.timeline_event_short_text(null)
            vm.timeline_event_date(null)
            vm.timeline_event_description(null)

            vm.is_editing_timeline_event(false)
            getTimelineEvents()
        }
    )
}

vm.removeTimelineEvent = function(data, event) {
    current_well.removeTimelineEvent(data, getTimelineEvents)
}

// length_annotation

vm.length_annotations = ko.observableArray()

var getLengthAnnotations = function() {
    current_well.getLengthAnnotations(function(err, result) {
        if(err) {
            return console.error(err)
        }

        vm.length_annotations(result || [])
    })
}

vm.length_annotation_short_text = ko.observable()
vm.length_annotation_description = ko.observable()
vm.length_annotation_length = ko.observable()

vm.current_length_annotation = ko.observable()
vm.is_editing_length_annotation = ko.observable(false)

vm.editLengthAnnotations = function() {
    vm.current_mode("length_annotation")
}

vm.addLengthAnnotation = function() {
    vm.is_editing_length_annotation(true)
}

vm.cancelEditingLengthAnnotation = function() {
    vm.length_annotation_short_text(null)
    vm.length_annotation_length(null)
    vm.length_annotation_description(null)
    vm.current_length_annotation(null)

    vm.is_editing_length_annotation(false)
}

vm.editLengthAnnotation = function(data, event) {
    vm.current_length_annotation(data.id)

    vm.length_annotation_short_text(data.short_text)
    vm.length_annotation_length(data.length)
    vm.length_annotation_description(data.description)

    vm.is_editing_length_annotation(true)
}

vm.saveLengthAnnotation = function() {
    current_well.addOrUpdateLengthAnnotation(
        {
            short_text: vm.length_annotation_short_text(),
            description: vm.length_annotation_description(),
            length: vm.length_annotation_length(),
            id: vm.current_length_annotation()
        },
        function(err, result) {
            if(err) {
                return console.error(err)
            }

            vm.length_annotation_short_text(null)
            vm.length_annotation_length(null)
            vm.length_annotation_description(null)

            getLengthAnnotations()
            vm.is_editing_length_annotation(false)
        }
    )
}

vm.removeLengthAnnotation = function(data, event) {
    current_well.removeLengthAnnotation(data, getLengthAnnotations)
}

vm.removePoint = function(data, event) {
    vm.selected_plots.remove(function(item) {
        return item == data
    })
}

vm.showPoint = function(data, event) {
    data.showOnPlot(plot_avg)
}

vm.saveFavorite = function() { // TODO: починить
    var x_avg = plot_avg.xAxisRange()
    var y_avg = plot_avg.yAxisRange()
    var x_main = plot_main.xAxisRange()
    var y_main = plot_main.yAxisRange()

    var points = ko.mapping.toJS(vm.selected_plots())
    points = points.map(helpers.formatDate)

    helpers.makeAJAXRequest(
        "/api/app/favorites",
        "post",
        {
            name: "Favorite",
            user_id: 2,
            points: points,
            zoom_avg_left: x_avg[0],
            zoom_avg_right: x_avg[1],
            zoom_avg_low: y_avg[0],
            zoom_avg_high: y_avg[1],
            zoom_main_left: x_main[0],
            zoom_main_right: x_main[1],
            zoom_main_low: y_main[0],
            zoom_main_high: y_main[1]
        },
        function(err, result) {
            if(err) {
                return console.error(err)
            }
        }
    )
}

vm.getDeviations = function() { // TODO: починить
    var min_deviation = parseFloat(vm.min_deviation())

    var x_avg = plot_avg.xAxisRange()
    var date_start = helpers.formatDate(x_avg[0])
    var date_end = helpers.formatDate(x_avg[1])

    helpers.makeAJAXRequest(
        "/api/app/plots/deviations",
        "post",
        {
            min_deviation: min_deviation,
            date_start: date_start,
            date_end: date_end
        },
        function(err, result) {
            if(err) {
                return console.error(err)
            }

            vm.deviations(result)
        }
    )
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
    var deviations = vm.deviations()
    var timeline_events = vm.timeline_events()

    var result = []

    selected_plots.forEach(function(v, i) {
        helpers.createCSSClass(
            `.dygraphDefaultAnnotation.dygraph-annotation-plot-${i + 1}`,
            v.color()
        )
        result.push(v.getAnnotation(i))
    })

    deviations.forEach(function(v) {
        result.push({
            series: AVG_Y_AXIS,
            x: Date.parse(v.date),
            shortText: "!",
            text: `Отклонение на ${v.length} м. Температура: ${v.temp}°. Образец: ${v.norm_temp}°.`,
            cssClass: "dygraph-annotation-deviation"
        })
    })

    timeline_events.forEach(function(v) {
        result.push({
            series: AVG_Y_AXIS,
            x: Date.parse(v.date),
            shortText: v.short_text,
            text: v.description || "",
            attachAtBottom: true,
            cssClass: "dygraph-annotation-event"
        })
    })

    return result
})

var redrawAnnotations = function() {
    var file = plot_avg.file_

    vm.annotations().forEach(function(annotation) {
        var date = helpers.convertDate(annotation.x, "ms", "native")
        var file_element = [date, null]

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
        file: file
    })

    plot_avg.setAnnotations(vm.annotations())
}

vm.annotations.subscribe(redrawAnnotations)

vm.length_annotations.subscribe(function(value) {
    var labels = plot_main.getOption("labels")

    if(labels.length <= 1) {
        return
    }

    var series = labels[1]

    value = _.map(value, function(v) {
        return {
            series: series,
            x: v.length,
            shortText: v.short_text,
            text: v.description || "",
            attachAtBottom: true,
            cssClass: "dygraph-annotation-length"
        }
    })

    plot_main.setAnnotations(value)
})

// avg graph params

var updateZoomX = _.debounce(function(value) {
    var min_moment = moment(vm.min_zoom_x(), "DD/MM/YYYY HH:mm:ss")
    var max_moment = moment(vm.max_zoom_x(), "DD/MM/YYYY HH:mm:ss")

    if(!min_moment.isValid() || !max_moment.isValid()) {
        return
    }

    plot_avg.updateOptions({
        dateWindow: [min_moment.valueOf(), max_moment.valueOf()],
        isZoomedIgnoreProgrammaticZoom: true
    })
}, 10)

var updateZoomY = function(value) {
    var min_zoom = parseFloat(vm.min_zoom_y())
    var max_zoom = parseFloat(vm.max_zoom_y())

    plot_avg.updateOptions({
        valueRange: [min_zoom, max_zoom],
        isZoomedIgnoreProgrammaticZoom: true
    })
}

vm.min_zoom_x.subscribe(updateZoomX)
vm.max_zoom_x.subscribe(updateZoomX)

vm.min_zoom_y.subscribe(updateZoomY)
vm.max_zoom_y.subscribe(updateZoomY)

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

vm.is_main_plot_visible = ko.computed(function() {
    if(vm.current_mode() === "reference_point") {
        return !!vm.reference_date()
    }

    return vm.selected_plots().length > 0
})

// exports

window.m_site.plots = vm
})()
