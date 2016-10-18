m_site.plots.min_length = (function() {
    var clear = function() {
        $("#dygraph_container .line")[0].style.visibility = "hidden"
        self.value(null)
        m_site.plots.selected_plots.removeAll()
    }

    var self = {
        value: ko.observable(0),
        edit: function() {
            m_site.plots.current_well().getMinLength(
                function(err, result) {
                    if(err) {
                        return console.error(err)
                    }

                    clear()

                    self.value(result.min_length)
                    m_site.plots.current_mode("min_length")
                }
            )
        },
        save: function() {
            m_site.plots.current_well().setMinLength(
                {
                    min_length: self.value()
                },
                function(err, result) {
                    if(err) {
                        return console.error(err)
                    }

                    clear()
                    m_site.plots.current_mode("normal")
                }
            )
        },
        reset: function() {
            m_site.plots.current_well().setMinLength(
                {
                    min_length: 0
                },
                function(err, result) {
                    if(err) {
                        return console.error(err)
                    }

                    clear()
                    m_site.plots.current_mode("normal")
                }
            )
        },
        cancel: function() {
            clear()
            m_site.plots.current_mode("normal")
        }
    }

    self.is_save_allowed = ko.computed(function() {
        return !!self.value()
    })

    return self
})()
