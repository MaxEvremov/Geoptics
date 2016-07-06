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
            var y1 = self.current_annotation().y1
            var y2 = self.current_annotation().y2

            y1(parseFloat(y1()))
            y2(parseFloat(y2()))

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

    return self
})()
