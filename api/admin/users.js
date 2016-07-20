"use strict"

// imports

const express = require("express")
const validator = require("validator")

const helpers = require(__base + "lib/helpers")
const CRUD = require(__base + "api/admin/CRUD")

const User = require(__base + "models/User")

// main

let api = CRUD(
    User,
    ["id", "name", "email", "role"],
    {
        name: true,
        email: validator.isEmail,
        password: true,
        role: true
    }
)

// exports

module.exports = api
