"use strict"

// imports

import $ from "jquery"
import ko from "knockout"
import Pager from "./lib/pager.js"
import _ from "lodash"

import * as helpers from "./helpers"
import * as binding_handlers from "./ko-binding-handlers"

import login from "./login"
import plots from "./plots"
import favorites from "./favorites"
import state from "./state"

import "./lib/history.js"
import "./lib/history.adapter.native.js"

// view model

let vm = {
    login: login,
    plots: plots,
    favorites: favorites,
    state: state
}

// init

_.forEach(binding_handlers, (value, key) => ko.bindingHandlers[key] = value)

$(document).ready(() => {
    let pager = new Pager($, ko)

    window.pager = pager
    window.vm = vm

    pager.useHTML5history = true
    pager.Href5.history = History

    helpers.makeAJAXRequest(
        "/api/app/auth/init",
        "get",
        (err, result) => {
            vm.state.user(result ? result : null)

            pager.extendWithPage(vm)

            ko.applyBindings(vm)
            pager.startHistoryJs()

            History.Adapter.bind(window, "statechange", () => {
                vm.state.current_page(pager.activePage$().currentId)
            })

            vm.state.current_page(pager.activePage$().currentId)
        }
    )
})
