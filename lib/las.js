"use strict"

// imports

const spawn = require("child_process").spawn

// main

let createLAS = (params) => {
    let lasio = spawn(
        __base + "python_scripts/bin/python",
        [__base + "python_scripts/las.py"]
    )

    lasio.stderr.on("data", v => console.log(v.toString("utf8")))

    lasio.stdin.write(JSON.stringify(params))
    lasio.stdin.end()

    return lasio.stdout
}

// exports

module.exports = createLAS
