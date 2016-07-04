"use strict"

class Favorite {
    constructor(params) {
        this.id = params.id || null
        this.name = params.name || "Favorite"
        this.well_id = params.well_id || null
        this.plots = params.plots || []
        this.created_at = params.created_at || null
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

    get well_name() {
        var self = this

        var well = _.find(m_site.state.wells(), function(well) {
            return well.id === self.well_id
        })

        if(well) {
            return well.name
        }
    }
}
