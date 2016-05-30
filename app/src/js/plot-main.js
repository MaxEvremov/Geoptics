"use strict"

// imports

import $ from "jquery"
import Dygraph from "dygraphs"

// const

const DYGRAPH_BOTTOM_OFFSET = 50
const DYGRAPH_PADDING = 50

const DYGRAPH_BOX_ID = "#dygraph_box"
const DYGRAPH_BOX_BODY_ID = "#main_dygraph"
const DYGRAPH_CONTAINER_ID = "#dygraph_container"

// dygraph options

let swapEventAxis = (e) => {
    let new_e

    if (document.createEvent) {
        new_e = document.createEvent('MouseEvent');
    }
    else if (document.createEventObject) {
        new_e = document.createEventObject();
    }

    var new_x = $(DYGRAPH_CONTAINER_ID).width()
        + $(DYGRAPH_CONTAINER_ID).offset().left
        - (e.pageY - $(DYGRAPH_CONTAINER_ID).offset().top)
        - $(window).scrollLeft()

    var new_y = $(DYGRAPH_CONTAINER_ID).height()
        + $(DYGRAPH_CONTAINER_ID).offset().top
        - (e.pageX - $(DYGRAPH_CONTAINER_ID).offset().left)
        - $(window).scrollTop()

    new_e.initMouseEvent(
        e.type,
        e.bubbles,
        e.cancelable,
        e.view,
        e.detail,
        e.screenX,
        e.screenY,
        new_x,
        new_y,
        e.ctrlKey,
        e.altKey,
        e.shiftKey,
        e.metaKey,
        e.button,
        e.target
    )

    return new_e
}

let drawCallback = () => {
    let xlabel_transform = 'rotate(180deg) translateY(-5px) rotateY(180deg)'
    $(DYGRAPH_CONTAINER_ID + ' .dygraph-xlabel').parent().css({
        transform: xlabel_transform,
        msTransform: xlabel_transform,
        webkitTransform: xlabel_transform
    })

    let ylabel_transform = 'rotate(90deg) rotateY(180deg) translateY(-10px)'
    $(DYGRAPH_CONTAINER_ID + ' .dygraph-ylabel').parent().css({
        transform: ylabel_transform,
        msTransform: ylabel_transform,
        webkitTransform: ylabel_transform
    })

    let axis_label_x_transform = 'translateY(17.5px) translateX(0.5px) rotate(90deg) rotateY(180deg)'
    $(DYGRAPH_CONTAINER_ID + ' .dygraph-axis-label-x, ' + DYGRAPH_CONTAINER_ID + ' .dygraph-axis-label-y').parent().css({
        transform: axis_label_x_transform,
        msTransform: axis_label_x_transform,
        webkitTransform: axis_label_x_transform
    })

    let axis_label_y_transform = 'translateX(17.5px) translateY(0.5px) rotate(90deg) rotateY(180deg)'
    $(DYGRAPH_CONTAINER_ID + ' .dygraph-axis-label-y').parent().css({
        transform: axis_label_y_transform,
        msTransform: axis_label_y_transform,
        webkitTransform: axis_label_y_transform
    })

    let legend_transform = 'rotate(90deg) translateY(-5px) rotateY(180deg)'
    $(DYGRAPH_CONTAINER_ID + ' .dygraph-legend').css({
        textAlign: 'right',
        transform: legend_transform,
        msTransform: legend_transform,
        webkitTransform: legend_transform
    })
}

let interactionModel = {
    mousedown: function(event, g, context) {
        event = swapEventAxis(event)

        if (event.button && event.button == 2) return;

        context.initializeMouseDown(event, g, context);

        if (event.altKey || event.shiftKey) {
            Dygraph.startPan(event, g, context);
        } else {
            Dygraph.startZoom(event, g, context);
        }
    },

    mousemove: function(event, g, context) {
        event = swapEventAxis(event)
        if (context.isZooming) {
            Dygraph.moveZoom(event, g, context);
        } else if (context.isPanning) {
            Dygraph.movePan(event, g, context);
        }
    },

    mouseup: function(event, g, context) {
        event = swapEventAxis(event)
        if (context.isZooming) {
            Dygraph.endZoom(event, g, context);
        } else if (context.isPanning) {
            Dygraph.endPan(event, g, context);
        }
    },

    touchstart: function(event, g, context) {
        event = swapEventAxis(event)
        Dygraph.Interaction.startTouch(event, g, context);
    },
    touchmove: function(event, g, context) {
        event = swapEventAxis(event)
        Dygraph.Interaction.moveTouch(event, g, context);
    },
    touchend: function(event, g, context) {
        event = swapEventAxis(event)
        Dygraph.Interaction.endTouch(event, g, context);
    },

    mouseout: function(event, g, context) {
        event = swapEventAxis(event)
        if (context.isZooming) {
            context.dragEndX = null;
            context.dragEndY = null;
            g.clearZoomRect_();
        }
    },

    dblclick: function(event, g, context) {
        event = swapEventAxis(event)
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

// main

let exports = {
    init: () => {
        let box_rect = $(DYGRAPH_BOX_ID)[0].getBoundingClientRect()

        let box_height = $(window).height() - box_rect.top - DYGRAPH_BOTTOM_OFFSET

        $(DYGRAPH_BOX_ID).css({
            height: box_height
        })

        let dygraph_width = $(DYGRAPH_BOX_BODY_ID).height() - DYGRAPH_PADDING
        let dygraph_height = $(DYGRAPH_BOX_BODY_ID).width() - DYGRAPH_PADDING

        let dygraph_transform = `rotate(-90deg) rotateX(180deg) translateY(${ ((dygraph_width - dygraph_height) / 2) - 20}px) translateX(${-box_rect.top - 50}px)`

        $(DYGRAPH_CONTAINER_ID).css({
            transform: dygraph_transform,
            msTransform: dygraph_transform,
            webkitTransform: dygraph_transform
        })

        let plot_main = new Dygraph(
            $(DYGRAPH_CONTAINER_ID)[0],
            [[0, 0]],
            {
                height: dygraph_height,
                width: dygraph_width,
                ylabel: "Temperature (C)",
                drawCallback: drawCallback,
                axes: {
                    x: { pixelsPerLabel: 30 },
                    y: { pixelsPerLabel: 60 }
                },
                interactionModel: interactionModel
            }
        )

        plot_main.mousemove_func = plot_main.mouseMove_;
        plot_main.mouseMove_ = function(b) {
            var new_b = $.extend(true, {}, b)

            new_b.pageX = $(DYGRAPH_CONTAINER_ID).width()
                + $(DYGRAPH_CONTAINER_ID).offset().left
                - (b.pageY - $(DYGRAPH_CONTAINER_ID).offset().top)
                - $(window).scrollLeft()

            plot_main.mousemove_func(new_b)
        }

        return plot_main
    }
}

// exports

export default exports
