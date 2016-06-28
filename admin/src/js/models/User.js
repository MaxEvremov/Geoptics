class User {
    constructor(data) {
        if(!data) {
            data = {}
        }

        this.id = ko.observable(data.id || "")
        this.name = ko.observable(data.name || "")
        this.email = ko.observable(data.email || "")
        this.role = ko.observable(data.role || "user")

        this.password = ko.observable()
    }
}
