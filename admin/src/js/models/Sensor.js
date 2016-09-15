class Sensor {
    constructor(data) {
        if(!data) {
            data = {}
        }

        this.id = ko.observable(data.id || "")
        this.name = ko.observable(data.name || "")
        this.type = ko.observable(data.type || "point")
        this.well_id = ko.observable(data.well_id || null)
        this.xml_id = ko.observable(data.xml_id || "")
        this.xml_tag = ko.observable(data.xml_tag || "")
    }

    get type_name() {
        var self = this

        return _.find(Sensor.TYPES, function(type) {
            return type.id === self.type()
        }).name
    }

    get well_name() {
        var self = this

        var well = _.find(m_site.sensors.wells(), function(well) {
            return self.well_id() === well.id
        })

        if(!well) {
            return "-"
        }

        return well.name
    }
}

Sensor.TYPES = [
    { id: "point", name: "точечный" },
    { id: "distributed", name: "распределенный" }
]

Sensor.FIELDS = [
    "name",
    "type",
    "well_id",
    "xml_id",
    "xml_tag"
]
