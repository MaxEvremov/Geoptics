//"use strict"

// imports

//import ko from "knockout"

//import * as helpers from "./helpers"

// main
(function(){
    let processGuard = (done) => {
        if(!!vm.user()) {
            return done()
        }

        return pager.navigate("login")
    }

    let vm = {
        user: ko.observable(),
        current_page: ko.observable(),
        is_ready: ko.observable(false),

        loggedInGuard: (page, route, done) => {
            let is_ready = vm.is_ready()

            if(is_ready) {
                return processGuard(done)
            }

            let sub = vm.is_ready.subscribe((val) => {
                if(val) {
                    processGuard(done)
                    return sub.dispose()
                }
            })
        }
    }

// exports

//export default vm
m_site.state=vm
})()
