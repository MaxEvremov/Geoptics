m_site.plots.timeline_events = (function() {
    var self = {
        events: ko.observableArray(),
        current_event: ko.observable(new TimelineEvent()),
        is_editing: ko.observable(false),

        getAll: function() {
            m_site.plots.current_well.getTimelineEvents(function(err, result) {
                if(err) {
                    return console.error(err)
                }

                self.events.removeAll()

                result.forEach(function(v) {
                    self.events.push(new TimelineEvent(v))
                })
            })
        },

        createEvent: function() {
            self.current_event(new TimelineEvent())
            self.is_editing(true)
        },
        editEvent: function(data, e) {
            self.current_event(data)
            self.is_editing(true)
        },
        cancelEditingEvent: function() {
            self.current_event(new TimelineEvent())
            self.is_editing(false)
        },
        removeEvent: function(data, e) {
            m_site.plots.current_well.removeTimelineEvent(data, self.getAll)
        },
        saveEvent: function() {
            var current_event = {
                id: self.current_event().id,
                short_text: self.current_event().short_text(),
                description: self.current_event().description(),
                date: helpers.convertDate(self.current_event().jmask_date(), "jmask", "iso8601")
            }

            m_site.plots.current_well.addOrUpdateTimelineEvent(
                current_event,
                function(err, result) {
                    if(err) {
                        return console.error(err)
                    }

                    self.current_event(new TimelineEvent())

                    self.getAll()
                    self.is_editing(false)
                }
            )
        },
        showEventOnPlot: function(data, e) {
            data.showOnPlot(m_site.plots.plot_avg)
        },

        edit: function() {
            m_site.plots.current_mode("timeline_event")
        },
        cancel: function() {
            m_site.plots.current_mode("normal")
        }
    }

    return self
})()
