"use strict"

// imports

import ko from "knockout"
import Dygraph from "dygraphs"

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
