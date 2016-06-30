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

    get role_name() {
        var self = this

        return _.find(User.ROLES, function(role) {
            return role.id === self.role()
        }).name
    }
}

User.ROLES = [
    { id: "owner", name: "Суперадминистратор" },
    { id: "admin", name: "Администратор" },
    { id: "user", name: "Пользователь" }
]
