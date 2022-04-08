m_site.sensors = new CRUD({
    Model: Sensor,
    page_all: "sensors",
    page_item: "sensor",
    api_path: "sensors"
});

(function() {
    var self = m_site.sensors

    self.wells = ko.observableArray()

    self.onShow = function() {
        helpers.makeAJAXRequest(
            "/api/admin/sensors/wells",
            "get",
            function(err, result) {
                if(err) {
                    return console.error(err)
                }

                self.wells(result)
                self.getAll()
            }
        )
    }
})()
