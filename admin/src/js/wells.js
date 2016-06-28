m_site.wells = (function() {
    var self = {
        wells: ko.observableArray(),
        current_well: ko.observable(),
        well_id: ko.observable()
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

    self.create = function() {
        pager.navigate("wells/new")
    }

    self.edit = function(well) {
        pager.navigate(`wells/${well.id()}`)
    }

    self.cancel = function() {
        self.current_well(null)
        pager.navigate("wells")
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

    return self
})()
