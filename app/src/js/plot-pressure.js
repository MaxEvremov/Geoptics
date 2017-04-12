window.dygraph_pressure = (function() {
    var self = {
        init: function(drawPlot) {
            var plot_avg_interaction_model = _.cloneDeep(Dygraph.Interaction.defaultModel)

            plot_avg_interaction_model.dblclick = function(event, g, context) {
				window.m_site.plots.resetPlotAvgState()
				return false
			}
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

            plot_avg_interaction_model.touchstart = function() {}
            plot_avg_interaction_model.touchmove = function() {}
            plot_avg_interaction_model.touchend = function() {}

            return new Dygraph(
                $("#dygraph_avg_container")[0],
                [[0, 0]],
                {
                    height: 150,
                    labels: ["Date", "Pressure"],
                    connectSeparatedPoints: false,
                    zoomCallback: function() {
                        drawPlot()
                    },
                    interactionModel: plot_avg_interaction_model
                }
            )
        }
    }

    return self
})()
