"use strict"

const browserify = require("browserify")
const babelify = require("babelify")
const fs = require("fs-extra")
const chokidar = require("chokidar")

let b = browserify({
    entries: ["./static/src/js/index.js"],
    debug: true,
    cache: {},
    packageCache: {}
})

b.transform(babelify, { presets: ["es2015"] })

let bundle = () => {
    console.time("build_js")

    let write_stream = fs.createWriteStream("./static/build/js/index.js")
        .on("finish", () => {
            console.timeEnd("build_js")
        })

    b.bundle()
	.pipe(write_stream)
}

let copyStatic = () => {
    console.time("copy_static")
    fs.copySync("./static/src/index.html", "./static/build/index.html")
    fs.copySync("./static/src/css", "./static/build/css")
    fs.copySync("./static/src/fonts", "./static/build/fonts")
    fs.copySync("./static/src/pages", "./static/build/pages")
    console.timeEnd("copy_static")
}

bundle()
copyStatic()

chokidar
    .watch("static/src/js", {
        ignoreInitial: true
    })
    .on("all", (evt, path) => {
        console.log("bundle", evt, path)
        bundle()
    })

chokidar
    .watch("static/src", {
        ignored: "static/src/js",
        ignoreInitial: true
    })
    .on("all", (evt, path) => {
        console.log("copyStatic", evt, path)
        copyStatic()
    })
