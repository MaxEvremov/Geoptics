m_site.plots.sensors = (function() {
    var self = {
        edit: function() {
            m_site.plots.current_mode("sensors")
        },
        close: function() {
            m_site.plots.current_mode("normal")
        }
    }

    return self
})()
