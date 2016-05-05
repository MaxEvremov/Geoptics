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

// view model

let vm = {
    current_page: ko.observable()
}

vm.login = login
vm.plots = plots
vm.favorites = favorites

// init

ko.bindingHandlers.dygraph = bindingHandlers.dygraph

$(document).ready(() => {
    pager.extendWithPage(vm)

    ko.applyBindings(vm)
    pager.startHistoryJs()

    History.Adapter.bind(window, "statechange", function() {
        vm.current_page(pager.page.route[0])
    })

    vm.current_page(pager.page.route[0])
})
