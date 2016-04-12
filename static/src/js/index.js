"use strict"

import Dygraph from "dygraphs"
import $ from "jquery"

$(document).ready(() => {
    let main = document.getElementById("main")

    console.time("request")

    $.ajax({
        url: "http://localhost:7777/api/measurements",
        type: "post",
        data: JSON.stringify({
            date_start: "2016-02-24 20:58:00",
            date_end: "2016-02-25 20:44:00",
            // avg: true
        }),
        dataType: "JSON",
        contentType: "application/json",
        success: (answer, code) => {
            console.timeEnd("request")

            let err = answer.err
            let result = answer.result

            let data = result.data
            let colors = result.colors

            console.time("draw")
            let graph = new Dygraph(
                main,
                data,
                {
                    width: 960,
                    height: 640,
                    title: "Temperature",
                    ylabel: "Temperature (C)",
                    colors: colors
                }
            )
            console.timeEnd("draw")
        },
        error: () => {
            console.error("error")
        }
    })
})
