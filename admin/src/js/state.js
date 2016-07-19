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
                "/api/admin/state/init",
                "get",
                function(err, result) {
                    if(err) {
                        return console.error(err)
                    }

                    m_site.state.user(result.user)

                    if(done && _.isFunction(done)) {
                        return done()
                    }
                }
            )
        },

        logOut: function() {
            helpers.makeAJAXRequest(
                "/api/admin/auth/logout",
                "post",
                function(err, result) {
                    m_site.state.user(null)
                    pager.navigate("login")
                }
            )
        }
    }

    return self
})()
