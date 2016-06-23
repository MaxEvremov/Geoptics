"use strict"

class Favorite {
    constructor(params) {
        this.id = params.id || null
        this.name = params.name || "Favorite"
        this.well_id = params.well_id || null
        this.plots = params.plots || []
    }

    save(done) {
        helpers.makeAJAXRequest(
            "/api/app/favorites",
            "post",
            {
                well_id: this.well_id,
                plots: this.plots,
                name: this.name
            },
            done
        )
    }
}
