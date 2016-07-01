m_site.plots.reference_point = (function() {
    var clear = function() {
        m_site.plots.selected_plots.removeAll()
    }

    var self = {
        point: ko.observable(new ReferencePoint({})),
        edit: function() {
            m_site.plots.current_well.getReferencePoint(
                function(err, result) {
                    if(err) {
                        return console.error(err)
                    }

                    self.point(result)
                    m_site.plots.current_mode("reference_point")
                    clear()
                }
            )
        },
        save: function() {
            m_site.plots.current_well.setReferencePoint(
                ko.toJS(self.point()),
                function(err, result) {
                    if(err) {
                        return console.error(err)
                    }

                    m_site.plots.current_mode("normal")
                    clear()
                }
            )
        },
        cancel: function() {
            m_site.plots.current_mode("normal")
            clear()
        }
    }

    self.is_save_allowed = ko.computed(function() {
        var point = self.point()

        return point.temp() && point.length()
    })

    return self
})()
