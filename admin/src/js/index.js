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
        m_site.state.current_page(pager.page.route[0])
    })

    helpers.makeAJAXRequest(
        "/api/admin/state/init",
        "get",
        function(err, result) {
            m_site.state.user(result.user)

            m_site.state.is_ready(true)
            m_site.state.current_page(pager.page.route[0])
        }
    )
})
