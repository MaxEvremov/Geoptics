"use strict"

class Favorite {
    constructor(params) {
        this.id = params.id || null
        this.name = params.name || "Favorite"
        this.well_id = params.well_id || null
        this.created_at = params.created_at || null
    }

    save(done) {
        var x_range = m_site.plots.plot_avg.xAxisRange()

        var state = {
            plots: m_site.plots.selected_plots(),
            date_start: x_range[0],
            date_end: x_range[1],
            active_time_sensors: m_site.plots.current_well().active_time_sensors().map(function(sensor) {
                return sensor.id
            })
        }

        helpers.makeAJAXRequest(
            "/api/app/favorites",
            "post",
            {
                well_id: this.well_id,
                state: state,
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
