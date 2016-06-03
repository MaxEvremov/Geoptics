//"use strict"
(function(){
// imports
//
//import ko from "knockout"
//import mapping from "knockout-mapping"
//import moment from "moment"
//
//import * as helpers from "./helpers"
//
//import plots from "./plots"

// main

let vm = {
    favorites: ko.observableArray()
}

vm.formatDate = (date) => moment(date).format("DD-MM-YYYY HH:mm:ssZ")

vm.load = (data, event) => {
     helpers.makeAJAXRequest(
         "/api/app/plots/measurements",
         "post",
         {
             dates: data.points.map(date => vm.formatDate(date)),
             well_id: 1 // TODO: заменить на настоящий id скважины
         },
         (err, result) => {
             if(err) {
                 return console.error(err)
             }

             plots.selected_points.removeAll()

             result.forEach(v => {
                 plots.plots[v.date] = v.values
                 plots.selected_points.push(v.date)
             })

             plots.graph_main.updateOptions({
                //  valueRange: [data.zoom_main_low, data.zoom_main_high],
                 dateWindow: [data.zoom_main_left, data.zoom_main_right]
             })

             plots.graph_avg.updateOptions({
                //  valueRange: [data.zoom_avg_low, data.zoom_avg_high],
                 dateWindow: [data.zoom_avg_left, data.zoom_avg_right]
             })

             pager.navigate("plots")
         }
     )
}

vm.loadAll = () => {
    helpers.makeAJAXRequest(
        "/api/app/favorites",
        "get",
        (err, result) => {
            if(err) {
                return console.error(err)
            }

            vm.favorites.removeAll()

            result.forEach(favorite => vm.favorites.push(favorite))
        }
    )
}

vm.onShow = () => {
    vm.loadAll()
}

// exports

//export default vm
window.m_site.favorites=vm
	})()