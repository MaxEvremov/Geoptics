"use strict"

// imports

const spawn = require("child_process").spawn

// main

let createLAS = (params) => {
    let lasio = spawn(
        __base + "python_scripts/bin/python",
        [__base + "python_scripts/las.py"]
    )

    lasio.stdin.write(JSON.stringify(params))
    lasio.stdin.end()

    lasio.stderr.on("data", v => console.log(v.toString("utf8")))

    return lasio.stdout
}

// exports

module.exports = createLAS
