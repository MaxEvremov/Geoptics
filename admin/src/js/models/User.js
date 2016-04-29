"use script"

// imports

import ko from "knockout"

// main

class User {
    constructor(data) {
        if(!data) {
            data = {}
        }

        this.id = ko.observable(data.id || "")
        this.name = ko.observable(data.name || "")
        this.email = ko.observable(data.email || "")

        this.password = ko.observable()
    }
}

// exports

export default User
