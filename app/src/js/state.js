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

        current_well: null,
        wells: ko.observableArray(),

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
        }
    }

    return self
})()
