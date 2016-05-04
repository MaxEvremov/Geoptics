"use script"

// imports

import $ from "jquery"
import ko from "knockout"

import Pager from "./lib/pager.js"

import "./lib/history.js"
import "./lib/history.adapter.native.js"

// main

let pager = new Pager($, ko)

pager.useHTML5history = true
pager.Href5.history = History

// exports

export default pager
