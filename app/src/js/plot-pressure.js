window.dygraph_pressure = (function() {
    var self = {
        init: function(drawPlot) {
            var plot_avg_interaction_model = _.cloneDeep(Dygraph.Interaction.defaultModel)

            plot_avg_interaction_model.dblclick = function() {}
            plot_avg_interaction_model.mousedown = function(event, g, context) {
                var mouseup = function(event) {
                    if (context.isPanning) {
                        drawPlot()
                    }

                    Dygraph.removeEvent(document, 'mouseup', mouseup)
                }

                g.addAndTrackEvent(document, 'mouseup', mouseup)

                Dygraph.Interaction.defaultModel.mousedown(event, g, context)
            }

            return new Dygraph(
                $("#dygraph_avg_container")[0],
                [[0, 0]],
                {
                    height: 150,
                    labels: ["Date", "Pressure"],
                    connectSeparatedPoints: true,
                    zoomCallback: drawPlot,
                    interactionModel: plot_avg_interaction_model
                }
            )
        }
    }

    return self
})()
