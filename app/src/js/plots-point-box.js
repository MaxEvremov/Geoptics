m_site.plots.point_box = (function() {
    var POLL_INTERVAL = 2 * 1000

    var getAvgTempPlot = function(date_start, date_end) {
        var plot = new Plot({
            type: "avg",
            date_start: date_start,
            date_end: date_end,
            well_id: m_site.plots.current_well().id,
            sensor_id: m_site.plots.selected_depth_sensor()
        })

        self.is_visible(false)
        self.selected_date(null)

        m_site.plots.is_loading_temp_data(true)

        plot.load(function(err, result) {
            m_site.plots.is_loading_temp_data(false)

            if(err) {
                return console.error(err)
            }

            m_site.plots.selected_plots.push(plot)
        })
    }

    var self = {}

    self.selected_date = ko.observable()

    self.left = ko.observable()
    self.top = ko.observable()
    self.is_visible = ko.observable(false)
    self.mode = ko.observable("normal")

    self.color_temp_number = ko.observable()
    self.color_temp_interval = ko.observable()
    self.color_temp_period = ko.observable()

    self.color_temp_interval_unit = ko.observable("h")
    self.color_temp_period_unit = ko.observable("h")

    self.keep_existing = ko.observable(false)

    self.hide = function(data, e) {
        self.is_visible(false)
    }

    self.getNearestTempPlot = function() {
        var date = self.selected_date()

        var plot = new Plot({
            type: "point",
            date: date,
            well_id: m_site.plots.current_well().id,
            sensor_id: m_site.plots.selected_depth_sensor()
        })

        self.is_visible(false)
        self.selected_date(null)

        m_site.plots.is_loading_temp_data(true)

        plot.load(function(err, result) {
            m_site.plots.is_loading_temp_data(false)

            if(err) {
                return console.error(err)
            }

            if(result.type === "point") {
                var plot_ts = helpers.convertDate(result.date, "iso8601", "ms")

                if(_.find(m_site.plots.selected_plots(), { date: plot_ts })) {
                    return
                }
            }

            if(result.data.length === 0) {
                return
            }

            m_site.plots.selected_plots.push(plot)
        })
    }

    self.getAvgTempPlot = function(length, units) {
        var duration_ms = moment.duration(length, units).asMilliseconds()

        var date_start = self.selected_date()

        var date_start_ms = helpers.convertDate(date_start, "iso8601", "ms")
        var date_end_ms = date_start_ms + duration_ms

        var date_end = helpers.convertDate(date_end_ms, "ms", "iso8601")

        getAvgTempPlot(date_start, date_end)
    }

    self.getAvgTempPlotForVisibleRange = function() {
        var x_range = m_site.plots.plot_avg.xAxisRange()

        var date_start = helpers.convertDate(x_range[0], "ms", "iso8601")
        var date_end = helpers.convertDate(x_range[1], "ms", "iso8601")

        getAvgTempPlot(date_start, date_end)
    }

    self.openColorTempBox = function() {
        self.color_temp_number(null)
        self.color_temp_interval(null)
        self.color_temp_period(null)
        self.keep_existing(false)

        self.color_temp_period_unit("h")
        self.color_temp_interval_unit("h")

        self.mode("color")
    }

    self.closeColorTempBox = function() {
        self.mode("normal")
    }

    self.renderColorTemp = function() {
        var number = parseInt(self.color_temp_number())
        var interval = parseFloat(self.color_temp_interval())
        var period = parseFloat(self.color_temp_period())

        var interval_unit = self.color_temp_interval_unit()
        var period_unit = self.color_temp_period_unit()

        self.mode("normal")
        self.is_visible(false)

        m_site.plots.is_loading_temp_data(true)

        Plot.getPlotsForColorTempRenderer(
            {
                date: self.selected_date(),
                number: number,
                interval: moment.duration(interval, interval_unit).asMilliseconds(),
                period: moment.duration(period, period_unit).asMilliseconds(),
                well_id: m_site.plots.current_well().id,
                sensor_id: m_site.plots.selected_depth_sensor()
            },
            function(err, task_id) {
                if(err) {
                    m_site.plots.is_loading_temp_data(false)
                    return console.error(err)
                }

                var checkTaskStatus = function() {
                    helpers.makeAJAXRequest(
                        "/api/app/plots/task_status",
                        "get",
                        {
                            id: task_id,
                            well_id: m_site.plots.current_well().id
                        },
                        function(err, result) {
                            if(err) {
                                return console.error(err)
                            }

                            if(!result.is_finished) {
                                m_site.plots.processed(result.processed)
                                m_site.plots.total(result.total)

                                return setTimeout(checkTaskStatus, POLL_INTERVAL)
                            }

                            if(result.result.err) {
                                return console.error(result.result.err)
                            }

                            if(!self.keep_existing()) {
                                m_site.plots.selected_plots.removeAll()
                            }

                            // лол
                            var plots = _.map(result.result.result, function(plot) {
                                return new Plot(plot)
                            })

                            plots.forEach(function(plot) {
                                m_site.plots.selected_plots.push(plot)
                            })

                            m_site.plots.is_loading_temp_data(false)
                            m_site.plots.processed(null)
                            m_site.plots.total(null)
                        }
                    )
                }

                checkTaskStatus()
            }
        )
    }

    return self
})()
