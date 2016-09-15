(function() {
    var vm = {
        favorites: ko.observableArray()
    }

    vm.load = function(data, e) {
        m_site.plots.is_loading_favorite = true
        pager.navigate(`wells/${data.well_id}`)

        setTimeout(function() {
            data.load(function(err, result) {
                if(err) {
                    return console.error(err)
                }

                m_site.plots.current_well().time_sensors().forEach(function(sensor) {
                    sensor.is_active(result.active_time_sensors.indexOf(sensor.id) !== -1)
                })

                m_site.plots.plot_avg.updateOptions({
                    dateWindow: [result.date_start, result.date_end]
                })

                m_site.plots.selected_plots.removeAll()
                result.plots.forEach(function(plot) {
                    m_site.plots.selected_plots.push(new Plot(plot))
                })
            })
        }, 0)
    }

    vm.remove = function(data, e) {
        helpers.makeAJAXRequest(
            `/api/app/favorites/${data.id}`,
            "delete",
            function(err, result) {
                if(err) {
                    return console.error(err)
                }

                vm.favorites.remove(function(v) {
                    return v.id === data.id
                })
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
                    vm.favorites.push(new Favorite(favorite))
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
