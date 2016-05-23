"use strict"

// imports

import ko from "knockout"
import mapping from "knockout-mapping"
import moment from "moment"
import Dygraph from "dygraphs"
import $ from "jquery"
import _ from "lodash"
import randomColor from "randomcolor"

import * as helpers from "./helpers"

// const

const INIT_COLORS_NUMBER = 20

// main

let plot_colors = []

for(let i = 0; i < INIT_COLORS_NUMBER; i++) {
    plot_colors.push(randomColor({ luminosity: "dark" }))
}

let vm = {
    selected_points: ko.observableArray(),
    min_deviation: ko.observable(0),

    min_zoom_y: ko.observable(),
    max_zoom_y: ko.observable(),

    min_zoom_x: ko.observable(),
    max_zoom_x: ko.observable()
}

vm.plot_colors = plot_colors

vm.graph_avg = null
vm.graph_main = null

vm.moment = moment

vm.afterShow = () => {
    if(vm.graph_avg) {
        setTimeout(() => vm.graph_avg.resize(), 0)
    }

    if(vm.graph_main) {
        setTimeout(() => vm.graph_main.resize(), 0)
    }
}

vm.removePoint = (data, event) => {
    vm.selected_points.remove(function(item) {
        return item === data.x
    })
}

let formatDate = (date) => moment(date).format("YYYY-MM-DD HH:mm:ssZ")

vm.downloadLAS = (data, event) => {
    window.open(`/api/app/plots/las?date=${encodeURIComponent(formatDate(data.x))}`)
}

vm.saveFavorite = () => {
    let x_avg = vm.graph_avg.xAxisRange()
    let y_avg = vm.graph_avg.yAxisRange()
    let x_main = vm.graph_main.xAxisRange()
    let y_main = vm.graph_main.yAxisRange()

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

    let x_avg = vm.graph_avg.xAxisRange()
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

            vm.graph_avg.setAnnotations(annotations)
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

    for(let i = 0; i < points.length; i++) {
        result.push({
            series: "Temperature",
            x: points[i],
            shortText: i + 1
        })
    }

    return result
})

// avg graph params

vm.min_zoom_y.subscribe((value) => {
    let min_zoom = parseFloat(vm.min_zoom_y())
    let max_zoom = parseFloat(vm.max_zoom_y())

    vm.graph_avg.updateOptions({
        valueRange: [min_zoom, max_zoom],
        isZoomedIgnoreProgrammaticZoom: true
    })
})

vm.max_zoom_y.subscribe((value) => {
    let min_zoom = parseFloat(vm.min_zoom_y())
    let max_zoom = parseFloat(vm.max_zoom_y())

    vm.graph_avg.updateOptions({
        valueRange: [min_zoom, max_zoom],
        isZoomedIgnoreProgrammaticZoom: true
    })
})

vm.min_zoom_x.subscribe((value) => {
    let min_moment = moment(vm.min_zoom_x(), "DD/MM/YYYY HH:mm:ss")
    let max_moment = moment(vm.max_zoom_x(), "DD/MM/YYYY HH:mm:ss")

    if(!min_moment.isValid() || !max_moment.isValid()) {
        return
    }

    vm.graph_avg.updateOptions({
        dateWindow: [min_moment.valueOf(), max_moment.valueOf()],
        isZoomedIgnoreProgrammaticZoom: true
    })
})

vm.max_zoom_x.subscribe((value) => {
    let min_moment = moment(vm.min_zoom_x(), "DD/MM/YYYY HH:mm:ss")
    let max_moment = moment(vm.max_zoom_x(), "DD/MM/YYYY HH:mm:ss")

    if(!min_moment.isValid() || !max_moment.isValid()) {
        return
    }

    vm.graph_avg.updateOptions({
        dateWindow: [min_moment.valueOf(), max_moment.valueOf()],
        isZoomedIgnoreProgrammaticZoom: true
    })
})

vm.avg_options = {
    height: 150,
    labels: ["Date", "Temperature"],
    showRoller: true,
    clickCallback: (e, x, points) => {
        console.log(e)
        let selected_date = points[0].xval

        if(vm.selected_points.indexOf(selected_date) !== -1) {
            return
        }

        if(plots.hasOwnProperty(selected_date)) {
            return vm.selected_points.push(selected_date)
        }

        helpers.makeAJAXRequest(
            "/api/app/plots/measurements",
            "post",
            {
                dates: formatDate(selected_date)
            },
            (err, result) => {
                if(err) {
                    return console.error(err)
                }

                plots[selected_date] = result[0].values
                vm.selected_points.push(selected_date)
            }
        )
    },
    zoomCallback: (min_date, max_date, y_ranges) => {
        vm.min_zoom_y(y_ranges[0][0])
        vm.max_zoom_y(y_ranges[0][1])
        // vm.min_zoom_x(moment(min_date).format("DD/MM/YYYY HH:mm:ss"))
        // vm.max_zoom_x(moment(max_date).format("DD/MM/YYYY HH:mm:ss"))
    },
    drawCallback: (dygraph, is_initial) => {
        if(is_initial) {
            return
        }

        let x_range = dygraph.xAxisRange()
        let y_range = dygraph.yAxisRange()

        // vm.min_zoom_y(y_range[0][0])
        // vm.max_zoom_y(y_range[0][1])
        vm.min_zoom_x(moment(x_range[0]).format("DD/MM/YYYY HH:mm:ss"))
        vm.max_zoom_x(moment(x_range[1]).format("DD/MM/YYYY HH:mm:ss"))
    },
    animatedZooms: true
}

vm.avg_done = (err, graph) => {
    vm.graph_avg = graph

    vm.annotations.subscribe(value => {
        graph.setAnnotations(value)
    })

    helpers.makeAJAXRequest(
        "/api/app/plots/init",
        // "/api/app/plots/moving_avg",
        "post",
        (err, result) => {
            if(err) {
                return console.error(err)
            }

            let data = _.map(result, v => [new Date(v[0]), v[1]])

            graph.updateOptions({
                file: data
            })
        }
    )
}

// main graph params

vm.main_options = {
    height: 300,
    ylabel: "Temperature (C)",
    xlabel: "Length"
}

vm.main_done = (err, graph) => {
    vm.graph_main = graph

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

            let dates = _.map(annotations, v => v.x)

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

        $(".dygraphDefaultAnnotation").css(
            "color",
            (index, value) => plot_colors[index]
        )

        graph.updateOptions({
            file: plot_data,
            labels: plot_labels,
            colors: plot_colors
        })
    })
}

// exports

export default vm
