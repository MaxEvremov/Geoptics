m_site.wells = new CRUD({
    Model: Well,
    page_all: "wells",
    page_item: "well",
    api_path: "wells"
});

(function() {
    var self = m_site.wells

    self.user_access = ko.observable()

    self.users = ko.observableArray()
    self.users_without_access = ko.observableArray()

    self.onWellPermissionsShow = function() {
        var id = self.item_id()

        helpers.makeAJAXRequest(
            `/api/admin/wells/${id}/permissions`,
            "get",
            function(err, result) {
                if(err) {
                    return console.error(err)
                }

                self.users(result.users)
                self.users_without_access(result.users_without_access)
            }
        )
    }

    self.editPermissions = function(well) {
        pager.navigate(`well_permissions/${well.id()}`)
    }

    self.savePermissions = function(well) {
        helpers.makeAJAXRequest(
        `/api/admin/wells/${self.item_id()}/permissions`,
            "post",
            {
                users: ko.mapping.toJS(self.users())
            },
            function(err, result) {
                pager.navigate("wells")
            }
        )
    }

    self.cancelEditingPermissions = function() {
        pager.navigate("wells")
    }

    self.revokeUserAccess = function(data, e) {
        self.users.remove(function(user) {
            return user.id === data.id
        })

        self.users_without_access.push(data)
    }

    self.grantUserAccess = function(data, e) {
        self.users.push(self.user_access())

        self.users_without_access.remove(function(user) {
            return user.id === self.user_access().id
        })
    }
})()
