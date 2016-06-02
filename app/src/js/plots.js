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

// const

const INIT_COLORS_NUMBER = 20

// init

let plot_colors = []

for(let i = 0; i < INIT_COLORS_NUMBER; i++) {
    plot_colors.push(randomColor({ luminosity: "dark" }))
}

// main

let vm = {
    selected_points: ko.observableArray(),
    min_deviation: ko.observable(0),

    min_zoom_y: ko.observable(),
    max_zoom_y: ko.observable(),

    min_zoom_x: ko.observable(),
    max_zoom_x: ko.observable()
}

// TODO: перенести это в модель скважины (попутно создав эту самую модель)

vm.are_settings_enabled = ko.observable(false)
vm.toggleSettings = () => {
    vm.are_settings_enabled(!vm.are_settings_enabled())
}

vm.is_editing_reference_point = ko.observable(false)
vm.editReferencePoint = () => {
    if(vm.is_editing_reference_point()) {
        return
    }

    if(vm.is_setting_min_length()) {
        vm.cancelSettingMinLength()
    }

    vm.reference_date(null)
    vm.reference_temp(null)
    vm.reference_length(null)

    vm.selected_points.removeAll()

    vm.is_editing_reference_point(true)
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

            vm.reference_date(null)
            vm.reference_temp(null)
            vm.reference_length(null)

            plot_main.updateOptions({
                file: [[0, 0]],
                labels: ["X", "Y1"]
            })

            vm.is_editing_reference_point(false)
        }
    )
}

vm.cancelEditingReferencePoint = () => {
    vm.reference_date(null)
    vm.reference_temp(null)
    vm.reference_length(null)

    vm.is_editing_reference_point(false)
}

vm.min_length = ko.observable(0)

vm.is_setting_min_length = ko.observable(false)

vm.setMinLength = () => {
    if(vm.is_setting_min_length()) {
        return
    }

    if(vm.is_editing_reference_point()) {
        vm.cancelEditingReferencePoint()
    }

    vm.min_length(0)
    vm.is_setting_min_length(true)
    vm.selected_points.removeAll()
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

            $("#dygraph_container .line")[0].style.visibility = "hidden"
            vm.selected_points.removeAll()
            vm.min_length(0)
            vm.is_setting_min_length(false)
        }
    )
}

vm.cancelSettingMinLength = () => {
    $("#dygraph_container .line")[0].style.visibility = "hidden"
    vm.selected_points.removeAll()
    vm.min_length(0)
    vm.is_setting_min_length(false)
}

// TODO: перенести это в модель скважины (попутно создав эту самую модель)

vm.plot_colors = plot_colors

let plot_avg = null

vm.moment = moment

vm.removePoint = (data, event) => {
    vm.selected_points.remove((item) => item.x === data.x)
}

let formatDate = (date) => moment(date).format("YYYY-MM-DD HH:mm:ssZ")

vm.downloadLAS = (data, event) => {
    let date = encodeURIComponent(formatDate(data.x))
    window.open(`/api/app/plots/las?date=${date}`)
}

vm.saveFavorite = () => {
    let x_avg = plot_avg.xAxisRange()
    let y_avg = plot_avg.yAxisRange()
    let x_main = plot_main.xAxisRange()
    let y_main = plot_main.yAxisRange()

    let points = ko.mapping.toJS(vm.selected_points())
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

            let annotations = result.map(v => ({
                series: "Temperature",
                x: Date.parse(v.date),
                shortText: "!",
                text: `Отклонение на ${v.length} м. Температура: ${v.temp}°. Образец: ${v.norm_temp}°.`
            }))

            plot_avg.setAnnotations(annotations)
        }
    )
}

let plots = {}
vm.plots = plots

let plot_data = [[0, 0]]
let plot_labels = ["X", "Y1"]

// computed observables

