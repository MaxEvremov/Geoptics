(function() {
    var DYGRAPH_BOX_ID = "#dygraph_box"
    var DYGRAPH_BOX_BODY_ID = "#dygraph_box_body"
    var DYGRAPH_CONTAINER_ID = "#dygraph_container"

    var Y_OFFSET = 24

    // dygraph options

    var swapEventAxis = function(e) {
        var new_e

        if (document.createEvent) {
            new_e = document.createEvent('MouseEvent');
        }
        else if (document.createEventObject) {
            new_e = document.createEventObject();
        }

        var new_x = $(DYGRAPH_CONTAINER_ID).width()
            + $(DYGRAPH_CONTAINER_ID).offset().left
            - (e.pageY - $(DYGRAPH_CONTAINER_ID).offset().top)
            - $(window).scrollLeft() - Y_OFFSET

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

    var drawCallback = function() {
        var xlabel_transform = 'rotate(180deg) translateY(-5px) rotateY(180deg)'
        $(DYGRAPH_CONTAINER_ID + ' .dygraph-xlabel').parent().css({
			pointerEvents:"none",
            transform: xlabel_transform,
            msTransform: xlabel_transform,
            webkitTransform: xlabel_transform,
            "-webkit-filter": "blur(0.000001px)"
        })

        var ylabel_transform = 'rotate(90deg) rotateY(180deg) translateY(-10px)'
        $(DYGRAPH_CONTAINER_ID + ' .dygraph-ylabel').parent().css({
			pointerEvents:"none",
            transform: ylabel_transform,
            msTransform: ylabel_transform,
            webkitTransform: ylabel_transform,
            "-webkit-filter": "blur(0.000001px)"
        })

        var axis_label_x_transform = 'translateY(17px) translateX(0px) rotate(90deg) rotateY(180deg)'
        $(DYGRAPH_CONTAINER_ID + ' .dygraph-axis-label-x, ' + DYGRAPH_CONTAINER_ID + ' .dygraph-axis-label-y').parent().css({
			pointerEvents:"none",
            transform: axis_label_x_transform,
            msTransform: axis_label_x_transform,
            webkitTransform: axis_label_x_transform,
            "-webkit-filter": "blur(0.000001px)"
        })

        var axis_label_y_transform = 'translateX(17px) translateY(0px) rotate(90deg) rotateY(180deg)'
        $(DYGRAPH_CONTAINER_ID + ' .dygraph-axis-label-y').parent().css({
			pointerEvents:"none",
            transform: axis_label_y_transform,
            msTransform: axis_label_y_transform,
            webkitTransform: axis_label_y_transform,
            "-webkit-filter": "blur(0.000001px)"
        })

        var legend_transform = 'rotate(90deg) translateY(-5px) rotateY(180deg)'
        $(DYGRAPH_CONTAINER_ID + ' .dygraph-legend').css({
//            textAlign: 'right',
            transform: legend_transform,
            msTransform: legend_transform,
            webkitTransform: legend_transform,
            "-webkit-filter": "blur(0.000001px)"
        })

        var length_annotation_transform = 'rotateY(180deg)'
        $(DYGRAPH_CONTAINER_ID + ' .dygraph-annotation-length').css({
            transform: length_annotation_transform,
            msTransform: length_annotation_transform,
            webkitTransform: length_annotation_transform,
            "-webkit-filter": "blur(0.000001px)"
        })
    }

    var interactionModel = {
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

        touchstart: function() {},
        touchmove: function() {},
        touchend: function() {},

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

            g.resetZoom()
            g.updateOptions({ valueRange: [null, null] })
        }
    }

    // main

    var line

    var exports = {
        init: function() {
            var box_rect = $(DYGRAPH_BOX_ID)[0].getBoundingClientRect()

            var box_height = $(window).height() - box_rect.top

            if(window.innerWidth <= 992) {
                box_height /= 2
            }

            $(DYGRAPH_BOX_ID).css({
                height: box_height
            })

            var dygraph_width = $(DYGRAPH_BOX_BODY_ID).height()
            var dygraph_height = $(DYGRAPH_BOX_BODY_ID).width() - 28

            var translate_y = Math.round(((dygraph_width - dygraph_height) / 2) - Y_OFFSET)
            var translate_x = Math.round(-((dygraph_width - dygraph_height) / 2))

            var dygraph_transform = "rotate(-90deg) rotateX(180deg) translateY(" + translate_y + "px) translateX(" + translate_x + "px)"

            $(DYGRAPH_CONTAINER_ID).css({
                transform: dygraph_transform,
                msTransform: dygraph_transform,
                webkitTransform: dygraph_transform
            })

            var plot_main = new Dygraph(
                $(DYGRAPH_CONTAINER_ID)[0],
                [[0, 0]],
                {
                    height: dygraph_height,
                    width: dygraph_width,
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

            line = document.createElement("div")
            line.className = "line"
            $(DYGRAPH_CONTAINER_ID)[0].appendChild(line)

            return plot_main
        }
    }

    // exports

    window.dygraph_main = exports
})()
