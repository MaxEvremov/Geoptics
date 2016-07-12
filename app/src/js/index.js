"use strict"

window.m_site = {}

$(document).ready(function() {
    for(var i = 0; i < Plot.COLORS.length; i++) {
        helpers.createCSSClass(
            `.dygraphDefaultAnnotation.dygraph-annotation-plot-${i + 1}`,
            Plot.COLORS[i]
        )
    }

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

    m_site.state.load(function() {
        m_site.state.is_ready(true)
        m_site.state.current_page(pager.page.route[0])
    })
})
