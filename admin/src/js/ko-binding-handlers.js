ko.bindingHandlers.fileUpload = {
	init: function(element, accessor, bindings) {
		FileAPI.event.on(element, "change", function(evt) {
			var file = FileAPI.getFiles(element)[0],
				url = accessor().url

			FileAPI.upload({
				url: url,
				files: { file: file },
				complete: function(err, xhr) {
					var res = JSON.parse(xhr.response)

					var error = res.err || err,
						result = res.result

					return accessor().done(error, result)
				}
			})
		})
	}
}
