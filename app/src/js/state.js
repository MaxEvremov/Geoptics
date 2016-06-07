//"use strict"

// imports

//import ko from "knockout"

//import * as helpers from "./helpers"

// main
(function(){
    var processGuard = function(done) {
        if(!!vm.user()) {
            return done()
        }

        return pager.navigate("login")
    }

    var vm = {
        user: ko.observable(),
        current_page: ko.observable(),
        is_ready: ko.observable(false),

        current_well: new Well({ id: 1 }),

        loggedInGuard: function(page, route, done) {
            var is_ready = vm.is_ready()

            if(is_ready) {
                return processGuard(done)
            }

            var sub = vm.is_ready.subscribe(function(val) {
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
