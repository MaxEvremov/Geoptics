"use strict"

// imports

import ko from "knockout"
import mapping from "knockout-mapping"

import * as helpers from "./helpers"

import User from "./models/User"

// main

let vm = {
    users: ko.observableArray(),
    current_user: ko.observable(),
    user_id: ko.observable()
}

vm.roles = [
    { id: "owner", name: "Суперадминистратор" },
    { id: "admin", name: "Администратор" },
    { id: "user", name: "Пользователь" }
]

vm.getAll = () => {
    vm.users.removeAll()

    helpers.makeAJAXRequest(
        "/api/admin/users",
        "get",
        (err, result) => {
            if(err) {
                return console.error(err)
            }

            result.forEach(user =>
                vm.users.push(new User(user))
            )
        }
    )
}

vm.onShow = () => {
    vm.getAll()
}

vm.onUserShow = () => {
    let id = vm.user_id()

    if(id === "new") {
        return vm.current_user(new User())
    }

    helpers.makeAJAXRequest(
        `/api/admin/users/${id}`,
        "get",
        (err, result) => {
            if(err) {
                return console.error(err)
            }

            vm.current_user(new User(result))
        }
    )
}

vm.create = () => pager.navigate("users/new")

vm.edit = (user) => {
    pager.navigate(`users/${user.id()}`)
}

vm.cancel = () => {
    vm.current_user(null)
    pager.navigate("users")
}

vm.save = (user) => {
    helpers.makeAJAXRequest(
        "/api/admin/users",
        "post",
        mapping.toJS(user),
        (err, result) => {
            vm.current_user(null)
            pager.navigate("users")
        }
    )
}

// exports

export default vm
