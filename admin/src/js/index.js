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

    History.Adapter.bind(window, "statechange", function() {
        m_site.state.current_page(pager.activePage$().currentId)
    })

    helpers.makeAJAXRequest(
        "/api/admin/auth/init",
        "get",
        function(err, result) {
            m_site.state.user(result ? result : null)

            if(!m_site.state.current_page()) {
                pager.navigate("users")
            }

            m_site.state.is_ready(true)

            m_site.state.current_page(pager.activePage$().currentId)
        }
    )
})
