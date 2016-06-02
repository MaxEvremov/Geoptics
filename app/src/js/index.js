"use strict"

// imports

//import $ from "jquery"
//import ko from "knockout"
//import Pager from "./lib/pager.js"
//import _ from "lodash"
//
//import * as helpers from "./helpers"
//import * as binding_handlers from "./ko-binding-handlers"
//
//import login from "./login"
//import plots from "./plots"
//import favorites from "./favorites"
//import state from "./state"
//
//import "./lib/history.js"
//import "./lib/history.adapter.native.js"

// view model

 window.m_site = {
//    login: login,
//    plots: plots,
//    favorites: favorites,
//    state: state
}

// init

//_.forEach(binding_handlers, (value, key) => ko.bindingHandlers[key] = value)

$(document).ready(() => {
    let pager = new Pager($, ko)
	console.log(" window.m_site", window.m_site,m_site)
    window.pager = pager
//    window.m_site = m_site

    pager.useHTML5history = true
    pager.Href5.history = History

    helpers.makeAJAXRequest(
        "/api/app/auth/init",
        "get",
        (err, result) => {
            m_site.state.user(result ? result : null)
//
            pager.extendWithPage(m_site)
//
            ko.applyBindings(m_site)
            pager.startHistoryJs()
//
            History.Adapter.bind(window, "statechange", () => {
                m_site.state.current_page(pager.activePage$().currentId)
            })
//
            m_site.state.current_page(pager.activePage$().currentId)
        }
    )
})