vm.annotations = ko.computed(() => {
    let points = vm.selected_points()
    let result = []

    points.sort((a, b) => a.x - b.x)

    for(let i = 0; i < points.length; i++) {
        result.push({
            series: "Pressure",
            x: points[i].x,
            shortText: i + 1,
            text: formatDate(points[i].plot_date),
            attachAtBottom: true
        })
    }

    return result
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

let queue = async.queue(
    (date, done) => {
        helpers.makeAJAXRequest(
            "/api/app/plots/measurements",
            "post",
            {
                dates: formatDate(date),
                well_id: 1, // TODO: поменять на настоящий id выбранной скважины
                is_setting_min_length: vm.is_setting_min_length()
            },
            (err, result) => {
                if(err) {
                    return done(err)
                }

                let plot = result[0]

                if(vm.is_editing_reference_point()) {
                    vm.reference_date(formatDate(plot.date))

                    let plot_labels = ["Length", formatDate(plot.date)]

                    plot_main.updateOptions({
                        file: plot.values,
                        labels: plot_labels
                    })

                    return done()
                }

                if(vm.selected_points().find(
                    (point) => point.plot_date === plot.date)
                ) {
                    return done()
                }

                plots[plot.date] = plot.values
                vm.selected_points.push({
                    x: date,
                    plot_date: plot.date
                })

                done()
            }
        )
    },
    1
)

let plot_main

let is_inited = false

let init = () => {
    let plot_avg_interaction_model = Dygraph.Interaction.defaultModel
    plot_avg_interaction_model.dblclick = () => {}

    plot_avg = new Dygraph(
        $("#dygraph_avg_container")[0],
        [[0, 0]],
        {
            height: 150,
            labels: ["Date", "Pressure"],
            showRoller: false,
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
                $(".dygraphDefaultAnnotation").css(
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
            animatedZooms: true,
            interactionModel: plot_avg_interaction_model
        }
    )

    plot_avg.ready(() => {
        vm.annotations.subscribe(value => {
            plot_avg.setAnnotations(value)
        })

        helpers.makeAJAXRequest(
            "/api/app/plots/p_measurements",
            "get",
            (err, result) => {
                if(err) {
                    return console.error(err)
                }

                let data = _.map(result, v => [new Date(v[0]), v[1]])

                plot_avg.updateOptions({
                    file: data
                })
            }
        )
    })

    plot_main = dygraph_main.init()
    let line = $("#dygraph_container .line")[0]

    plot_main.updateOptions({
        clickCallback: (e, x, points) => {
            if(vm.is_editing_reference_point()) {
                let point = points[0]

                vm.reference_length(point.xval)
                vm.reference_temp(point.yval)
            }

            if(vm.is_setting_min_length()) {
                let point = points[0]

                let x = point.canvasx

                line.style.visibility = "visible"
                line.style.left = x + "px"

                vm.min_length(point.xval)
            }
        }
    })
    plot_main.ready((err, graph) => {
        vm.annotations.subscribe(value => {
            let annotations = value

            if(annotations.length === 0) {
                plot_data = [[0, 0]]
                plot_labels = ["X", "Y1"]
            }
            else {
                while(plot_colors.length < annotations.length) {
                    plot_colors.push(randomColor({ luminosity: "dark" }))
                }

                let dates = vm.selected_points().map(point => point.plot_date)

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
setTimeout(function(){
	vm.adjustRoll(100)
},1000)
    is_inited = true
}

vm.adjustRoll = ko.observable();
vm.adjustRoll.subscribe( function(val) {
	console.log("adjustRoll",val)
	plot_avg.adjustRoll(Number(val))
})

vm.resetAvgPlotZoom = function() {
    plot_avg.resetZoom()
}

vm.afterShow = () => {
    if(!is_inited) {
        setTimeout(() => init(), 500) // TODO: говнокод, нужный для того, чтобы pager.js не запускал инит до загрузки страницы. По-хорошему, нужно попатчить afterShow у pager.js, чтобы не писать такое говно.
    }

    if(plot_avg) {
        setTimeout(() => plot_avg.resize(), 0)
    }

    if(plot_main) {
        setTimeout(() => plot_main.resize(), 0)
    }
}

vm.is_main_plot_visible = ko.computed(() => {
    if(vm.is_editing_reference_point()) {
        return !!vm.reference_date()
    }

    return vm.selected_points().length > 0
})

// exports

//export default vm
window.m_site.plots=vm
	})()