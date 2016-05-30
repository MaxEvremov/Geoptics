"use strict"

// imports

import ko from "knockout"

import * as helpers from "./helpers"

// main

let vm = {
    user: ko.observable(),
    current_page: ko.observable(),

    loggedInGuard: (page, route, done) => {
        if(!!vm.user()) {
            return done()
        }

        return pager.navigate("login")
    }
}

// exports

export default vm
