"use strict"

class Texture {
    constructor(data) {
        if(!data) {
            data = {}
        }

        this.id = ko.observable(data.id || null)
        this.name = ko.observable(data.name || "")
        this.img = ko.observable(data.img || "")
    }
}

Texture.FIELDS = ["name", "img"]
