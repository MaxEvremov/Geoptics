m_site.zoom_history = (function() {
    var undo_history = []
    var redo_history = []

    var self = {
        undo: function() {
            var undo_item = undo_history.pop()

            redo_history.push([
                m_site.plots.plot_avg.xAxisRange(),
                m_site.plots.plot_avg.yAxisRange()
            ])

            self.is_redo_disabled(false)
            if(undo_history.length === 0) {
                self.is_undo_disabled(true)
            }

            m_site.plots.plot_avg.updateOptions({
                dateWindow: undo_item[0],
                valueRange: undo_item[1]
            })

            m_site.plots.drawAvgPlot(true)
        },
        redo: function() {
            var redo_item = redo_history.pop()

            undo_history.push([
                m_site.plots.plot_avg.xAxisRange(),
                m_site.plots.plot_avg.yAxisRange()
            ])

            self.is_undo_disabled(false)
            if(redo_history.length === 0) {
                self.is_redo_disabled(true)
            }

            m_site.plots.plot_avg.updateOptions({
                dateWindow: redo_item[0],
                valueRange: redo_item[1]
            })

            m_site.plots.drawAvgPlot(true)
        },

        addUndoItem: function(item) {
            undo_history.push(item)
            self.is_undo_disabled(false)
        },
        clear: function() {
            undo_history = []
            redo_history = []

            self.is_undo_disabled(true)
            self.is_redo_disabled(true)
        },

        is_undo_disabled: ko.observable(true),
        is_redo_disabled: ko.observable(true)
    }

    self.undo_history = undo_history
    self.redo_history = redo_history

    return self
})()
