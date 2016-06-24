"use strict"

// main

var errs = {
    not_found: "Неверный пароль и / или e-mail",
    network_err: "Не удалось установить соединение с сервером"
}

var DEFAULT_ERR = "Произошла ошибка"

var vm = {
    email: ko.observable(),
    password: ko.observable(),
    err: ko.observable()
}

vm.logIn = function() {
    vm.err(null)

    helpers.makeAJAXRequest(
        "/api/app/auth/login",
        "post",
        {
            email: vm.email(),
            password: vm.password()
        },
        function(err, result) {
            if(err) {
                vm.err(errs[err] ? errs[err] : DEFAULT_ERR)
                return console.error(err)
            }

            m_site.favorites.loadAll()

            m_site.state.user(result)
            pager.navigate("plots")
        }
    )
}

vm.logOut = function() {
    helpers.makeAJAXRequest(
        "/api/app/auth/logout",
        "post",
        function(err, result) {
            m_site.state.user(null)
            pager.navigate("login")
        }
    )
}

// exports

window.m_site.login=vm
