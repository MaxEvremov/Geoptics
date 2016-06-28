class Well {
    constructor(data) {
        if(!data) {
            data = {}
        }

        this.id = ko.observable(data.id || "")
        this.name = ko.observable(data.name || "")
    }
}
