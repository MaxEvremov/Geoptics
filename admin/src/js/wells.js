m_site.wells = (function() {
    var self = {
        wells: ko.observableArray(),
        current_well: ko.observable(),
        well_id: ko.observable(),

        user_access: ko.observable()
    }

    self.getAll = function() {
        self.wells.removeAll()

        helpers.makeAJAXRequest(
            "/api/admin/wells",
            "get",
            function(err, result) {
                if(err) {
                    return console.error(err)
                }

                result.forEach(function(well) {
                    self.wells.push(new Well(well))
                })
            }
        )
    }

    self.onShow = function() {
        console.log("onShow")
        self.getAll()
    }

    self.onWellShow = function() {
        console.log("onWellShow")
        var id = self.well_id()

        if(id === "new") {
            return self.current_well(new Well())
        }

        helpers.makeAJAXRequest(
            `/api/admin/wells/${id}`,
            "get",
            function(err, result) {
                if(err) {
                    return console.error(err)
                }

                self.current_well(new Well(result))
            }
        )
    }

    self.onWellPermissionsShow = function() {
        var id = self.well_id()

        helpers.makeAJAXRequest(
            `/api/admin/wells/${id}/permissions`,
            "get",
            function(err, result) {
                if(err) {
                    return console.error(err)
                }

                self.current_well(new Well(result))
            }
        )
    }

    self.create = function() {
        pager.navigate("well/new")
    }

    self.edit = function(well) {
        pager.navigate(`well/${well.id()}`)
    }

    self.editPermissions = function(well) {
        pager.navigate(`well_permissions/${well.id()}`)
    }

    self.cancel = function() {
        pager.navigate("wells")
        self.current_well(null)
    }

    self.save = function(well) {
        helpers.makeAJAXRequest(
            "/api/admin/wells",
            "post",
            ko.mapping.toJS(well),
            function(err, result) {
                self.current_well(null)
                pager.navigate("wells")
            }
        )
    }

    self.savePermissions = function(well) {
        helpers.makeAJAXRequest(
            "/api/admin/wells/permissions",
            "post",
            {
                id: self.well_id(),
                users: ko.mapping.toJS(self.current_well().users())
            },
            function(err, result) {
                pager.navigate("wells")
            }
        )
    }

    self.revokeUserAccess = function(data, e) {
        self.current_well().users.remove(function(user) {
            return user.id === data.id
        })

        self.current_well().users_without_access.push(data)
    }

    self.grantUserAccess = function(data, e) {
        self.current_well().users.push(self.user_access())

        self.current_well().users_without_access.remove(function(user) {
            return user.id === self.user_access().id
        })
    }

    return self
})()
