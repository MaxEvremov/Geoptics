"use strict"

// imports

import $ from "jquery"
import ko from "knockout"
import Pager from "./lib/pager.js"
import _ from "lodash"

import * as helpers from "./helpers"
import * as bindingHandlers from "./ko-binding-handlers"

import login from "./login"
import plots from "./plots"
import favorites from "./favorites"
import state from "./state"

import "./lib/history.js"
import "./lib/history.adapter.native.js"

// view model

let vm = {
    current_page: ko.observable()
}

vm.login = login
vm.plots = plots
vm.favorites = favorites
vm.state = state

// init

_.forEach(bindingHandlers, (value, key) => ko.bindingHandlers[key] = value)

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
        "/api/app/auth/init",
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
