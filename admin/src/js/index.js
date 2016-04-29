"use strict"

// imports

import $ from "jquery"
import ko from "knockout"

import * as helpers from "./helpers"
import pager from "./pager"

import login from "./login"
import users from "./users"
import wells from "./wells"

// view model

let vm = {
    current_page: ko.observable()
}

vm.login = login
vm.users = users
vm.wells = wells

// init

$(document).ready(() => {
    pager.extendWithPage(vm)

    ko.applyBindings(vm)
    pager.startHistoryJs()

    History.Adapter.bind(window, "statechange", function() {
        vm.current_page(pager.page.route[0])
    })

    vm.current_page(pager.page.route[0])
})
