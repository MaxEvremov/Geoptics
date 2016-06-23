(function() {
    var current_well = m_site.state.current_well

    var vm = {
        favorites: ko.observableArray()
    }

    vm.formatDate = helpers.formatDate

    vm.load = function(data, event) {
        current_well.getTempMeasurements(
            {
                plots: data.plots
            },
            function(err, result) {
                if(err) {
                    return console.error(err)
                }

                m_site.plots.selected_plots.removeAll()

                result.forEach(function(plot) {
                    m_site.plots.selected_plots.push(new Plot(plot))
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
