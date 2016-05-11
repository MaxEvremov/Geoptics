"use strict"

// imports

import $ from "jquery"
import ko from "knockout"
import Pager from "./lib/pager.js"

import * as helpers from "./helpers"

import login from "./login"
import users from "./users"
import wells from "./wells"
import state from "./state"

import "./lib/history.js"
import "./lib/history.adapter.native.js"

// view model

let vm = {
    current_page: ko.observable()
}

vm.login = login
vm.users = users
vm.wells = wells
vm.state = state

// init

$(document).ready(() => {
    let pager = new Pager($, ko)

    pager.useHTML5history = true
    pager.Href5.history = History

    pager.extendWithPage(vm)

    ko.applyBindings(vm)
    pager.startHistoryJs()

	window.pager = pager
    window.vm = vm

    History.Adapter.bind(window, "statechange", () => {
        vm.current_page(pager.activePage$().currentId)
    })

    vm.current_page(pager.activePage$().currentId)

    helpers.makeAJAXRequest(
        "/api/admin/auth/init",
        "get",
        (err, result) => {
            if(!result) {
                vm.state.user(null)
                pager.navigate("login")
                return
            }

            vm.state.user(result)
        }
    )
})
