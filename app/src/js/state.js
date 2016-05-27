"use strict"

// imports

import ko from "knockout"
import mapping from "knockout-mapping"

import * as helpers from "./helpers"

// main

let vm = {
    user: ko.observable(),
    current_page: ko.observable()
}

// exports

export default vm
