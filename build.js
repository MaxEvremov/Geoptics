"use strict"

// imports

const browserify = require("browserify")
const babelify = require("babelify")
const fs = require("fs-extra")
const chokidar = require("chokidar")

// build app

let b_app = browserify({
    entries: ["./app/src/js/index.js"],
    debug: true,
    cache: {},
    packageCache: {}
})

b_app.transform(babelify, { presets: ["es2015"] })

let bundle_app = () => {
    console.time("build_js_app")

    let write_stream = fs.createWriteStream("./app/build/js/index.js")
        .on("finish", () => {
            console.timeEnd("build_js_app")
        })

    b_app.bundle()
	.pipe(write_stream)
}

let copyStatic_app = () => {
    console.time("copy_static_app")
    fs.copySync("./app/src/index.html", "./app/build/index.html")
    fs.copySync("./app/src/css", "./app/build/css")
    fs.copySync("./app/src/fonts", "./app/build/fonts")
    fs.copySync("./app/src/pages", "./app/build/pages")
    console.timeEnd("copy_static_app")
}

bundle_app()
copyStatic_app()

// build admin

let b_admin = browserify({
    entries: ["./admin/src/js/index.js"],
    debug: true,
    cache: {},
    packageCache: {}
})

b_admin.transform(babelify, { presets: ["es2015"] })

let bundle_admin = () => {
    console.time("build_js_admin")

    let write_stream = fs.createWriteStream("./admin/build/js/index.js")
        .on("finish", () => {
            console.timeEnd("build_js_admin")
        })

    b_admin.bundle()
	.pipe(write_stream)
}

let copyStatic_admin = () => {
    console.time("copy_static_admin")
    fs.copySync("./admin/src/index.html", "./admin/build/index.html")
    fs.copySync("./admin/src/css", "./admin/build/css")
    fs.copySync("./admin/src/fonts", "./admin/build/fonts")
    fs.copySync("./admin/src/pages", "./admin/build/pages")
    console.timeEnd("copy_static_admin")
}

bundle_admin()
copyStatic_admin()

// watch for app changes

chokidar
    .watch("app/src/js", {
        ignoreInitial: true
    })
    .on("all", (evt, path) => {
        console.log("bundle_app", evt, path)
        bundle_app()
    })

chokidar
    .watch("app/src", {
        ignored: "app/src/js",
        ignoreInitial: true
    })
    .on("all", (evt, path) => {
        console.log("copy_static_app", evt, path)
        copyStatic_app()
    })

// watch for admin changes

chokidar
    .watch("admin/src/js", {
        ignoreInitial: true
    })
    .on("all", (evt, path) => {
        console.log("bundle_admin", evt, path)
        bundle_admin()
    })

chokidar
    .watch("admin/src", {
        ignored: "admin/src/js",
        ignoreInitial: true
    })
    .on("all", (evt, path) => {
        console.log("copy_static_admin", evt, path)
        copyStatic_admin()
    })
