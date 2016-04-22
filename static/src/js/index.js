"use strict"

// imports

import Dygraph from "dygraphs"
import $ from "jquery"
import _ from "lodash"
import ko from "knockout"
import moment from "moment"
import Pager from "pagerjs"

import * as lib from "./lib"

// view model

let vm = {
    current_page: ko.observable(),
    selected_points: ko.observableArray()
}

vm.moment = moment

vm.removePoint = (data, event) => {
    vm.selected_points.remove(function(item) {
        return item === data.x
    })
}

let plots = {}

let plot_data = [[0, 0]]
let plot_colors = [
    "#1f77b4",
    "#aec7e8",
    "#ff7f0e",
    "#ffbb78",
    "#2ca02c",
    "#98df8a",
    "#d62728",
    "#ff9896",
    "#9467bd",
    "#c5b0d5",
    "#8c564b",
    "#c49c94",
    "#e377c2",
    "#f7b6d2",
    "#7f7f7f",
    "#c7c7c7",
    "#bcbd22",
    "#dbdb8d",
    "#17becf",
    "#9edae5"
]
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

// init

$(document).ready(() => {
    let pager = new Pager($, ko)

    pager.Href.hash = "#!/"
    pager.extendWithPage(vm)

    ko.applyBindings(vm)
    pager.start()

    $(window).bind("hashchange", function() {
        console.log(pager.page)
        vm.current_page(pager.page.route[0])
    })

    vm.current_page(pager.page.route[0])

    let createDygraphs = () => {
        let avg = document.getElementById("avg")
        let main = document.getElementById("main")

        let graph_avg = new Dygraph(
            avg,
            [[0, 0]],
            {
                height: 200,
                labels: ["Date", "Temperature"],
                clickCallback: (e, x, points) => {
                    let selected_date = points[0].xval

                    if(vm.selected_points.indexOf(selected_date) !== -1) {
                        return
                    }

                    if(plots.hasOwnProperty(selected_date)) {
                        return vm.selected_points.push(selected_date)
                    }

                    lib.makeAJAXRequest(
                        "/api/measurements",
                        "post",
                        {
                            date_start: selected_date,
                            date_end: selected_date
                        },
                        (err, result) => {
                            if(err) {
                                return console.error(err)
                            }

                            let data = result.data

                            plots[selected_date] = data
                            vm.selected_points.push(selected_date)
                        }
                    )
                }
            }
        )

        vm.annotations.subscribe(value => {
            let annotations = vm.annotations()

            graph_avg.setAnnotations(vm.annotations())

            if(annotations.length === 0) {
                plot_data = [[0, 0]]
                plot_labels = ["X", "Y1"]
            } else {
                let dates = _.map(annotations, v => v.x)
                plot_labels = ["Length"].concat(_.map(dates,
                    v => moment(v).format("DD-MM-YYYY HH:mm:ss")))
                plot_data = _.map(plots[dates[0]], v => [v[0]])

                for(let i = 0; i < dates.length; i++) {
                    let date = dates[i]

                    for(let j = 0; j < plots[date].length; j++) {
                        let plot = plots[date]
                        plot_data[j].push(plot[j][1])
                    }
                }
            }

            graph_main.updateOptions({
                file: plot_data,
                labels: plot_labels,
                colors: plot_colors
            })
        })

        let graph_main = new Dygraph(
            main,
            [[0,0]],
            {
                height: 500,
                ylabel: "Temperature (C)",
                xlabel: "Length"
            }
        )

        $.ajax({
            url: "http://localhost:7777/api/init",
            type: "post",
            dataType: "JSON",
            contentType: "application/json",
            success: (answer, code) => {
                console.timeEnd("request")

                let err = answer.err
                let result = answer.result

                let data = _.map(result.data, v => [new Date(v[0]), v[1]])

                graph_avg.updateOptions({
                    file: data
                })
            },
            error: () => {
                console.error("error")
            }
        })
    }

    // TODO: заставить pager.js кидать событие после завершения инита и ориентироваться на него
    setTimeout(() => createDygraphs(), 0)

})
