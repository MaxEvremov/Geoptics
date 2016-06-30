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
        file.push([helpers.convertDate(min_date + i * step, "ms", "native"), 0])
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

    vm.min_zoom_x(helpers.convertDate(min_date, "ms", "jmask"))
    vm.max_zoom_x(helpers.convertDate(max_date, "ms", "jmask"))

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

    var endPanCallback = function() {
        drawAvgPlot()
    }

    plot_avg_interaction_model.dblclick = function() {}
    plot_avg_interaction_model.mousedown = function(event, g, context) {
        var mouseup = function(event) {
            if (context.isPanning) {
                endPanCallback()
            }

            Dygraph.removeEvent(document, 'mouseup', mouseup)
        }

        g.addAndTrackEvent(document, 'mouseup', mouseup)

        Dygraph.Interaction.defaultModel.mousedown(event, g, context)
    }

    plot_avg = new Dygraph(
        $("#dygraph_avg_container")[0],
        [[0, 0]],
        {
            height: 150,
            labels: ["Date", "Pressure"],
            connectSeparatedPoints: true,
            clickCallback: function(e, x, points) {
                var selected_date = helpers.convertDate(points[0].xval, "ms", "iso8601")

                if(vm.current_mode() === "timeline_event") {
                    vm.timeline_event_date(helpers.convertDate(selected_date, "iso8601", "jmask"))
                    return
                }

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

                    var date_start = helpers.convertDate(plot.date_start, "iso8601", "ms")
                    var date_end = helpers.convertDate(plot.date_end, "iso8601", "ms")

                    var bottom_left = g.toDomCoords(date_start, bottom)
                    var top_right = g.toDomCoords(date_end, top)

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

    plot_main = dygraph_main.init()
    var line = $("#dygraph_container .line")[0]

    vm.plot_main = plot_main
	var oldcallback=vm.plot_main.getOption("drawCallback")
    plot_main.updateOptions({
        drawCallback: function(e, x, points) {
			console.log("___m_site.plots.plot_main.xAxisRange()",m_site.plots.plot_main.xAxisRange())
			oldcallback()
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
    min_zoom_y: ko.observable(),
    max_zoom_y: ko.observable(),

    min_zoom_x: ko.observable(),
    max_zoom_x: ko.observable(),

    timeline_events: ko.observableArray(),

    selected_date: ko.observable(),

    is_point_box_visible: ko.observable(false),
    point_box_top: ko.observable(0),
    point_box_left: ko.observable(0),

    is_loading_pressure_data: ko.observable(false),
    is_loading_temp_data: ko.observable(false),
    has_data: ko.observable(true),

    is_favorite_saved: ko.observable(false),

    well_id: ko.observable()
}

vm.resetPlotAvgState = function() {
    plot_avg.updateOptions({
        file: plot_avg_init_state,
        valueRange: [0, 1]
    })

    plot_avg.resetZoom()
    redrawAnnotations()
}

vm.getNearestTempPlot = function() {
    var date = vm.selected_date()

    var plot = new Plot({
        type: "point",
        date: date,
        well_id: current_well.id
    })

    vm.is_point_box_visible(false)
    vm.selected_date(null)

    vm.is_loading_temp_data(true)

    plot.load(function(err, result) {
        vm.is_loading_temp_data(false)

        if(err) {
            return console.error(err)
        }

        var plot_ts = helpers.convertDate(result.date, "iso8601", "ms")

        if(_.find(vm.selected_plots(), { date: plot_ts })) {
            return done()
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
        well_id: current_well.id
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

            current_well = _.find(m_site.state.wells(), function(well) {
                return well.id == vm.well_id()
            })

            vm.selected_plots.removeAll()

            current_well.init(function(err, result) {
                if(err) {
                    return console.error(err)
                }

                plot_avg_prev_min_date = null
                plot_avg_prev_max_date = null

                if(result.length === 0) {
                    return vm.has_data(false)
                }

                plot_avg_init_state = result

                vm.plot_avg.updateOptions({
                    file: result
                })

                getTimelineEvents()
                getLengthAnnotations()

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

vm.are_settings_enabled = ko.observable(false)
vm.toggleSettings = function() {
    vm.are_settings_enabled(!vm.are_settings_enabled())
}

var clearModeData = function(mode) {
    if(mode === "reference_point") {
        vm.selected_plots.removeAll()

        plot_main.updateOptions({
            file: [[0, 0]],
            labels: ["X", "Y1"]
        })
    }

    if(mode === "min_length") {
        $("#dygraph_container .line")[0].style.visibility = "hidden"
        vm.min_length.value(null)
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

vm.reference_point = {
    point: ko.observable(new ReferencePoint({})),
    edit: function() {
        current_well.getReferencePoint(
            function(err, result) {
                if(err) {
                    return console.error(err)
                }

                vm.reference_point.point(result)
                vm.current_mode("reference_point")
            }
        )
    },
    save: function() {
        current_well.setReferencePoint(
            ko.toJS(vm.reference_point.point()),
            function(err, result) {
                if(err) {
                    return console.error(err)
                }

                vm.current_mode("normal")
            }
        )
    },
    cancel: function() {
        vm.current_mode("normal")
    }
}

vm.reference_point.is_save_allowed = ko.computed(function() {
    var point = vm.reference_point.point()

    return point.temp() && point.length()
})

// min_length

vm.min_length = {
    value: ko.observable(0),
    edit: function() {
        current_well.getMinLength(
            function(err, result) {
                if(err) {
                    return console.error(err)
                }

                vm.min_length.value(result.min_length)
                vm.current_mode("min_length")
            }
        )
    },
    save: function() {
        current_well.setMinLength(
            {
                min_length: vm.min_length.value()
            },
            function(err, result) {
                if(err) {
                    return console.error(err)
                }

                vm.current_mode("normal")
            }
        )
    },
    cancel: function() {
        vm.current_mode("normal")
    }
}

vm.min_length.is_save_allowed = ko.computed(function() {
    return !!vm.min_length.value()
})

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

vm.saveFavorite = function() {
    var name = prompt("Введите название закладки", "")

    var favorite = new Favorite({
        name: name,
        well_id: current_well.id,
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
    var timeline_events = vm.timeline_events()

    var result = []

    selected_plots.forEach(function(v, i) {
        helpers.createCSSClass(
            `.dygraphDefaultAnnotation.dygraph-annotation-plot-${i + 1}`,
            v.color()
        )
        result.push(v.getAnnotation(i))
    })

    timeline_events.forEach(function(v) {
        result.push({
            series: AVG_Y_AXIS,
            x: helpers.convertDate(v.date, "iso8601", "ms"),
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
