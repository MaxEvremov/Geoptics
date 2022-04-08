"use strict"

// imports

const spawn = require("child_process").spawn

// main

let createLAS = (params, done) => {
    let lasio = spawn(
        __base + "python_scripts/venv/bin/python",
        [__base + "python_scripts/las.py"]
    )

    let result = ""

    lasio.stderr.on("data", v => console.log(v.toString("utf8")))

    lasio.stdout.on("data", v => result += v.toString("utf8"))
    lasio.stdout.on("close", () => { done(null, result) })

    lasio.stdin.write(JSON.stringify(params))
    lasio.stdin.end()
}

// exports

module.exports = createLAS
