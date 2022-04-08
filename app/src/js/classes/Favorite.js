"use strict"

window.Favorite = (function() {
    var self = function(params) {
        this.id = params.id || null
        this.name = params.name || "Favorite"
        this.well_id = params.well_id || null
        this.created_at = params.created_at || null
        this.state = params.state || {}
    }

    self.prototype.save = function(done) {
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

    self.prototype.load = function(done) {
        helpers.makeAJAXRequest(
            "/api/app/favorites/" + this.id,
            "get",
            done
        )
    }

    Object.defineProperty(self.prototype, "well_name", {
        get: function() {
            var self = this

            var well = _.find(m_site.state.wells(), function(well) {
                return well.id === self.well_id
            })

            if(well) {
                return well.name
            }
        }
    })

    return self
})()
