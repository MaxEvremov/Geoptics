//"use strict"
(function(){
// imports
//
//import ko from "knockout"
//import mapping from "knockout-mapping"
//import moment from "moment"
//import Dygraph from "dygraphs"
//import $ from "jquery"
//import _ from "lodash"
//import randomColor from "randomcolor"
//import async from "async"
//
//import * as helpers from "./helpers"
//
//import dygraph_main from "./plot-main"

// var

var INIT_COLORS_NUMBER = 20

// helpers

var formatDate = function(date) {
    return moment(date).format("YYYY-MM-DD HH:mm:ssZ")
}

// init

var is_inited = false

var plots = {}
var plot_colors = []

for(var i = 0; i < INIT_COLORS_NUMBER; i++) {
    plot_colors.push(randomColor({ luminosity: "dark" }))
}

var plot_data = [[0, 0]]
var plot_labels = ["X", "Y1"]

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
    function(date, done) {
        var mode = vm.current_mode()

        helpers.makeAJAXRequest(
            "/api/app/plots/measurements",
            "post",
            {
                dates: formatDate(date),
                well_id: 1, // TODO: поменять на настоящий id выбранной скважины
                is_setting_min_length: mode === "min_length"
            },
            function(err, result) {
                if(err) {
                    return done(err)
                }

                var plot = result[0]

                if(mode === "reference_point") {
                    vm.reference_date(formatDate(plot.date))

                    var plot_labels = ["Length", formatDate(plot.date)]

                    plot_main.updateOptions({
                        file: plot.values,
                        labels: plot_labels
                    })

                    return done()
                }

                if(mode === "timeline_event") {
                    vm.timeline_event_date(formatDate(plot.date))

                    var plot_labels = ["Length", formatDate(plot.date)]

                    plot_main.updateOptions({
                        file: plot.values,
                        labels: plot_labels
                    })

                    return done()
                }

                if(vm.selected_points.indexOf(plot.date) !== -1) {
                    return done()
                }

                plots[plot.date] = plot.values
                vm.selected_points.push(moment(plot.date).valueOf())

                return done()
            }
        )
    },
    1
)

var init = function() {
    var plot_avg_interaction_model = Dygraph.Interaction.defaultModel
    plot_avg_interaction_model.dblclick = function() {}

    plot_avg = new Dygraph(
        $("#dygraph_avg_container")[0],
        [[0, 0, null]],
        {
            height: 150,
            labels: ["Date", "Pressure", "Annotations"],
            connectSeparatedPoints: true,
            clickCallback: function(e, x, points) {
                var selected_date = points[0].xval
                queue.push(selected_date, function(err) {
                    if(err) {
                        console.error(err)
                    }
                })
            },
            zoomCallback: function(min_date, max_date, y_ranges) {
                vm.min_zoom_y(y_ranges[0][0])
                vm.max_zoom_y(y_ranges[0][1])
            },
            drawCallback: function(dygraph, is_initial) {
                var plot_annotations = $(".dygraphDefaultAnnotation.dygraph-annotation-plot")

                plot_annotations.sort(function(a, b) {
                    return parseInt(a.innerHTML) - parseInt(b.innerHTML)
                })

                plot_annotations.css(
                    "background",
                    function(index, value) {
                        return plot_colors[index]
                    }
                )

                if(is_initial) {
                    return
                }

                var x_range = dygraph.xAxisRange()
                var y_range = dygraph.yAxisRange()

                vm.min_zoom_x(moment(x_range[0]).format("DD/MM/YYYY HH:mm:ss"))
                vm.max_zoom_x(moment(x_range[1]).format("DD/MM/YYYY HH:mm:ss"))
            },
            interactionModel: plot_avg_interaction_model
        }
    )
    window.plot_avg = plot_avg

    plot_avg.ready(function() {
        helpers.makeAJAXRequest(
            "/api/app/plots/p_measurements",
            "get",
            function(err, result) {
                if(err) {
                    return console.error(err)
                }

                var data = result.map(function(v) {
                    return [new Date(v[0]), v[1], null]
                })

                plot_avg.updateOptions({
                    file: data
                })

                getTimelineEvents()
            }
        )
    })

    plot_main = dygraph_main.init()
    var line = $("#dygraph_container .line")[0]

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
        }
    })
    plot_main.ready(function(err, graph) {
        vm.selected_plots.subscribe(function(value) {
            var annotations = value

            if(annotations.length === 0) {
                plot_data = [[0, 0]]
                plot_labels = ["X", "Y1"]
            }
            else {
                while(plot_colors.length < annotations.length) {
                    plot_colors.push(randomColor({ luminosity: "dark" }))
                }

                var dates = vm.selected_points()

                plot_labels = ["Length"].concat(dates.map(formatDate))
                plot_data = _.map(plots[dates[0]], function(v) {
                    return [v[0]]
                })

                for(var i = 0; i < dates.length; i++) {
                    var date = dates[i]

                    for(var j = 0; j < plots[date].length; j++) {
                        var plot = plots[date]
                        plot_data[j].push(plot[j][1])
                    }
                }
            }

            plot_main.updateOptions({
                file: plot_data,
                labels: plot_labels,
                colors: plot_colors
            })
        })
    })

    is_inited = true
}

