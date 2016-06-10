(function() {
    var current_well = m_site.state.current_well

    var vm = {
        favorites: ko.observableArray()
    }

    vm.formatDate = helpers.formatDate

    vm.load = function(data, event) {
        current_well.getTempMeasurements(
            {
                plots: data.points.map(function(date) {
                    return {
                        date: helpers.formatDate(date),
                        type: "point"
                    }
                })
            },
            function(err, result) {
                if(err) {
                    return console.error(err)
                }

                m_site.plots.selected_points.removeAll()

                result.forEach(function(v) {
                    m_site.plots.plots[v.date] = v.values
                    m_site.plots.selected_points.push(v.date)
                })

                m_site.plots.plot_main.updateOptions({
                    dateWindow: [data.zoom_main_left, data.zoom_main_right]
                })

                m_site.plots.plot_avg.updateOptions({
                    dateWindow: [data.zoom_avg_left, data.zoom_avg_right]
                })

                pager.navigate("plots")
            }
        )
    }

    vm.loadAll = function() {
        helpers.makeAJAXRequest(
            "/api/app/favorites",
            "get",
            function(err, result) {
                if(err) {
                    return console.error(err)
                }

                vm.favorites.removeAll()

                result.forEach(function(favorite) {
                    vm.favorites.push(favorite)
                })
            }
        )
    }

    vm.onShow = function() {
        vm.loadAll()
    }

    // exports

    window.m_site.favorites = vm
})()
