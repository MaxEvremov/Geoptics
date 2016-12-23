"use strict"

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
        var options = value.options || {}

        if(value.value) {
            options.onChange = function(text) {
                value.value(text)
            }
        }

        $(element).mask(value.mask, options)
    }
}

ko.bindingHandlers.visibility = {
    init: function(element, value_accessor) {
        var value = ko.unwrap(value_accessor())
        element.style.visibility = value ? "visible" : "hidden"
    },
    update: function(element, value_accessor) {
        var value = ko.unwrap(value_accessor())
        element.style.visibility = value ? "visible" : "hidden"
    }
}

ko.bindingHandlers.onEnterPress = {
    init: function(element, value_accessor) {
        var handler = ko.unwrap(value_accessor())

        element.addEventListener("keypress", function(e) {
            if(e.keyCode != 13 && e.which != 13) {
                return
            }

            handler(e)
        })
    }
}
