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
        var plots = JSON.stringify(_.map(this.plots, function(plot) {
            var json = {
                type: plot.type,
                offset: plot.offset,
                is_for_color_plot: plot.is_for_color_plot
            }

            if(plot.type === "point") {
                json.date = plot.date
            }

            if(plot.type === "avg") {
                json.date_start = plot.date_start
                json.date_end = plot.date_end
            }

            return json
        }))

        helpers.makeAJAXRequest(
            "/api/app/favorites",
            "post",
            {
                well_id: this.well_id,
                plots: plots,
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
