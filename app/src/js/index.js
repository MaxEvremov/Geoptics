"use strict"

window.m_site = {}

$(document).ready(function() {
    var pager = new Pager($, ko)
    window.pager = pager

    pager.useHTML5history = true
    pager.Href5.history = History

    pager.extendWithPage(m_site)
    ko.applyBindings(m_site)

    pager.startHistoryJs()

    helpers.makeAJAXRequest(
        "/api/app/auth/init",
        "get",
        function(err, result) {
            m_site.state.user(result ? result : null)

            History.Adapter.bind(window, "statechange", function() {
                m_site.state.current_page(pager.activePage$().currentId)
            })
            m_site.state.current_page(pager.activePage$().currentId)

            if(!m_site.state.current_page()) {
                pager.navigate("plots")
            }

            m_site.state.is_ready(true)
        }
    )
})
