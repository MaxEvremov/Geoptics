"use strict"

class CRUD {
    constructor(params) {
        if(!params) {
            params = {}
        }

        var self = this

        var Model = params.Model
        var page_all = params.page_all
        var page_item = params.page_item
        var api_path = params.api_path

        var FIELDS = Model.FIELDS

        this.items = ko.observableArray()
        this.current_item = ko.observable()
        this.item_id = ko.observable()

        this.getAll = function() {
            self.items.removeAll()

            helpers.makeAJAXRequest(
                `/api/admin/${api_path}`,
                "get",
                function(err, result) {
                    if(err) {
                        return console.error(err)
                    }

                    result.forEach(function(item) {
                        self.items.push(new Model(item))
                    })
                }
            )
        }

        this.onShow = function() {
            self.getAll()
        }

        this.onItemShow = function() {
            var id = self.item_id()

            if(id === "new") {
                return self.current_item(new Model())
            }

            helpers.makeAJAXRequest(
                `/api/admin/${api_path}/${id}`,
                "get",
                function(err, result) {
                    if(err) {
                        return console.error(err)
                    }

                    self.current_item(new Model(result))
                }
            )
        }

        self.create = function() {
            pager.navigate(`${page_item}/new`)
        }

        self.edit = function(item) {
            pager.navigate(`${page_item}/${item.id()}`)
        }

        self.delete = function(item) {
            helpers.makeAJAXRequest(
                `/api/admin/${api_path}/${item.id()}`,
                "delete",
                function(err, result) {
                    self.getAll()
                }
            )
        }

        self.cancel = function() {
            self.current_item(null)
            pager.navigate(page_all)
        }

        self.save = function(item) {
            var url = `/api/admin/${api_path}`

            if(item.id()) {
                url += `/${item.id()}`
            }

            var data = _.pick(ko.mapping.toJS(item), FIELDS)

            helpers.makeAJAXRequest(
                url,
                "post",
                data,
                function(err, result) {
                    self.current_item(null)
                    pager.navigate(page_all)
                }
            )
        }
    }
}
