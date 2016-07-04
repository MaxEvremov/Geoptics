(function() {
    var vm = {
        favorites: ko.observableArray()
    }

    vm.load = function(data, event) {
        pager.navigate(`wells/${data.well_id}`)
        data.plots.forEach(function(plot) {
            plot.well_id = data.well_id
            var plot_instance = new Plot(plot)

            plot_instance.load(function(err, result) {
                m_site.plots.selected_plots.push(plot_instance)
            })
        })
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
