m_site.state = (function() {
    var processGuard = function(done) {
        if(!!self.user()) {
            return done()
        }

        return pager.navigate("login")
    }

    var self = {
        user: ko.observable(),
        current_page: ko.observable(),
        is_ready: ko.observable(false),

        wells: ko.observableArray(),
        textures: ko.observableArray(),

        loggedInGuard: function(page, route, done) {
            var is_ready = self.is_ready()

            if(is_ready) {
                return processGuard(done)
            }

            var sub = self.is_ready.subscribe(function(val) {
                if(val) {
                    processGuard(done)
                    return sub.dispose()
                }
            })
        },

        load: function(done) {
            helpers.makeAJAXRequest(
                "/api/app/state/init",
                "get",
                function(err, result) {
                    if(err) {
                        return console.error(err)
                    }

                    if(result.user) {
                        m_site.favorites.loadAll()
                    }

                    m_site.state.user(result.user)

                    m_site.state.wells.removeAll()
                    result.wells.forEach(function(well) {
                        m_site.state.wells.push(new Well(well))
                    })

                    m_site.state.textures.removeAll()
                    m_site.state.textures(result.textures)
                    if(done && _.isFunction(done)) {
                        return done()
                    }
                }
            )
        }
    }

    return self
})()
