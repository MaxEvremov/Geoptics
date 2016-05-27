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

            vm.graph_main.updateOptions({
                file: [[0, 0]],
                labels: ["X", "Y1"]
            })

            vm.is_editing_reference_point(false)
        }
    )
}

// TODO: перенести это в модель скважины (попутно создав эту самую модель)

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
    vm.selected_points.remove((item) => item.x === data.x)
}

let formatDate = (date) => moment(date).format("YYYY-MM-DD HH:mm:ssZ")

vm.downloadLAS = (data, event) => {
    let date = encodeURIComponent(formatDate(data.x))
    window.open(`/api/app/plots/las?date=${date}`)
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

    vm.graph_avg.updateOptions({
        dateWindow: [min_moment.valueOf(), max_moment.valueOf()],
        isZoomedIgnoreProgrammaticZoom: true
    })
}

let updateZoomY = (value) => {
    let min_zoom = parseFloat(vm.min_zoom_y())
    let max_zoom = parseFloat(vm.max_zoom_y())

    vm.graph_avg.updateOptions({
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
                well_id: 1 // TODO: поменять на настоящий id выбранной скважины
            },
            (err, result) => {
                if(err) {
                    return done(err)
                }

                let plot = result[0]

                if(vm.is_editing_reference_point()) {
                    vm.reference_date(formatDate(plot.date))

                    let plot_labels = ["Length", formatDate(plot.date)]

                    vm.graph_main.updateOptions({
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

vm.avg_options = {
    height: 150,
    labels: ["Date", "Pressure"],
    showRoller: true,
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
    animatedZooms: true
}

vm.avg_done = (err, graph) => {
    vm.graph_avg = graph

    vm.annotations.subscribe(value => {
        graph.setAnnotations(value)
    })

    helpers.makeAJAXRequest(
        "/api/app/plots/p_measurements",
        "get",
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

var dygraph_width = 600;
var dygraph_height = 300;
var dygraph_div_id = '#dygraph_container'

var changeEvent = function(c) {
    var new_c;

    if (document.createEvent) {
        new_c = document.createEvent('MouseEvent');
    }
    else if (document.createEventObject) {
        new_c = document.createEventObject();
    }

    // switch the x and y values for this mouse event by copying the old mouse event and inserting new x & y values, based on the position of the dygraph.
    // Dygraphs doesn't make use of screenX and screenY, so we can ignore those
    var new_x = $(dygraph_div_id).width()
        + $(dygraph_div_id).offset().left
        - (c.pageY - $(dygraph_div_id).offset().top)
        - $(window).scrollLeft()

    var new_y = $(dygraph_div_id).height()
        + $(dygraph_div_id).offset().top
        - (c.pageX - $(dygraph_div_id).offset().left)
        - $(window).scrollTop()

    new_c.initMouseEvent(
        c.type,
        c.bubbles,
        c.cancelable,
        c.view,
        c.detail,
        c.screenX,
        c.screenY,
        new_x,
        new_y,
        c.ctrlKey,
        c.altKey,
        c.shiftKey,
        c.metaKey,
        c.button,
        c.target
    )

    // call the original function, but with the new altered MouseEvent
    // Dygraph.Interaction.defaultModel[c.type]( new_c, b, a );
    return new_c
}

var restyle = function() {
    var xlabel_transform = 'rotate(180deg) translateY(-5px) rotateY(180deg)';
    $(dygraph_div_id + ' .dygraph-xlabel').parent().css({
        transform: xlabel_transform,
        msTransform: xlabel_transform,
        webkitTransform: xlabel_transform
    });

    var ylabel_transform = 'rotate(90deg) rotateY(180deg) translateY(-10px)';
    $(dygraph_div_id + ' .dygraph-ylabel').parent().css({
        transform: ylabel_transform,
        msTransform: ylabel_transform,
        webkitTransform: ylabel_transform
    });

    var axis_label_x_transform = 'translateY(17.5px) translateX(0.5px) rotate(90deg) rotateY(180deg)';
    $(dygraph_div_id + ' .dygraph-axis-label-x, ' + dygraph_div_id + ' .dygraph-axis-label-y').parent().css({
        transform: axis_label_x_transform,
        msTransform: axis_label_x_transform,
        webkitTransform: axis_label_x_transform
    });

    var axis_label_y_transform = 'translateX(17.5px) translateY(0.5px) rotate(90deg) rotateY(180deg)';
    $(dygraph_div_id + ' .dygraph-axis-label-y').parent().css({
        transform: axis_label_y_transform,
        msTransform: axis_label_y_transform,
        webkitTransform: axis_label_y_transform
    });

    var legend_transform = 'rotate(90deg) translateY(-5px) rotateY(180deg)';
    $(dygraph_div_id + ' .dygraph-legend').css({
        textAlign: 'right',
        top: '125px',
        left: (dygraph_width - 125) + 'px',
        transform: legend_transform,
        msTransform: legend_transform,
        webkitTransform: legend_transform
    });
}

vm.main_options = {
    height: dygraph_height,
    width: dygraph_width,
    ylabel: "Temperature (C)",
    // xlabel: "Length",
    drawCallback: restyle,
    clickCallback: (e, x, points) => {
        if(!vm.is_editing_reference_point()) {
            return
        }

        let point = points[0]

        vm.reference_length(point.xval)
        vm.reference_temp(point.yval)
    },
    axes: {
        x: { pixelsPerLabel: 30 },
        y: { pixelsPerLabel: 60 }
    },
    interactionModel: {
        mousedown: function(event, g, context) {
            event = changeEvent(event)
          // Right-click should not initiate a zoom.
          if (event.button && event.button == 2) return;

          context.initializeMouseDown(event, g, context);

          if (event.altKey || event.shiftKey) {
            Dygraph.startPan(event, g, context);
          } else {
            Dygraph.startZoom(event, g, context);
          }
        },

        // Draw zoom rectangles when the mouse is down and the user moves around
        mousemove: function(event, g, context) {
            event = changeEvent(event)
          if (context.isZooming) {
            Dygraph.moveZoom(event, g, context);
          } else if (context.isPanning) {
            Dygraph.movePan(event, g, context);
          }
        },

        mouseup: function(event, g, context) {
            event = changeEvent(event)
          if (context.isZooming) {
            Dygraph.endZoom(event, g, context);
          } else if (context.isPanning) {
            Dygraph.endPan(event, g, context);
          }
        },

        touchstart: function(event, g, context) {
            event = changeEvent(event)
          Dygraph.Interaction.startTouch(event, g, context);
        },
        touchmove: function(event, g, context) {
            event = changeEvent(event)
          Dygraph.Interaction.moveTouch(event, g, context);
        },
        touchend: function(event, g, context) {
            event = changeEvent(event)
          Dygraph.Interaction.endTouch(event, g, context);
        },

        // Temporarily cancel the dragging event when the mouse leaves the graph
        mouseout: function(event, g, context) {
            event = changeEvent(event)
          if (context.isZooming) {
            context.dragEndX = null;
            context.dragEndY = null;
            g.clearZoomRect_();
          }
        },

        // Disable zooming out if panning.
        dblclick: function(event, g, context) {
            event = changeEvent(event)
          if (context.cancelNextDblclick) {
            context.cancelNextDblclick = false;
            return;
          }
          if (event.altKey || event.shiftKey) {
            return;
          }
          g.resetZoom();
        }
    }
}

vm.main_done = (err, graph) => {
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

        vm.graph_main.updateOptions({
            file: plot_data,
            labels: plot_labels,
            colors: plot_colors
        })
    })
}

setTimeout(() => {
    var dygraph_transform = 'rotate(-90deg) rotateX(180deg) translateX(' + (dygraph_height - dygraph_width)/2 + 'px) translateY(' + ((dygraph_width - dygraph_height) / 2 - 30) + 'px)';
    $(dygraph_div_id).css({
        transform: dygraph_transform,
        msTransform: dygraph_transform,
        webkitTransform: dygraph_transform
    });

    vm.graph_main = new Dygraph($(dygraph_div_id)[0], [[0, 0]], vm.main_options)
    vm.graph_main.ready(vm.main_done)

    vm.graph_main.mousemove_func = vm.graph_main.mouseMove_;
    vm.graph_main.mouseMove_ = function(b) {
        // "b" is the MouseEvent object. Copy the object so we can edit it, since MouseEvent is read-only
        var new_b = $.extend(true, {}, b);
        // switch the x and y values for this mouse event... well, dygraphs only cares about the mouse X value in this case.
        new_b.pageX = $(dygraph_div_id).width() + $(dygraph_div_id).offset().left - (b.pageY - $(dygraph_div_id).offset().top) - $(window).scrollLeft();
        // call the original function, using the new MouseEvent
        vm.graph_main.mousemove_func(new_b);
    }

    let rect = $(dygraph_div_id)[0].getBoundingClientRect()

    $("#main_dygraph").css({
        width: rect.width + 50,
        height: rect.height + 50
    })
}, 0)

// exports

export default vm
