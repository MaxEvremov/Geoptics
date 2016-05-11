"use strict"

// imports

import $ from "jquery"
import ko from "knockout"

import pager from "./pager"

import * as helpers from "./helpers"
import * as bindingHandlers from "./ko-binding-handlers"

import login from "./login"
import plots from "./plots"
import favorites from "./favorites"
import state from "./state"

// view model

let vm = {
    current_page: ko.observable()
}

vm.login = login
vm.plots = plots
vm.favorites = favorites
vm.state = state

// init

ko.bindingHandlers.dygraph = bindingHandlers.dygraph

$(document).ready(function() {
    pager.extendWithPage(vm)

    ko.applyBindings(vm)
    pager.startHistoryJs()
	
	window.pager = pager

    History.Adapter.bind(window, "statechange", () => {
        vm.current_page(pager.page.route[0])
    })

    vm.current_page(pager.page.route[0])

    helpers.makeAJAXRequest(
        "/api/app/auth/init",
        "get",
        (err, result) => {
            if(!result) {
                vm.state.user(null)
//                pager.navigate("login")
                return
            }

            vm.state.user(result)
//            pager.navigate("plots")
        }
    )
})
