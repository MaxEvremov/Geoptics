"use strict"

// imports

import ko from "knockout"
import mapping from "knockout-mapping"

import * as helpers from "./helpers"

import Well from "./models/Well"

// main

let vm = {
    wells: ko.observableArray(),
    current_well: ko.observable(),
    well_id: ko.observable()
}

vm.getAll = () => {
    vm.wells.removeAll()

    helpers.makeAJAXRequest(
        "/api/admin/wells",
        "get",
        (err, result) => {
            if(err) {
                return console.error(err)
            }

            result.forEach(well =>
                vm.wells.push(new Well(well))
            )
        }
    )
}

vm.onShow = () => {
    console.log("onShow")
    vm.getAll()
}

vm.onWellShow = () => {
    console.log("onWellShow")
    let id = vm.well_id()

    if(id === "new") {
        return vm.current_well(new Well())
    }

    helpers.makeAJAXRequest(
        `/api/admin/wells/${id}`,
        "get",
        (err, result) => {
            if(err) {
                return console.error(err)
            }

            vm.current_well(new Well(result))
        }
    )
}

vm.create = () => pager.navigate("wells/new")

vm.edit = (well) => {
    pager.navigate(`wells/${well.id()}`)
}

vm.cancel = () => {
    vm.current_well(null)
    pager.navigate("wells")
}

vm.save = (well) => {
    helpers.makeAJAXRequest(
        "/api/admin/wells",
        "post",
        mapping.toJS(well),
        (err, result) => {
            vm.current_well(null)
            pager.navigate("wells")
        }
    )
}

// exports

export default vm
