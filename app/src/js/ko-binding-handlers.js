"use strict"

// imports
//
//import ko from "knockout"
//import Dygraph from "dygraphs"
//import $ from "jquery"
//import jMask from "jquery-mask-plugin"

// main

ko.bindingHandlers.dygraph = {
    init: function(element, value_accessor) {
        var value = ko.unwrap(value_accessor())

        var options = value.options
        var done = value.done

        var graph = new Dygraph(
            element,
            [[0, 0]],
            options
        )

        done(null, graph)
    }
}

ko.bindingHandlers.jmask = {
    init: function(element, value_accessor) {
        var value = ko.unwrap(value_accessor())

        $(element).mask(value.mask, value.options || {})
    }
}