// main

var vm = {
    selected_points: ko.observableArray(),
    min_deviation: ko.observable(0),

    min_zoom_y: ko.observable(),
    max_zoom_y: ko.observable(),

    min_zoom_x: ko.observable(),
    max_zoom_x: ko.observable(),

    deviations: ko.observableArray(),
    timeline_events: ko.observableArray()
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

        vm.selected_points.removeAll()

        plot_main.updateOptions({
            file: [[0, 0]],
            labels: ["X", "Y1"]
        })
    }

    if(mode === "min_length") {
        $("#dygraph_container .line")[0].style.visibility = "hidden"
        vm.min_length(null)
        vm.selected_points.removeAll()
    }

    if(mode === "timeline_event") {
        vm.timeline_event_date(null)
        vm.timeline_event_description(null)
        vm.timeline_event_description(null)
    }
}

vm.current_mode = ko.observable("normal")

vm.current_mode.subscribe(clearModeData)
vm.current_mode.subscribe(clearModeData, null, "beforeChange")

vm.returnToNormalMode = function() {
    vm.current_mode("normal")
}

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

vm.timeline_event_short_text = ko.observable()
vm.timeline_event_description = ko.observable()
vm.timeline_event_date = ko.observable()

vm.addTimelineEvent = function() {
    vm.current_mode("timeline_event")
}

vm.saveTimelineEvent = function() {
    current_well.addTimelineEvent(
        {
            short_text: vm.timeline_event_short_text(),
            description: vm.timeline_event_description(),
            date: vm.timeline_event_date()
        },
        function(err, result) {
            if(err) {
                return console.error(err)
            }

            vm.current_mode("normal")
            getTimelineEvents()
        }
    )
}

vm.plot_colors = plot_colors

vm.moment = moment

vm.removePoint = function(data, event) {
    vm.selected_points.remove(function(item) {
        return item === data.x
    })
}

vm.downloadLAS = function(data, event) {
    var date = encodeURIComponent(formatDate(data.x))
    window.open(`/api/app/plots/las?date=${date}`)
}

vm.saveFavorite = function() {
    var x_avg = plot_avg.xAxisRange()
    var y_avg = plot_avg.yAxisRange()
    var x_main = plot_main.xAxisRange()
    var y_main = plot_main.yAxisRange()

    var points = ko.mapping.toJS(vm.selected_points())
    points = points.map(formatDate)

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

vm.getDeviations = function() {
    var min_deviation = parseFloat(vm.min_deviation())

    var x_avg = plot_avg.xAxisRange()
    var date_start = formatDate(x_avg[0])
    var date_end = formatDate(x_avg[1])

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

vm.selected_plots = ko.computed(function() {
    var points = vm.selected_points()
    var result = []

    points.sort(function(a, b) {
        return a - b
    })

    for(var i = 0; i < points.length; i++) {
        result.push({
            x: points[i]
        })
    }

    return result
})

vm.annotations = ko.computed(function() {
    var AVG_Y_AXIS = "Annotations"

    var selected_plots = vm.selected_plots()
    var deviations = vm.deviations()
    var timeline_events = vm.timeline_events()

    var result = []

    selected_plots.forEach(function(v, i) {
        result.push({
            series: AVG_Y_AXIS,
            x: v.x,
            shortText: i + 1,
            text: formatDate(v.x),
            cssClass: "dygraph-annotation-plot"
        })
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
vm.annotations.subscribe(function(value) {
    var file = plot_avg.file_

    value.forEach(function(annotation) {
        if(!file.find(function(v) {
            return v[0].getTime() === annotation.x
        })) {
            file.push([new Date(annotation.x), null, null])
        }
    })

    plot_avg.updateOptions({
        file: file
    })

    plot_avg.setAnnotations(value)
})

// avg graph params

var updateZoomX = function(value) {
    var min_moment = moment(vm.min_zoom_x(), "DD/MM/YYYY HH:mm:ss")
    var max_moment = moment(vm.max_zoom_x(), "DD/MM/YYYY HH:mm:ss")

    if(!min_moment.isValid() || !max_moment.isValid()) {
        return
    }

    plot_avg.updateOptions({
        dateWindow: [min_moment.valueOf(), max_moment.valueOf()],
        isZoomedIgnoreProgrammaticZoom: true
    })
}

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
}

vm.adjustRoll = ko.observable();
vm.adjustRoll.subscribe( function(val) {
	console.log("adjustRoll",val)
	plot_avg.adjustRoll(Number(val))
})

vm.is_main_plot_visible = ko.computed(function() {
    if(vm.current_mode() === "reference_point") {
        return !!vm.reference_date()
    }

    return vm.selected_points().length > 0
})

// exports

//export default vm
window.m_site.plots=vm
	})()
