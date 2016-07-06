"use strict"

m_site.login = (function() {
    var errs = {
        not_found: "Неверный пароль и / или e-mail",
        network_err: "Не удалось установить соединение с сервером"
    }

    var DEFAULT_ERR = "Произошла ошибка"

    var self = {
        email: ko.observable(),
        password: ko.observable(),
        err: ko.observable(),

        logIn: function() {
            self.err(null)

            helpers.makeAJAXRequest(
                "/api/app/auth/login",
                "post",
                {
                    email: self.email(),
                    password: self.password()
                },
                function(err, result) {
                    if(err) {
                        self.err(errs[err] ? errs[err] : DEFAULT_ERR)
                        return console.error(err)
                    }

                    m_site.state.load(function() {
                        pager.navigate("/")
                    })
                }
            )
        },

        logOut: function() {
            helpers.makeAJAXRequest(
                "/api/app/auth/logout",
                "post",
                function(err, result) {
                    m_site.state.user(null)
                    pager.navigate("login")
                }
            )
        }
    }

    return self
})()
