"use strict"

// imports

import ko from "knockout"
import mapping from "knockout-mapping"

import * as helpers from "./helpers"
import pager from "./pager"

// main

let vm = {
    email: ko.observable(),
    password: ko.observable()
}

vm.logIn = () => pager.navigate("users")

// exports

export default vm
