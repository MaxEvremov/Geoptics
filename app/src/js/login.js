"use strict"

// imports

import ko from "knockout"
import mapping from "knockout-mapping"

import * as helpers from "./helpers"

import state from "./state"

// main

let errs = {
    not_found: "Неверный пароль и / или e-mail",
    network_err: "Не удалось установить соединение с сервером"
}

let DEFAULT_ERR = "Произошла ошибка"

let vm = {
    email: ko.observable(),
    password: ko.observable(),
    err: ko.observable()
}

vm.logIn = () => {
    vm.err(null)

    helpers.makeAJAXRequest(
        "/api/app/auth/login",
        "post",
        {
            email: vm.email(),
            password: vm.password()
        },
        (err, result) => {
            if(err) {
                vm.err(errs[err] ? errs[err] : DEFAULT_ERR)
                return console.error(err)
            }

            state.user(result)
            pager.navigate("plots")
        }
    )
}

vm.logOut = () => {
    helpers.makeAJAXRequest(
        "/api/app/auth/logout",
        "post",
        (err, result) => {
            state.user(null)
            pager.navigate("login")
        }
    )
}

// exports

export default vm
