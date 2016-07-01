m_site.plots.length_annotations = (function() {
    var clear = function() {
        self.current_annotation(new LengthAnnotation())
    }

    var self = {
        annotations: ko.observableArray(),
        current_annotation: ko.observable(new LengthAnnotation()),
        is_editing: ko.observable(false),

        getAll: function() {
            m_site.plots.current_well.getLengthAnnotations(function(err, result) {
                if(err) {
                    return console.error(err)
                }

                self.annotations.removeAll()

                result.forEach(function(v) {
                    self.annotations.push(new LengthAnnotation(v))
                })
            })
        },

        createAnnotation: function() {
            self.current_annotation(new LengthAnnotation())
            self.is_editing(true)
        },
        editAnnotation: function(data, e) {
            self.current_annotation(data)
            self.is_editing(true)
        },
        cancelEditingAnnotation: function() {
            self.current_annotation(new LengthAnnotation())
            self.is_editing(false)
        },
        removeAnnotation: function(data, e) {
            m_site.plots.current_well.removeLengthAnnotation(data, self.getAll)
        },
        saveAnnotation: function() {
            console.log("saveAnnotation")
            self.current_annotation().length(parseFloat(self.current_annotation().length()))

            m_site.plots.current_well.addOrUpdateLengthAnnotation(
                ko.mapping.toJS(self.current_annotation()),
                function(err, result) {
                    if(err) {
                        return console.error(err)
                    }

                    self.current_annotation(new LengthAnnotation())

                    self.getAll()
                    self.is_editing(false)
                }
            )
        },

        edit: function() {
            m_site.plots.current_mode("length_annotation")
        },
        cancel: function() {
            m_site.plots.current_mode("normal")
        }
    }

    self.annotations.subscribe(function(value) {
        var labels = m_site.plots.plot_main.getOption("labels")

        if(labels.length <= 1) {
            return
        }

        var series = labels[1]

        value = _.map(value, function(v) {
            return v.getAnnotation(series)
        })

        m_site.plots.plot_main.setAnnotations(value)
    })

    return self
})()
