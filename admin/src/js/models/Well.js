"use script"

// imports

import ko from "knockout"

// main

class Well {
    constructor(data) {
        if(!data) {
            data = {}
        }

        this.id = ko.observable(data.id || "")
        this.name = ko.observable(data.name || "")
    }
}

// exports

export default Well
