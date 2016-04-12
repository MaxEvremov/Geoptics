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

    fs.copy("./static/src/index.html", "./static/build/index.html", () => {})
}

b.on("update", bundle)
bundle()

b.on("log", console.log)
b.on("error", console.error)
