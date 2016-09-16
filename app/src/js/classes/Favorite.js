"use strict"

class Favorite {
    constructor(params) {
        this.id = params.id || null
        this.name = params.name || "Favorite"
        this.well_id = params.well_id || null
        this.created_at = params.created_at || null
        this.state = params.state || {}
    }

    save(done) {
        helpers.makeAJAXRequest(
            "/api/app/favorites",
            "post",
            {
                well_id: this.well_id,
                state: this.state,
                name: this.name
            },
            done
        )
    }

    load(done) {
        helpers.makeAJAXRequest(
            "/api/app/favorites/" + this.id,
            "get",
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
