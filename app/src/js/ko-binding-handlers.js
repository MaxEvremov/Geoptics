"use strict"

// imports

import ko from "knockout"
import Dygraph from "dygraphs"
import $ from "jquery"
import jMask from "jquery-mask-plugin"

// main

export let dygraph = {
    init: (element, value_accessor) => {
        let value = ko.unwrap(value_accessor())

        let options = value.options
        let done = value.done

        let graph = new Dygraph(
            element,
            [[0, 0]],
            options
        )

        done(null, graph)
    }
}

export let jmask = {
    init: (element, value_accessor) => {
        let value = ko.unwrap(value_accessor())

        $(element).mask(value.mask, value.options || {})
    }
}
