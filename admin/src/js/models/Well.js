class Well {
    constructor(data) {
        if(!data) {
            data = {}
        }

        this.id = ko.observable(data.id || "")
        this.name = ko.observable(data.name || "")
        this.well_xml_id = ko.observable(data.well_xml_id || "")
    }
}
