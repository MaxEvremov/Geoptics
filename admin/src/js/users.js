m_site.users = (function() {
    var self = {
        users: ko.observableArray(),
        current_user: ko.observable(),
        user_id: ko.observable()
    }

    self.getAll = function() {
        self.users.removeAll()

        helpers.makeAJAXRequest(
            "/api/admin/users",
            "get",
            function(err, result) {
                if(err) {
                    return console.error(err)
                }

                result.forEach(function(user) {
                    self.users.push(new User(user))
                })
            }
        )
    }

    self.onShow = function() {
        self.getAll()
    }

    self.onUserShow = function() {
        var id = self.user_id()

        if(id === "new") {
            return self.current_user(new User())
        }

        helpers.makeAJAXRequest(
            `/api/admin/users/${id}`,
            "get",
            function(err, result) {
                if(err) {
                    return console.error(err)
                }

                self.current_user(new User(result))
            }
        )
    }

    self.create = function() {
        pager.navigate("users/new")
    }

    self.edit = function(user) {
        pager.navigate(`users/${user.id()}`)
    }

    self.cancel = function() {
        self.current_user(null)
        pager.navigate("users")
    }

    self.save = function(user) {
        helpers.makeAJAXRequest(
            "/api/admin/users",
            "post",
            ko.mapping.toJS(user),
            function(err, result) {
                self.current_user(null)
                pager.navigate("users")
            }
        )
    }

    return self
})()
