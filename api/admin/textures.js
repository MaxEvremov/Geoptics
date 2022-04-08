"use strict"

// imports

const express = require("express")
const validator = require("validator")
const multer = require("multer")
const crypto = require("crypto")
const path = require("path")

const helpers = require(__base + "lib/helpers")
const CRUD = require(__base + "api/admin/CRUD")

const Texture = require(__base + "models/Texture")

// main

let api = express()

let storage = multer.diskStorage({
    destination: __base + "data",
    filename: (req, file, done) => {
        let random_string = crypto.randomBytes(32).toString("hex")
        let ext = path.extname(file.originalname)

        let filename = `${random_string}${ext}`

        return done(null, filename)
    }
})
let upload = multer({ storage: storage })

api.post(
    "/upload_pic",
    upload.single("file"),
    (req, res, next) => {
        return res.jsonCallback(null, { name: req.file.filename })
    }
)

api.use(CRUD(
    Texture,
    ["id", "name", "img"],
    {
        name: true,
        img: true
    }
))

// exports

module.exports = api
