(function() {
    var vm = {
        favorites: ko.observableArray()
    }

    vm.load = function(data, event) {
        pager.navigate(`wells/${data.well_id}`)

        setTimeout(function() {
            var plots = _.map(data.plots, function(plot) {
                plot.well_id = data.well_id
                return new Plot(plot)
            })

            m_site.plots.selected_plots.removeAll()
            m_site.plots.is_loading_temp_data(true)

            async.eachSeries(
                plots,
                function(plot, done) {
                    plot.load(function(err, result) {
                        if(err) {
                            return done(err)
                        }

                        m_site.plots.selected_plots.push(plot)
                        return done(null)
                    })
                },
                function(err) {
                    m_site.plots.is_loading_temp_data(false)
                }
            )
        }, 0)
    }

    vm.remove = function(data, event) {
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
