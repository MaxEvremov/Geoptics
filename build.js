"use strict"

const browserify = require("browserify")
const babelify = require("babelify")
const watchify = require("watchify")
const fs = require("fs-extra")

let b = browserify({
    entries: ["./static/src/js/index.js"],
    debug: true,
    cache: {},
    packageCache: {},
    plugin: [watchify]
})

b.transform(babelify, { presets: ["es2015"] })

let bundle = () => {
    b.bundle()
	.pipe(fs.createWriteStream("./static/build/js/index.js"))

    fs.copySync("./static/src/index.html", "./static/build/index.html")
    fs.copySync("./static/src/css", "./static/build/css")
    fs.copySync("./static/src/fonts", "./static/build/fonts")
}

b.on("update", bundle)
b.on("log", console.log)
b.on("error", console.log)

bundle()
