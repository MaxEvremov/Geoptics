"use strict"

// imports

import ko from "knockout"
import mapping from "knockout-mapping"
import moment from "moment"
import Dygraph from "dygraphs"
import $ from "jquery"
import _ from "lodash"
import randomColor from "randomcolor"
import async from "async"

import * as helpers from "./helpers"

import dygraph_main from "./plot-main"

// const

const INIT_COLORS_NUMBER = 20

// helpers

let formatDate = (date) => moment(date).format("YYYY-MM-DD HH:mm:ssZ")

// init

let is_inited = false

let plots = {}
let plot_colors = []

for(let i = 0; i < INIT_COLORS_NUMBER; i++) {
    plot_colors.push(randomColor({ luminosity: "dark" }))
}

let plot_data = [[0, 0]]
let plot_labels = ["X", "Y1"]

let plot_avg = null
let plot_main = null

let getTimelineEvents = () => {
    helpers.makeAJAXRequest(
        "/api/app/plots/timeline_events",
        "post",
        {
            well_id: 1
        },
        (err, result) => {
            if(err) {
                return console.error(err)
            }

            vm.timeline_events(result || [])
        }
    )
}

let queue = async.queue(
    (date, done) => {
        let mode = vm.current_mode()

        helpers.makeAJAXRequest(
            "/api/app/plots/measurements",
            "post",
            {
                dates: formatDate(date),
                well_id: 1, // TODO: поменять на настоящий id выбранной скважины
                is_setting_min_length: mode === "min_length"
            },
            (err, result) => {
                if(err) {
                    return done(err)
                }

                let plot = result[0]

                if(mode === "reference_point") {
                    vm.reference_date(formatDate(plot.date))

                    let plot_labels = ["Length", formatDate(plot.date)]

                    plot_main.updateOptions({
                        file: plot.values,
                        labels: plot_labels
                    })

                    return done()
                }

                if(mode === "timeline_event") {
                    vm.timeline_event_date(formatDate(plot.date))

                    let plot_labels = ["Length", formatDate(plot.date)]

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

let init = () => {
    let plot_avg_interaction_model = Dygraph.Interaction.defaultModel
    plot_avg_interaction_model.dblclick = () => {}

    plot_avg = new Dygraph(
        $("#dygraph_avg_container")[0],
        [[0, 0, null]],
        {
            height: 150,
            labels: ["Date", "Pressure", "Annotations"],
            showRoller: true,
            connectSeparatedPoints: true,
            clickCallback: (e, x, points) => {
                let selected_date = points[0].xval
                queue.push(selected_date, (err) => {
                    if(err) {
                        console.error(err)
                    }
                })
            },
            zoomCallback: (min_date, max_date, y_ranges) => {
                vm.min_zoom_y(y_ranges[0][0])
                vm.max_zoom_y(y_ranges[0][1])
            },
            drawCallback: (dygraph, is_initial) => {
                let plot_annotations = $(".dygraphDefaultAnnotation.dygraph-annotation-plot")

                plot_annotations.sort((a, b) => parseInt(a.innerHTML) - parseInt(b.innerHTML))

                plot_annotations.css(
                    "background",
                    (index, value) => plot_colors[index]
                )

                if(is_initial) {
                    return
                }

                let x_range = dygraph.xAxisRange()
                let y_range = dygraph.yAxisRange()

                vm.min_zoom_x(moment(x_range[0]).format("DD/MM/YYYY HH:mm:ss"))
                vm.max_zoom_x(moment(x_range[1]).format("DD/MM/YYYY HH:mm:ss"))
            },
            interactionModel: plot_avg_interaction_model
        }
    )
    window.plot_avg = plot_avg

    plot_avg.ready(() => {
        helpers.makeAJAXRequest(
            "/api/app/plots/p_measurements",
            "get",
            (err, result) => {
                if(err) {
                    return console.error(err)
                }

                let data = result.map(v => [new Date(v[0]), v[1], null])

                plot_avg.updateOptions({
                    file: data
                })

                getTimelineEvents()
            }
        )
    })

    plot_main = dygraph_main.init()
    let line = $("#dygraph_container .line")[0]

    plot_main.updateOptions({
        clickCallback: (e, x, points) => {
            let mode = vm.current_mode()

            if(mode === "reference_point") {
                let point = points[0]

                vm.reference_length(point.xval)
                vm.reference_temp(point.yval)
            }

            if(mode === "min_length") {
                let point = points[0]

                let x = point.canvasx

                line.style.visibility = "visible"
                line.style.left = x + "px"

                vm.min_length(point.xval)
            }
        }
    })
    plot_main.ready((err, graph) => {
        vm.selected_plots.subscribe(value => {
            let annotations = value

            if(annotations.length === 0) {
                plot_data = [[0, 0]]
                plot_labels = ["X", "Y1"]
            }
            else {
                while(plot_colors.length < annotations.length) {
                    plot_colors.push(randomColor({ luminosity: "dark" }))
                }

                let dates = vm.selected_points()

                plot_labels = ["Length"].concat(dates.map(formatDate))
                plot_data = _.map(plots[dates[0]], v => [v[0]])

                for(let i = 0; i < dates.length; i++) {
                    let date = dates[i]

                    for(let j = 0; j < plots[date].length; j++) {
                        let plot = plots[date]
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

let vm = {
    selected_points: ko.observableArray(),
    min_deviation: ko.observable(0),

    min_zoom_y: ko.observable(),
    max_zoom_y: ko.observable(),

    min_zoom_x: ko.observable(),
    max_zoom_x: ko.observable(),

    deviations: ko.observableArray(),
    timeline_events: ko.observableArray()
}

vm.afterShow = () => {
    if(!is_inited) {
        setTimeout(() => init(), 100) // TODO: говнокод, нужный для того, чтобы pager.js не запускал инит до загрузки страницы. По-хорошему, нужно попатчить afterShow у pager.js, чтобы не писать такое говно.
    }

    if(plot_avg) {
        setTimeout(() => plot_avg.resize(), 0)
    }

    if(plot_main) {
        setTimeout(() => plot_main.resize(), 0)
    }
}

// TODO: перенести это в модель скважины (попутно создав эту самую модель)

vm.are_settings_enabled = ko.observable(false)
vm.toggleSettings = () => {
    vm.are_settings_enabled(!vm.are_settings_enabled())
}

let clearModeData = (mode) => {
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

vm.returnToNormalMode = () => {
    vm.current_mode("normal")
}

vm.editReferencePoint = () => {
    vm.current_mode("reference_point")
}

vm.reference_date = ko.observable()
vm.reference_temp = ko.observable()
vm.reference_length = ko.observable()

vm.saveReferencePoint = () => {
    helpers.makeAJAXRequest(
        "/api/app/plots/reference_point",
        "post",
        {
            date: vm.reference_date(),
            temp: vm.reference_temp(),
            length: vm.reference_length(),
            well_id: 1 // TODO: поменять на настоящий id скважины
        },
        (err, result) => {
            if(err) {
                return console.error(err)
            }

            vm.current_mode("normal")
        }
    )
}

vm.min_length = ko.observable(0)

vm.setMinLength = () => {
    vm.current_mode("min_length")
}

vm.saveMinLength = () => {
    helpers.makeAJAXRequest(
        "/api/app/plots/min_length",
        "post",
        {
            min_length: vm.min_length(),
            well_id: 1 // TODO: поменять на настоящий id скважины
        },
        (err, result) => {
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

vm.addTimelineEvent = () => {
    vm.current_mode("timeline_event")
}

vm.saveTimelineEvent = () => {
    helpers.makeAJAXRequest(
        "/api/app/plots/timeline_event",
        "post",
        {
            short_text: vm.timeline_event_short_text(),
            description: vm.timeline_event_description(),
            date: vm.timeline_event_date(),
            well_id: 1
        },
        (err, result) => {
            if(err) {
                return console.error(err)
            }

            vm.current_mode("normal")
            getTimelineEvents()
        }
    )
}

// TODO: перенести это в модель скважины (попутно создав эту самую модель)

vm.plot_colors = plot_colors

vm.moment = moment

vm.removePoint = (data, event) => {
    vm.selected_points.remove((item) => item === data.x)
}

vm.downloadLAS = (data, event) => {
    let date = encodeURIComponent(formatDate(data.x))
    window.open(`/api/app/plots/las?date=${date}`)
}

vm.saveFavorite = () => {
    let x_avg = plot_avg.xAxisRange()
    let y_avg = plot_avg.yAxisRange()
    let x_main = plot_main.xAxisRange()
    let y_main = plot_main.yAxisRange()

    let points = mapping.toJS(vm.selected_points())
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
        (err, result) => {
            if(err) {
                return console.error(err)
            }
        }
    )
}

vm.getDeviations = () => {
    let min_deviation = parseFloat(vm.min_deviation())

    let x_avg = plot_avg.xAxisRange()
    let date_start = formatDate(x_avg[0])
    let date_end = formatDate(x_avg[1])

    helpers.makeAJAXRequest(
        "/api/app/plots/deviations",
        "post",
        {
            min_deviation: min_deviation,
            date_start: date_start,
            date_end: date_end
        },
        (err, result) => {
            if(err) {
                return console.error(err)
            }

            vm.deviations(result)
        }
    )
}

// computed observables

vm.selected_plots = ko.computed(() => {
    let points = vm.selected_points()
    let result = []

    points.sort((a, b) => a - b)

    for(let i = 0; i < points.length; i++) {
        result.push({
            x: points[i]
        })
    }

    return result
})

vm.annotations = ko.computed(() => {
    const AVG_Y_AXIS = "Annotations"

    let selected_plots = vm.selected_plots()
    let deviations = vm.deviations()
    let timeline_events = vm.timeline_events()

    let result = []

    selected_plots.forEach((v, i) => {
        result.push({
            series: AVG_Y_AXIS,
            x: v.x,
            shortText: i + 1,
            text: formatDate(v.x),
            cssClass: "dygraph-annotation-plot"
        })
    })

    deviations.forEach((v) => {
        result.push({
            series: AVG_Y_AXIS,
            x: Date.parse(v.date),
            shortText: "!",
            text: `Отклонение на ${v.length} м. Температура: ${v.temp}°. Образец: ${v.norm_temp}°.`,
            cssClass: "dygraph-annotation-deviation"
        })
    })

    timeline_events.forEach((v) => {
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
vm.annotations.subscribe((value) => {
    let file = plot_avg.file_

    value.forEach(annotation => {
        if(!file.find(v => v[0].getTime() === annotation.x)) {
            file.push([new Date(annotation.x), null, null])
        }
    })

    plot_avg.updateOptions({
        file: file
    })

    plot_avg.setAnnotations(value)
})

// avg graph params

let updateZoomX = (value) => {
    let min_moment = moment(vm.min_zoom_x(), "DD/MM/YYYY HH:mm:ss")
    let max_moment = moment(vm.max_zoom_x(), "DD/MM/YYYY HH:mm:ss")

    if(!min_moment.isValid() || !max_moment.isValid()) {
        return
    }

    plot_avg.updateOptions({
        dateWindow: [min_moment.valueOf(), max_moment.valueOf()],
        isZoomedIgnoreProgrammaticZoom: true
    })
}

let updateZoomY = (value) => {
    let min_zoom = parseFloat(vm.min_zoom_y())
    let max_zoom = parseFloat(vm.max_zoom_y())

    plot_avg.updateOptions({
        valueRange: [min_zoom, max_zoom],
        isZoomedIgnoreProgrammaticZoom: true
    })
}

vm.min_zoom_x.subscribe(updateZoomX)
vm.max_zoom_x.subscribe(updateZoomX)

vm.min_zoom_y.subscribe(updateZoomY)
vm.max_zoom_y.subscribe(updateZoomY)

vm.resetAvgPlotZoom = () => {
    plot_avg.resetZoom()
}

vm.is_main_plot_visible = ko.computed(() => {
    if(vm.current_mode() === "reference_point") {
        return !!vm.reference_date()
    }

    return vm.selected_points().length > 0
})

// exports

export default vm
